import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import type { Settings, TimeBlock, Track, WeeklyMode, WeeklyPlan } from '../types'

export const WORK_TRACK_IDS = ['courses', 'ielts', 'urop', 'cuda', 'stocklens'] as const
const workTrackSet = new Set<string>(WORK_TRACK_IDS)

export const weekKey = (date: string | Date) => format(startOfWeek(typeof date === 'string' ? parseISO(date) : date, { weekStartsOn: 1 }), 'yyyy-MM-dd')

export const createWeeklyPlan = (weekStart: string): WeeklyPlan => ({
  weekStart,
  mode: 'normal',
  floorMultiplier: 1,
  flexBudgetMinutes: 0,
  floorOverrides: {},
  flexAllocations: {},
  topOutcomes: ['', '', ''],
  commitments: [],
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
  if (block.status === 'completed') return Math.max(0, block.completedMinutes ?? planned)
  if (block.status === 'partial') return Math.max(0, Math.min(planned, block.completedMinutes ?? 0))
  return 0
}

export const weekBlocks = (blocks: TimeBlock[], start: string) => {
  const end = format(addDays(parseISO(start), 6), 'yyyy-MM-dd')
  return blocks.filter(block => block.date >= start && block.date <= end)
}

export const isTrackedWorkBlock = (block: TimeBlock) =>
  !!block.trackId && workTrackSet.has(block.trackId) && block.countsTowardWeeklyCapacity !== false && !(block.isFixed && block.trackId === 'courses') && block.source !== 'ics'

export const baseFloor = (track: Track) => workTrackSet.has(track.id) ? Math.max(0, track.weeklyFloorMinutes) : 0

export const modeFloor = (track: Track, mode: WeeklyMode, profiles: Settings['modeFloorProfiles']) =>
  Math.round(baseFloor(track) * Math.max(0, profiles[mode]?.[track.id] ?? 1))

export const weeklyFloorOverride = (track: Track, plan: WeeklyPlan, profiles: Settings['modeFloorProfiles']) =>
  Math.max(0, plan.floorOverrides[track.id] ?? modeFloor(track, plan.mode, profiles))

export const effectiveFloor = (track: Track, plan: WeeklyPlan, settings: Pick<Settings, 'modeFloorProfiles'>) =>
  weeklyFloorOverride(track, plan, settings.modeFloorProfiles)

export const weeklyCapacity = (plan: WeeklyPlan, baseCapacityMinutes: number) => Math.max(0, plan.capacityOverrideMinutes ?? baseCapacityMinutes)

export const protectedTotal = (tracks: Track[], plan: WeeklyPlan, settings: Pick<Settings, 'modeFloorProfiles'>) =>
  tracks.filter(track => workTrackSet.has(track.id)).reduce((sum, track) => sum + effectiveFloor(track, plan, settings), 0)

export const baseFlex = (capacity: number, protectedMinutes: number) => Math.max(0, capacity - protectedMinutes)
export const overcommitAmount = (planned: number, capacity: number) => Math.max(0, planned - capacity)
export const allocatedFlex = (plan: WeeklyPlan) => Object.entries(plan.flexAllocations).filter(([id]) => workTrackSet.has(id)).reduce((sum, [, minutes]) => sum + Math.max(0, minutes || 0), 0)
export const unallocatedFlex = (availableFlex: number, allocated: number) => Math.max(0, availableFlex - allocated)
export const weeklyBudget = (track: Track, plan: WeeklyPlan, settings: Pick<Settings, 'modeFloorProfiles'>) => effectiveFloor(track, plan, settings) + Math.max(0, plan.flexAllocations[track.id] ?? 0)

export const scheduledTrackedMinutes = (blocks: TimeBlock[], trackId?: string) => blocks.filter(block => isTrackedWorkBlock(block) && (!trackId || block.trackId === trackId)).reduce((sum, block) => sum + plannedMinutes(block), 0)
export const completedTrackedMinutes = (blocks: TimeBlock[], trackId?: string) => blocks.filter(block => isTrackedWorkBlock(block) && (!trackId || block.trackId === trackId)).reduce((sum, block) => sum + completedMinutes(block), 0)
export const plannedTrackedTotal = (blocks: TimeBlock[]) => scheduledTrackedMinutes(blocks)

export const trackProgress = (track: Track, plan: WeeklyPlan, blocks: TimeBlock[], settings: Pick<Settings, 'modeFloorProfiles'>) => {
  const completed = completedTrackedMinutes(blocks, track.id)
  const scheduled = scheduledTrackedMinutes(blocks, track.id)
  const floor = effectiveFloor(track, plan, settings)
  const flex = Math.max(0, plan.flexAllocations[track.id] ?? 0)
  const budget = floor + flex
  const status = completed >= budget ? 'done' : scheduled >= budget ? 'covered' : 'unscheduled'
  return { completed, scheduled, floor, flex, budget, need: Math.max(0, budget - scheduled), status }
}

export const canAllocateFlex = (plan: WeeklyPlan, availableFlex: number, trackId: string, nextMinutes: number) => {
  const next = { ...plan, flexAllocations: { ...plan.flexAllocations, [trackId]: Math.max(0, nextMinutes) } }
  return allocatedFlex(next) <= availableFlex
}

export type ReminderKind = 'planning' | 'midweek'

export const dueReminder = (now: Date, plan: WeeklyPlan, settings: Settings['reminders']): ReminderKind | undefined => {
  const today = format(now, 'yyyy-MM-dd')
  const threshold = (weekday: number, hour: number, planning: boolean) => {
    const offset = planning && weekday === 0 ? -1 : weekday === 0 ? 6 : weekday - 1
    const date = addDays(parseISO(plan.weekStart), offset)
    date.setHours(hour, 0, 0, 0)
    return date
  }
  if (settings.planningEnabled && !plan.reviewCompletedAt && plan.planningDismissedDate !== today && now >= threshold(settings.planningWeekday, settings.planningHour, true)) return 'planning'
  if (settings.midweekEnabled && !plan.midweekCheckedAt && plan.midweekDismissedDate !== today && now >= threshold(settings.midweekWeekday, settings.midweekHour, false)) return 'midweek'
  return undefined
}
