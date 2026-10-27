import type { PlannerData, Settings, TimeBlock } from '../types'

const KEY = 'summer-planner-static-v1'
const emptyProfiles = (): Settings['modeFloorProfiles'] => ({ normal: {}, busy: {}, crunch: {}, deload: {} })
const defaultSettings = (): Settings => ({
  language: 'zh', theme: 'system', weekStartsOn: 1, defaultDayStart: '07:00', defaultDayEnd: '23:00',
  countLifeBlocks: false, defaultView: 'day', baseWeeklyCapacityMinutes: 0,
  modeFloorProfiles: emptyProfiles(),
  reminders: { planningEnabled: false, planningWeekday: 0, planningHour: 18, midweekEnabled: false, midweekWeekday: 3, midweekHour: 18 },
})

export function createDefaultData(): PlannerData {
  return { schemaVersion: 6, settings: defaultSettings(), categories: [], blockTemplates: [], timeBlocks: [],
    dailyMemos: {}, summerPhases: [], tracks: [], weeklyPlans: {}, calendarImports: [] }
}

type LegacyData = Partial<Omit<PlannerData, 'schemaVersion' | 'settings'>> & {
  schemaVersion?: number
  settings?: Partial<Settings>
  blockTemplates?: Array<PlannerData['blockTemplates'][number] & { isBuffer?: boolean }>
  timeBlocks?: Array<TimeBlock & { isBuffer?: boolean }>
}

export function isPlannerData(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const data = value as LegacyData
  return ([1, 2, 3, 4, 5, 6].includes(data.schemaVersion ?? 0)) && !!data.settings && Array.isArray(data.categories) &&
    Array.isArray(data.blockTemplates) && Array.isArray(data.timeBlocks) && Array.isArray(data.summerPhases) &&
    data.timeBlocks.every(block => typeof block.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(block.date))
}

const legacyCategoryNames: Record<string, string> = { study: '学习', health: '健康', creative: '创作', life: '生活', social: '社交', rest: '休息' }
const legacyCategoryColors: Record<string, string> = { study: '#5b7cfa', health: '#39a876', creative: '#a36be0', life: '#ee9b4c', social: '#e86e8e', rest: '#49a9bd' }
const legacyCategoryIds = new Set(Object.keys(legacyCategoryNames))
const legacyTrackFloors: Record<string, number> = { courses: 480, ielts: 300, urop: 300, cuda: 180, stocklens: 120, social: 0, health: 0, rest: 0 }
const legacyTrackColors: Record<string, string> = { courses: '#5876de', ielts: '#745fd1', urop: '#159679', cuda: '#d47838', stocklens: '#b05f98', social: '#e26f8d', health: '#36a174', rest: '#4c9daf' }
const legacyTrackNames: Record<string, string> = { courses: 'Courses', ielts: 'IELTS', urop: 'UROP', cuda: 'CUDA', stocklens: 'StockLens', social: '社交 / Networking', health: '健康 / 健身', rest: '休息 / 娱乐' }
const legacyTrackIds = new Set(Object.keys(legacyTrackFloors))
const legacyDemoBlockIds = new Set(['demo-1', 'demo-2', 'demo-3', 'demo-4', 'demo-5', 'demo-6', 'demo-7', 'demo-8', 'demo-9'])
const blockMinutes = (block: { startTime: string; endTime: string }) => {
  const [startHour, startMinute] = block.startTime.split(':').map(Number)
  const [endHour, endMinute] = block.endTime.split(':').map(Number)
  return Math.max(0, endHour * 60 + endMinute - startHour * 60 - startMinute)
}
const isLegacyBuffer = (item: { title: string; titleEn?: string; isBuffer?: boolean }) =>
  item.isBuffer === true || item.title === '缓冲时间' || item.titleEn === 'Buffer Time' || item.titleEn === 'Buffer time'

