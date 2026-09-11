import type { BlockTemplate, Category, PlannerData, Settings, TimeBlock, Track } from '../types'

const KEY = 'summer-planner-static-v1'
const categories: Category[] = [
  { id: 'study', name: '学习', nameEn: 'Study', color: '#5b7cfa', countsTowardCompletion: true },
  { id: 'health', name: '健康', nameEn: 'Health', color: '#39a876', countsTowardCompletion: true },
  { id: 'creative', name: '创作', nameEn: 'Creative', color: '#a36be0', countsTowardCompletion: true },
  { id: 'life', name: '生活', nameEn: 'Life', color: '#ee9b4c', countsTowardCompletion: false },
  { id: 'social', name: '社交', nameEn: 'Social', color: '#e86e8e', countsTowardCompletion: false },
  { id: 'rest', name: '休息', nameEn: 'Rest', color: '#49a9bd', countsTowardCompletion: false },
]

export const defaultTracks: Track[] = [
  { id: 'courses', name: 'Courses / GPA', nameEn: 'Courses / GPA', color: '#5876de', kind: 'goal', weeklyFloorMinutes: 900, weeklyTargetMinutes: 900, important: true, urgent: true, countsTowardWeeklyCapacity: true },
  { id: 'ielts', name: 'IELTS', nameEn: 'IELTS', color: '#745fd1', kind: 'goal', weeklyFloorMinutes: 300, weeklyTargetMinutes: 300, important: true, urgent: false, countsTowardWeeklyCapacity: true },
  { id: 'urop', name: 'UROP', nameEn: 'UROP', color: '#159679', kind: 'goal', weeklyFloorMinutes: 300, weeklyTargetMinutes: 300, important: true, urgent: false, countsTowardWeeklyCapacity: true },
  { id: 'cuda', name: 'CUDA', nameEn: 'CUDA', color: '#d47838', kind: 'goal', weeklyFloorMinutes: 180, weeklyTargetMinutes: 180, important: true, urgent: false, countsTowardWeeklyCapacity: true },
  { id: 'stocklens', name: 'StockLens', nameEn: 'StockLens', color: '#b05f98', kind: 'goal', weeklyFloorMinutes: 120, weeklyTargetMinutes: 120, important: true, urgent: false, countsTowardWeeklyCapacity: true },
  { id: 'social', name: '社交 / Networking', nameEn: 'Social / Networking', color: '#e26f8d', kind: 'goal', weeklyFloorMinutes: 0, weeklyTargetMinutes: 0, important: false, urgent: false, countsTowardWeeklyCapacity: false },
  { id: 'health', name: '健康 / 健身', nameEn: 'Health / Gym', color: '#36a174', kind: 'infrastructure', weeklyFloorMinutes: 0, weeklyTargetMinutes: 0, important: true, urgent: false, countsTowardWeeklyCapacity: false },
  { id: 'rest', name: '休息 / 娱乐', nameEn: 'Rest / Leisure', color: '#4c9daf', kind: 'leisure', weeklyFloorMinutes: 0, weeklyTargetMinutes: 0, important: false, urgent: false, countsTowardWeeklyCapacity: false },
]

const defaultModeFloorProfiles: Settings['modeFloorProfiles'] = {
  normal: { courses: 1, ielts: 1, urop: 1, cuda: 1, stocklens: 1 },
  busy: { courses: 1, ielts: 0.8, urop: 0.8, cuda: 0.5, stocklens: 0.5 },
  crunch: { courses: 1, ielts: 0.4, urop: 0.4, cuda: 0, stocklens: 0 },
  deload: { courses: 0.3, ielts: 0.5, urop: 0.3, cuda: 0, stocklens: 0 },
}

const defaultSettings: Settings = {
  language: 'zh', theme: 'system', weekStartsOn: 1, defaultDayStart: '07:00', defaultDayEnd: '23:00', countLifeBlocks: false, defaultView: 'day',
  baseWeeklyCapacityMinutes: 2100,
  modeFloorProfiles: defaultModeFloorProfiles,
  reminders: { planningEnabled: true, planningWeekday: 0, planningHour: 18, midweekEnabled: false, midweekWeekday: 3, midweekHour: 18 },
}

