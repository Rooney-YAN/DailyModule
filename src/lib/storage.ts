import { addDays, format } from 'date-fns'
import type { BlockTemplate, Category, PlannerData, Settings, TimeBlock, Track } from '../types'

const KEY = 'summer-planner-static-v1'
const today = format(new Date(), 'yyyy-MM-dd')
const day = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd')

const categories: Category[] = [
  { id: 'study', name: '学习', nameEn: 'Study', color: '#5b7cfa', countsTowardCompletion: true },
  { id: 'health', name: '健康', nameEn: 'Health', color: '#39a876', countsTowardCompletion: true },
  { id: 'creative', name: '创作', nameEn: 'Creative', color: '#a36be0', countsTowardCompletion: true },
  { id: 'life', name: '生活', nameEn: 'Life', color: '#ee9b4c', countsTowardCompletion: false },
  { id: 'social', name: '社交', nameEn: 'Social', color: '#e86e8e', countsTowardCompletion: false },
  { id: 'rest', name: '休息', nameEn: 'Rest', color: '#49a9bd', countsTowardCompletion: false },
]

export const defaultTracks: Track[] = [
  { id: 'courses', name: 'GPA / 课程', nameEn: 'GPA / Courses', color: '#5876de', kind: 'goal', weeklyFloorMinutes: 0, weeklyTargetMinutes: 0, important: true, urgent: true },
  { id: 'ielts', name: 'IELTS', nameEn: 'IELTS', color: '#745fd1', kind: 'goal', weeklyFloorMinutes: 300, weeklyTargetMinutes: 420, important: true, urgent: false },
  { id: 'urop', name: 'UROP', nameEn: 'UROP', color: '#159679', kind: 'goal', weeklyFloorMinutes: 180, weeklyTargetMinutes: 300, important: true, urgent: false },
  { id: 'cuda', name: 'CUDA', nameEn: 'CUDA', color: '#d47838', kind: 'goal', weeklyFloorMinutes: 180, weeklyTargetMinutes: 300, important: true, urgent: false },
  { id: 'stocklens', name: 'StockLens + 投资', nameEn: 'StockLens + Investing', color: '#b05f98', kind: 'goal', weeklyFloorMinutes: 120, weeklyTargetMinutes: 240, important: true, urgent: false },
  { id: 'social', name: '社交 / Networking', nameEn: 'Social / Networking', color: '#e26f8d', kind: 'goal', weeklyFloorMinutes: 60, weeklyTargetMinutes: 120, important: false, urgent: false },
  { id: 'health', name: '健康 / 健身', nameEn: 'Health / Gym', color: '#36a174', kind: 'infrastructure', weeklyFloorMinutes: 180, weeklyTargetMinutes: 300, important: true, urgent: false },
  { id: 'rest', name: '休息 / 娱乐', nameEn: 'Rest / Leisure', color: '#4c9daf', kind: 'leisure', weeklyFloorMinutes: 0, weeklyTargetMinutes: 0, important: false, urgent: false },
]

const defaultSettings: Settings = {
  language: 'zh', theme: 'system', weekStartsOn: 1, defaultDayStart: '07:00', defaultDayEnd: '23:00', countLifeBlocks: false, defaultView: 'day',
  modeFloorMultipliers: { normal: 1, busy: 0.75, crunch: 0.5, deload: 0.25 },
  reminders: { planningEnabled: true, planningWeekday: 0, planningHour: 18, midweekEnabled: true, midweekWeekday: 3, midweekHour: 18 },
}

const templateSeed: Array<[string, string, string, number, string, string, string]> = [
  ['健身', 'Workout', '🏃', 60, 'health', '#39a876', 'health'],
  ['AI 项目', 'AI Project', '✦', 120, 'study', '#5b7cfa', 'cuda'],
  ['IELTS 词汇', 'IELTS Vocabulary', 'Aa', 45, 'study', '#6c87ee', 'ielts'],
  ['IELTS 口语', 'IELTS Speaking', '◌', 45, 'study', '#7489df', 'ielts'],
  ['视频素材筛选', 'Footage Review', '▣', 60, 'creative', '#9c72d5', 'rest'],
  ['视频剪辑', 'Video Editing', '▶', 120, 'creative', '#a36be0', 'rest'],
  ['做午饭', 'Cook Lunch', '♨', 45, 'life', '#ee9b4c', 'rest'],
  ['做晚饭', 'Cook Dinner', '♨', 45, 'life', '#e78d43', 'rest'],
  ['午饭', 'Lunch', '◐', 45, 'life', '#eba25c', 'rest'],
  ['晚饭', 'Dinner', '◑', 45, 'life', '#e49351', 'rest'],
  ['Valorant', 'Valorant', '◆', 90, 'rest', '#49a9bd', 'rest'],
  ['社交与外出', 'Social', '☺', 120, 'social', '#e86e8e', 'social'],
  ['自由时间', 'Free Time', '○', 60, 'rest', '#63adbd', 'rest'],
  ['睡觉', 'Sleep', '☾', 480, 'rest', '#60739a', 'health'],
  ['起床和晨间准备', 'Morning Routine', '☀', 45, 'life', '#e6aa4c', 'health'],
]

