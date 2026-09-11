import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import type { TimeBlock, Track, WeeklyMode, WeeklyPlan } from '../types'

export const weekKey = (date: string | Date) => format(startOfWeek(typeof date === 'string' ? parseISO(date) : date, { weekStartsOn: 1 }), 'yyyy-MM-dd')

export const createWeeklyPlan = (weekStart: string, mode: WeeklyMode = 'normal', multiplier = 1): WeeklyPlan => ({
  weekStart,
  mode,
  floorMultiplier: multiplier,
  flexBudgetMinutes: 0,
  flexAllocations: {},
  topOutcomes: ['', '', ''],
  courseDeadlines: '',
  ieltsFocus: '',
  uropOutput: '',
})

export const plannedMinutes = (block: TimeBlock) => {
  const [startHour, startMinute] = block.startTime.split(':').map(Number)
  const [endHour, endMinute] = block.endTime.split(':').map(Number)
  return Math.max(0, endHour * 60 + endMinute - startHour * 60 - startMinute)
}

export const completedMinutes = (block: TimeBlock) => {
  const planned = plannedMinutes(block)
  if (block.status === 'completed') return planned
  if (block.status === 'partial') return Math.max(0, Math.min(planned, block.completedMinutes ?? 0))
  return 0
}

export const weekBlocks = (blocks: TimeBlock[], start: string) => {
  const end = format(addDays(parseISO(start), 6), 'yyyy-MM-dd')
  return blocks.filter(block => block.date >= start && block.date <= end)
}

export const effectiveFloor = (track: Track, plan: WeeklyPlan) =>
  track.kind === 'infrastructure' ? track.weeklyFloorMinutes : Math.round(track.weeklyFloorMinutes * plan.floorMultiplier)

export const trackProgress = (track: Track, plan: WeeklyPlan, blocks: TimeBlock[]) => {
  const relevant = blocks.filter(block => block.trackId === track.id)
  const completed = relevant.reduce((sum, block) => sum + completedMinutes(block), 0)
  const planned = relevant.reduce((sum, block) => sum + plannedMinutes(block), 0)
  const floor = effectiveFloor(track, plan)
  return {
    planned,
    completed,
    floor,
    target: track.weeklyTargetMinutes,
    floorReached: floor > 0 && completed >= floor,
    targetReached: track.weeklyTargetMinutes > 0 && completed >= track.weeklyTargetMinutes,
  }
}

export const flexSummary = (plan: WeeklyPlan) => {
  const allocated = Object.values(plan.flexAllocations).reduce((sum, minutes) => sum + Math.max(0, minutes || 0), 0)
  return { allocated, remaining: plan.flexBudgetMinutes - allocated }
}

export type ReminderKind = 'planning' | 'midweek'

export const dueReminder = (now: Date, plan: WeeklyPlan, settings: {
  planningEnabled: boolean
  planningWeekday: number
  planningHour: number
  midweekEnabled: boolean
  midweekWeekday: number
  midweekHour: number
}): ReminderKind | undefined => {
  const today = format(now, 'yyyy-MM-dd')
  const threshold = (weekday: number, hour: number, planning: boolean) => {
    const offset = planning && weekday === 0 ? -1 : weekday === 0 ? 6 : weekday - 1
    const date = addDays(parseISO(plan.weekStart), offset)
    date.setHours(hour, 0, 0, 0)
    return date
  }
  if (settings.planningEnabled && !plan.reviewCompletedAt && plan.planningDismissedDate !== today &&
    now >= threshold(settings.planningWeekday, settings.planningHour, true)) return 'planning'
  if (settings.midweekEnabled && !plan.midweekCheckedAt && plan.midweekDismissedDate !== today &&
    now >= threshold(settings.midweekWeekday, settings.midweekHour, false)) return 'midweek'
  return undefined
}