const defaultTemplateDefinitions: Array<[string, string, string, number, string, string, string]> = [
  ['Courses', 'Courses', '▤', 60, 'study', '#5876de', 'courses'],
  ['IELTS', 'IELTS', 'Aa', 60, 'study', '#745fd1', 'ielts'],
  ['UROP', 'UROP', '⌁', 60, 'study', '#159679', 'urop'],
  ['CUDA', 'CUDA', '✦', 60, 'study', '#d47838', 'cuda'],
  ['StockLens', 'StockLens', '◫', 60, 'study', '#b05f98', 'stocklens'],
  ['健身', 'Gym', '🏃', 60, 'health', '#36a174', 'health'],
]

const blockTemplates: BlockTemplate[] = defaultTemplateDefinitions.map((template, index) => ({
  id: `tpl-${index + 1}`, title: template[0], titleEn: template[1], icon: template[2], durationMinutes: template[3],
  categoryId: template[4], color: template[5], trackId: template[6], priority: 'medium',
  isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, isBuiltIn: true, isHidden: false,
}))

const blockMinutes = (block: { startTime: string; endTime: string }) => {
  const [startHour, startMinute] = block.startTime.split(':').map(Number)
  const [endHour, endMinute] = block.endTime.split(':').map(Number)
  return Math.max(0, endHour * 60 + endMinute - startHour * 60 - startMinute)
}

export function createDefaultData(): PlannerData {
  return {
    schemaVersion: 3,
    settings: defaultSettings,
    categories,
    blockTemplates,
    timeBlocks: [],
    summerPhases: [],
    tracks: defaultTracks,
    weeklyPlans: {},
    calendarImports: [],
  }
}

type LegacyData = Partial<Omit<PlannerData, 'schemaVersion' | 'settings'>> & {
  schemaVersion?: number
  settings?: Partial<Settings>
  blockTemplates?: Array<BlockTemplate & { isBuffer?: boolean }>
  timeBlocks?: Array<TimeBlock & { isBuffer?: boolean }>
}

export function isPlannerData(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const data = value as LegacyData
  return (data.schemaVersion === 1 || data.schemaVersion === 2 || data.schemaVersion === 3) && !!data.settings && Array.isArray(data.categories) &&
    Array.isArray(data.blockTemplates) && Array.isArray(data.timeBlocks) && Array.isArray(data.summerPhases) &&
    data.timeBlocks.every(block => typeof block.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(block.date))
}

const inferTrack = (title: string, categoryId: string) => {
  const normalized = title.toLowerCase()
  if (/^(comp|math)\s|course|课程/.test(normalized)) return 'courses'
  if (normalized.includes('ielts')) return 'ielts'
  if (normalized.includes('urop')) return 'urop'
  if (normalized.includes('cuda') || normalized.includes('ai 项目')) return 'cuda'
  if (normalized.includes('stocklens') || normalized.includes('invest')) return 'stocklens'
  if (categoryId === 'health' || normalized.includes('sleep') || normalized.includes('睡觉')) return 'health'
  if (categoryId === 'social') return 'social'
  return 'rest'
}

const isLegacyBuffer = (item: { title: string; titleEn?: string; isBuffer?: boolean }) =>
  item.isBuffer === true || item.title === '缓冲时间' || item.titleEn === 'Buffer Time' || item.titleEn === 'Buffer time'