export function migratePlannerData(value: unknown): PlannerData {
  if (!isPlannerData(value)) throw new Error('Invalid DailyModule backup')
  const parsed = value as LegacyData
  const fresh = defaultSettings()
  const isLegacy = (parsed.schemaVersion ?? 1) < 6
  const profiles = emptyProfiles()
  const settings: Settings = {
    ...fresh, ...parsed.settings,
    baseWeeklyCapacityMinutes: isLegacy && parsed.settings?.baseWeeklyCapacityMinutes === 2100 ? 0 : parsed.settings?.baseWeeklyCapacityMinutes ?? 0,
    modeFloorProfiles: profiles,
    reminders: { ...fresh.reminders, ...(parsed.settings?.reminders ?? {}), midweekEnabled: isLegacy && (parsed.schemaVersion ?? 1) < 3 ? false : parsed.settings?.reminders?.midweekEnabled ?? false },
  }
  const blockTemplates = (parsed.blockTemplates ?? []).filter(template => !isLegacyBuffer(template) && !template.isBuiltIn && !template.id.startsWith('ics-template-')).map(template => {
    const { isBuffer: _buffer, ...clean } = template as typeof template & { isBuffer?: boolean }
    return { ...clean, countsTowardWeeklyCapacity: clean.countsTowardWeeklyCapacity ?? !!clean.trackId }
  })
  const timeBlocks = (parsed.timeBlocks ?? []).filter(block => !isLegacyBuffer(block) && !legacyDemoBlockIds.has(block.id)).map(block => {
    const { isBuffer: _buffer, ...clean } = block as typeof block & { isBuffer?: boolean }
    return { ...clean, completedMinutes: clean.completedMinutes ?? (clean.status === 'completed' ? blockMinutes(clean) : 0),
      countsTowardWeeklyCapacity: clean.countsTowardWeeklyCapacity ?? (!!clean.trackId && clean.source !== 'ics') }
  })
  const weeklyPlans = Object.fromEntries(Object.entries(parsed.weeklyPlans ?? {}).map(([key, plan]) => [key, {
    ...plan, mode: plan.mode ?? 'normal', floorOverrides: plan.floorOverrides ?? {}, flexAllocations: plan.flexAllocations ?? {},
    topOutcomes: (plan.topOutcomes ?? []).slice(0, 3), commitments: plan.commitments ?? [],
  }]))
  const referencedTrackIds = new Set([
    ...blockTemplates.map(item => item.trackId), ...timeBlocks.map(item => item.trackId),
    ...Object.values(weeklyPlans).flatMap(plan => [plan.primaryFocusTrackId, ...Object.keys(plan.floorOverrides), ...Object.keys(plan.flexAllocations)]),
  ].filter((id): id is string => !!id))
  const tracks = (parsed.tracks ?? []).filter(track => !isLegacy || !legacyTrackIds.has(track.id) || referencedTrackIds.has(track.id) || track.weeklyFloorMinutes !== legacyTrackFloors[track.id] || track.weeklyTargetMinutes !== legacyTrackFloors[track.id] || track.name !== legacyTrackNames[track.id] || track.color !== legacyTrackColors[track.id] || track.countsTowardWeeklyCapacity !== (legacyTrackFloors[track.id] > 0))
  for (const id of referencedTrackIds) {
    if (!tracks.some(track => track.id === id)) tracks.push({ id, name: id, nameEn: id, color: '#64748b', kind: 'goal',
      weeklyFloorMinutes: 0, weeklyTargetMinutes: 0, important: false, urgent: false, countsTowardWeeklyCapacity: true })
  }
  for (const mode of Object.keys(profiles) as Array<keyof typeof profiles>) {
    profiles[mode] = Object.fromEntries(Object.entries(parsed.settings?.modeFloorProfiles?.[mode] ?? {}).filter(([id]) => tracks.some(track => track.id === id)))
  }
  const referencedCategoryIds = new Set([...blockTemplates, ...timeBlocks].map(item => item.categoryId))
  const categories = (parsed.categories ?? []).filter(category => !isLegacy || !legacyCategoryIds.has(category.id) || referencedCategoryIds.has(category.id) || category.name !== legacyCategoryNames[category.id] || category.color !== legacyCategoryColors[category.id])
  return { schemaVersion: 6, settings, categories, blockTemplates, timeBlocks, dailyMemos: parsed.dailyMemos ?? {},
    summerPhases: parsed.summerPhases ?? [], tracks, weeklyPlans, calendarImports: parsed.calendarImports ?? [] }
}

export const applyFall2026CourseSchedule = (data: PlannerData) => data

export function loadData(): PlannerData {
  try {
    const stored = localStorage.getItem(KEY)
    return stored ? migratePlannerData(JSON.parse(stored)) : createDefaultData()
  } catch { return createDefaultData() }
}
export function saveData(data: PlannerData) { localStorage.setItem(KEY, JSON.stringify(data)) }
export function resetData() { localStorage.removeItem(KEY) }