const blockTemplates: BlockTemplate[] = templateSeed.map((template, index) => ({
  id: `tpl-${index + 1}`, title: template[0], titleEn: template[1], icon: template[2], durationMinutes: template[3],
  categoryId: template[4], color: template[5], trackId: template[6], priority: index === 1 ? 'high' : 'medium',
  isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, isBuiltIn: true, isHidden: false,
}))

function makeBlock(id: string, title: string, titleEn: string, date: string, startTime: string, endTime: string, categoryId: string, color: string, trackId: string, priority: TimeBlock['priority'] = 'medium', status: TimeBlock['status'] = 'pending'): TimeBlock {
  const timestamp = new Date().toISOString()
  return { id, title, titleEn, date, startTime, endTime, categoryId, color, trackId, priority, status, completedMinutes: status === 'completed' ? blockMinutes({ startTime, endTime }) : 0, isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, createdAt: timestamp, updatedAt: timestamp }
}

const blockMinutes = (block: { startTime: string; endTime: string }) => {
  const [startHour, startMinute] = block.startTime.split(':').map(Number)
  const [endHour, endMinute] = block.endTime.split(':').map(Number)
  return Math.max(0, endHour * 60 + endMinute - startHour * 60 - startMinute)
}

export function createDefaultData(): PlannerData {
  return {
    schemaVersion: 2,
    settings: defaultSettings,
    categories,
    blockTemplates,
    timeBlocks: [
      makeBlock('demo-1', '晨间健身', 'Morning workout', today, '07:30', '08:30', 'health', '#39a876', 'health', 'high', 'completed'),
      makeBlock('demo-2', 'IELTS 词汇', 'IELTS vocabulary', today, '09:30', '10:15', 'study', '#6c87ee', 'ielts', 'high'),
      makeBlock('demo-3', 'CUDA 项目', 'CUDA project', today, '10:30', '12:00', 'study', '#5b7cfa', 'cuda', 'high'),
      makeBlock('demo-4', '做午饭', 'Cook lunch', today, '12:00', '12:45', 'life', '#ee9b4c', 'rest'),
      makeBlock('demo-6', '视频剪辑', 'Video editing', today, '15:30', '17:30', 'creative', '#a36be0', 'rest'),
      makeBlock('demo-7', 'IELTS 口语', 'IELTS speaking', day(1), '09:00', '10:00', 'study', '#7489df', 'ielts'),
      makeBlock('demo-8', '朋友聚餐', 'Dinner with friends', day(2), '18:30', '21:00', 'social', '#e86e8e', 'social'),
      makeBlock('demo-9', 'CUDA 项目', 'CUDA project', day(-1), '10:00', '12:00', 'study', '#5b7cfa', 'cuda', 'high', 'completed'),
    ],
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
  return (data.schemaVersion === 1 || data.schemaVersion === 2) && !!data.settings && Array.isArray(data.categories) &&
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
  const settings: Settings = {
    ...defaultSettings,
    ...parsed.settings,
    modeFloorMultipliers: { ...defaultSettings.modeFloorMultipliers, ...(parsed.settings?.modeFloorMultipliers ?? {}) },
    reminders: { ...defaultSettings.reminders, ...(parsed.settings?.reminders ?? {}) },
  }
  return {
    schemaVersion: 2,
    settings,
    categories: parsed.categories!,
    blockTemplates: parsed.blockTemplates!.filter(template => !isLegacyBuffer(template)).map(template => {
      const { isBuffer: _legacyBuffer, ...clean } = template as BlockTemplate & { isBuffer?: boolean }
      return { ...clean, trackId: clean.trackId || inferTrack(clean.title, clean.categoryId) }
    }),
    timeBlocks: parsed.timeBlocks!.filter(block => !isLegacyBuffer(block)).map(block => {
      const { isBuffer: _legacyBuffer, ...clean } = block as TimeBlock & { isBuffer?: boolean }
      return { ...clean, trackId: clean.trackId || inferTrack(clean.title, clean.categoryId), completedMinutes: clean.completedMinutes ?? (clean.status === 'completed' ? blockMinutes(clean) : 0) }
    }),
    summerPhases: parsed.summerPhases!,
    tracks: Array.isArray(parsed.tracks) && parsed.tracks.length ? parsed.tracks : defaultTracks,
    weeklyPlans: parsed.weeklyPlans && typeof parsed.weeklyPlans === 'object' ? parsed.weeklyPlans : {},
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