export function migratePlannerData(value: unknown): PlannerData {
  if (!isPlannerData(value)) throw new Error('Invalid DailyModule backup')
  const parsed = value as LegacyData
  const isPreV3 = (parsed.schemaVersion ?? 1) < 3
  const settings: Settings = {
    ...defaultSettings,
    ...parsed.settings,
    baseWeeklyCapacityMinutes: parsed.settings?.baseWeeklyCapacityMinutes ?? defaultSettings.baseWeeklyCapacityMinutes,
    modeFloorProfiles: (Object.keys(defaultModeFloorProfiles) as Array<keyof typeof defaultModeFloorProfiles>).reduce((profiles, mode) => ({ ...profiles, [mode]: { ...defaultModeFloorProfiles[mode], ...(parsed.settings?.modeFloorProfiles?.[mode] ?? {}) } }), {} as Settings['modeFloorProfiles']),
    reminders: { ...defaultSettings.reminders, ...(parsed.settings?.reminders ?? {}), midweekEnabled: isPreV3 ? false : parsed.settings?.reminders?.midweekEnabled ?? false },
  }
  const migratedTracks = defaultTracks.map(defaultTrack => {
    const existing = parsed.tracks?.find(track => track.id === defaultTrack.id)
    if (!existing) return defaultTrack
    return { ...defaultTrack, ...existing, weeklyFloorMinutes: isPreV3 && defaultTrack.countsTowardWeeklyCapacity ? defaultTrack.weeklyFloorMinutes : existing.weeklyFloorMinutes, countsTowardWeeklyCapacity: defaultTrack.countsTowardWeeklyCapacity }
  })
  const extraTracks = (parsed.tracks ?? []).filter(track => !defaultTracks.some(defaultTrack => defaultTrack.id === track.id)).map(track => ({ ...track, countsTowardWeeklyCapacity: false }))
  const workTrackIds = ['courses', 'ielts', 'urop', 'cuda', 'stocklens']
  const migratedPlans = Object.fromEntries(Object.entries(parsed.weeklyPlans ?? {}).map(([key, legacyPlan]) => {
    const plan = {
      ...legacyPlan,
      mode: legacyPlan.mode ?? 'normal',
      floorOverrides: legacyPlan.floorOverrides ?? {},
      commitments: legacyPlan.commitments ?? [],
      topOutcomes: (legacyPlan.topOutcomes ?? []).slice(0, 3),
    }
    const profile = settings.modeFloorProfiles[plan.mode]
    const protectedMinutes = migratedTracks
      .filter(track => workTrackIds.includes(track.id))
      .reduce((total, track) => total + Math.max(0, plan.floorOverrides[track.id]
        ?? Math.round(track.weeklyFloorMinutes * Math.max(0, profile?.[track.id] ?? 1))), 0)
    let remainingFlex = Math.max(0, (plan.capacityOverrideMinutes ?? settings.baseWeeklyCapacityMinutes) - protectedMinutes)
    const flexAllocations = workTrackIds.reduce<Record<string, number>>((allocations, trackId) => {
      const kept = Math.min(Math.max(0, plan.flexAllocations?.[trackId] ?? 0), remainingFlex)
      allocations[trackId] = kept
      remainingFlex -= kept
      return allocations
    }, {})
    return [key, { ...plan, flexAllocations }]
  }))
  return {
    schemaVersion: 3,
    settings,
    categories: parsed.categories!,
    blockTemplates: parsed.blockTemplates!.filter(template => !isLegacyBuffer(template)).map(template => {
      const { isBuffer: _legacyBuffer, ...clean } = template as BlockTemplate & { isBuffer?: boolean }
      return { ...clean, trackId: clean.trackId || inferTrack(clean.title, clean.categoryId) }
    }),
    timeBlocks: parsed.timeBlocks!.filter(block => !isLegacyBuffer(block)).map(block => {
      const { isBuffer: _legacyBuffer, ...clean } = block as TimeBlock & { isBuffer?: boolean }
      const trackId = clean.trackId || inferTrack(clean.title, clean.categoryId)
      const fixedCourse = trackId === 'courses' && (clean.source === 'ics' || clean.isFixed)
      return { ...clean, trackId, completedMinutes: clean.completedMinutes ?? (clean.status === 'completed' ? blockMinutes(clean) : 0), countsTowardWeeklyCapacity: clean.countsTowardWeeklyCapacity ?? (!fixedCourse && ['courses', 'ielts', 'urop', 'cuda', 'stocklens'].includes(trackId)) }
    }),
    summerPhases: parsed.summerPhases!,
    tracks: [...migratedTracks, ...extraTracks],
    weeklyPlans: migratedPlans,
    calendarImports: Array.isArray(parsed.calendarImports) ? parsed.calendarImports : [],
  }
}

// Kept as a compatibility export for older callers; hardcoded course injection is retired.
export const applyFall2026CourseSchedule = (data: PlannerData) => data

export function loadData(): PlannerData {
  try {
    const stored = localStorage.getItem(KEY)
    if (!stored) return createDefaultData()
    return migratePlannerData(JSON.parse(stored))
  } catch {
    return createDefaultData()
  }
}

export function saveData(data: PlannerData) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function resetData() {
  localStorage.removeItem(KEY)
}
