import type { BlockTemplate, TimeBlock } from '../types'

type IcsProperty = { name: string; params: Record<string, string>; value: string }
type ParsedDateTime = { date: string; time: string; timestamp: number }

export type IcsImportResult = {
  templates: BlockTemplate[]
  blocks: TimeBlock[]
  eventCount: number
  warnings: string[]
}

const weekdays: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }
const pad = (value: number) => String(value).padStart(2, '0')
const dateString = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`

const hash = (value: string) => {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

const textValue = (value = '') => value
  .replace(/\\n/gi, '\n')
  .replace(/\\,/g, ',')
  .replace(/\\;/g, ';')
  .replace(/\\\\/g, '\\')

const parseProperty = (line: string): IcsProperty | undefined => {
  const colon = line.indexOf(':')
  if (colon < 0) return undefined
  const [head, ...parameterParts] = line.slice(0, colon).split(';')
  const params: Record<string, string> = {}
  parameterParts.forEach(part => {
    const equal = part.indexOf('=')
    if (equal > 0) params[part.slice(0, equal).toUpperCase()] = part.slice(equal + 1)
  })
  return { name: head.toUpperCase(), params, value: line.slice(colon + 1) }
}

const zonedParts = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))

const parseDateTime = (value: string): ParsedDateTime | undefined => {
  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/)
  if (!match) return undefined
  const [, year, month, day, hour = '00', minute = '00', second = '00', utc] = match
  if (utc) {
    const instant = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)))
    const parts = zonedParts(instant)
    const date = `${parts.year}-${parts.month}-${parts.day}`
    const time = `${parts.hour}:${parts.minute}`
    return { date, time, timestamp: Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute)) }
  }
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    timestamp: Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)),
  }
}

const minutesBetween = (start: ParsedDateTime, end: ParsedDateTime) => Math.max(0, Math.round((end.timestamp - start.timestamp) / 60000))
const addUtcDays = (date: Date, days: number) => new Date(date.getTime() + days * 86400000)

export function parseIcsCalendar(source: string): IcsImportResult {
  const unfolded = source.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const events: IcsProperty[][] = []
  let current: IcsProperty[] | undefined
  unfolded.forEach(line => {
    if (line === 'BEGIN:VEVENT') current = []
    else if (line === 'END:VEVENT' && current) { events.push(current); current = undefined }
    else if (current) { const property = parseProperty(line); if (property) current.push(property) }
  })

  const templates = new Map<string, BlockTemplate>()
  const occurrences = new Map<string, TimeBlock>()
  const warnings: string[] = []
  const now = new Date().toISOString()

  events.forEach((properties, eventIndex) => {
    const all = (name: string) => properties.filter(property => property.name === name)
    const first = (name: string) => all(name)[0]
    const uid = textValue(first('UID')?.value || `event-${eventIndex + 1}`)
    const summary = textValue(first('SUMMARY')?.value || 'Imported event')
    const start = parseDateTime(first('DTSTART')?.value || '')
    const end = parseDateTime(first('DTEND')?.value || '')
    if (!start || !end) { warnings.push(`${summary}: missing or unsupported DTSTART/DTEND`); return }
    const blockDuration = minutesBetween(start, end)
    if (blockDuration <= 0 || blockDuration > 24 * 60) { warnings.push(`${summary}: unsupported duration`); return }

    const location = textValue(first('LOCATION')?.value)
    const description = textValue(first('DESCRIPTION')?.value)
    const note = [description, location ? `Location: ${location}` : ''].filter(Boolean).join('\n')
    const templateId = `ics-template-${hash(`${summary}|${blockDuration}`)}`
    if (!templates.has(templateId)) templates.set(templateId, {
      id: templateId, title: summary, titleEn: summary, durationMinutes: blockDuration, categoryId: 'study', color: '#5876de', icon: '',
      priority: 'medium', isFixed: true, canMove: false, canSplit: false, canBeOverridden: false, isBuiltIn: false, isHidden: false, trackId: 'courses',
    })

    const excluded = new Set(all('EXDATE').flatMap(property => property.value.split(',')).map(value => parseDateTime(value)?.date).filter((value): value is string => !!value))
    const rule = first('RRULE')?.value.split(';').reduce<Record<string, string>>((result, item) => {
      const [key, value] = item.split('='); if (key && value) result[key.toUpperCase()] = value; return result
    }, {})
    const dates: string[] = []
    if (rule?.FREQ === 'WEEKLY') {
      const until = parseDateTime(rule.UNTIL || '')?.date || dateString(addUtcDays(new Date(start.timestamp), 366))
      const interval = Math.max(1, Number(rule.INTERVAL) || 1)
      const byDays = (rule.BYDAY?.split(',').map(day => weekdays[day.slice(-2)]).filter(day => day !== undefined) ?? [new Date(start.timestamp).getUTCDay()])
      let cursor = new Date(Date.UTC(Number(start.date.slice(0, 4)), Number(start.date.slice(5, 7)) - 1, Number(start.date.slice(8, 10))))
      while (dateString(cursor) <= until) {
        const weeks = Math.floor((cursor.getTime() - Date.UTC(Number(start.date.slice(0, 4)), Number(start.date.slice(5, 7)) - 1, Number(start.date.slice(8, 10)))) / (7 * 86400000))
        const date = dateString(cursor)
        if (weeks % interval === 0 && byDays.includes(cursor.getUTCDay()) && date >= start.date && !excluded.has(date)) dates.push(date)
        cursor = addUtcDays(cursor, 1)
      }
    } else {
      if (rule?.FREQ) warnings.push(`${summary}: unsupported RRULE ${rule.FREQ}; imported first occurrence only`)
      if (!excluded.has(start.date)) dates.push(start.date)
    }

    dates.forEach(date => {
      const endMinutes = Number(start.time.slice(0, 2)) * 60 + Number(start.time.slice(3)) + blockDuration
      if (endMinutes > 24 * 60) return
      const recurrenceId = `${date}T${start.time}`
      const signature = `${date}|${start.time}|${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}|${summary}`
      const block: TimeBlock = {
        id: `ics-${hash(uid)}-${date}-${start.time.replace(':', '')}`,
        title: summary, titleEn: summary, date, startTime: start.time, endTime: `${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}`,
        categoryId: 'study', color: '#5876de', priority: 'medium', note, status: 'pending', isFixed: true,
        canMove: false, canSplit: false, canBeOverridden: false, templateId, trackId: 'courses', source: 'ics', sourceUid: uid,
        recurrenceId, createdAt: now, updatedAt: now,
      }
      const existing = occurrences.get(signature)
      if (!existing) occurrences.set(signature, block)
      else if (note && !existing.note?.includes(note)) existing.note = [existing.note, note].filter(Boolean).join('\n')
    })
  })

  return { templates: [...templates.values()], blocks: [...occurrences.values()], eventCount: events.length, warnings }
}
