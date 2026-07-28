import { addDays, format } from 'date-fns'
import type { BlockTemplate, Category, PlannerData, TimeBlock } from '../types'

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

const templateSeed: Array<[string, string, string, number, string, string, boolean]> = [
  ['健身', 'Workout', '🏃', 60, 'health', '#39a876', false],
  ['AI 项目', 'AI Project', '✦', 120, 'study', '#5b7cfa', false],
  ['IELTS 词汇', 'IELTS Vocabulary', 'Aa', 45, 'study', '#6c87ee', false],
  ['IELTS 口语', 'IELTS Speaking', '◌', 45, 'study', '#7489df', false],
  ['视频素材筛选', 'Footage Review', '▣', 60, 'creative', '#9c72d5', false],
  ['视频剪辑', 'Video Editing', '▶', 120, 'creative', '#a36be0', false],
  ['做午饭', 'Cook Lunch', '♨', 45, 'life', '#ee9b4c', false],
  ['做晚饭', 'Cook Dinner', '♨', 45, 'life', '#e78d43', false],
  ['午饭', 'Lunch', '◐', 45, 'life', '#eba25c', false],
  ['晚饭', 'Dinner', '◑', 45, 'life', '#e49351', false],
  ['Valorant', 'Valorant', '◆', 90, 'rest', '#49a9bd', false],
  ['社交与外出', 'Social', '☺', 120, 'social', '#e86e8e', false],
  ['自由时间', 'Free Time', '○', 60, 'rest', '#63adbd', false],
  ['缓冲时间', 'Buffer Time', '≈', 30, 'rest', '#93a8b0', true],
  ['睡觉', 'Sleep', '☾', 480, 'rest', '#60739a', false],
  ['起床和晨间准备', 'Morning Routine', '☀', 45, 'life', '#e6aa4c', false],
]

const blockTemplates: BlockTemplate[] = templateSeed.map((t, i) => ({
  id: `tpl-${i + 1}`, title: t[0], titleEn: t[1], icon: t[2], durationMinutes: t[3],
  categoryId: t[4], color: t[5], isBuffer: t[6], priority: i === 1 ? 'high' : 'medium',
  isFixed: false, canMove: true, canSplit: !t[6], canBeOverridden: true, isBuiltIn: true, isHidden: false,
}))

function makeBlock(id: string, title: string, titleEn: string, date: string, startTime: string, endTime: string, categoryId: string, color: string, priority: 'low' | 'medium' | 'high' = 'medium', status: TimeBlock['status'] = 'pending', isBuffer = false): TimeBlock {
  const timestamp = new Date().toISOString()
  return { id, title, titleEn, date, startTime, endTime, categoryId, color, priority, status, isBuffer, isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, createdAt: timestamp, updatedAt: timestamp }
}

export function createDefaultData(): PlannerData {
  return {
    schemaVersion: 1,
    settings: { language: 'zh', theme: 'system', weekStartsOn: 1, defaultDayStart: '07:00', defaultDayEnd: '23:00', countLifeBlocks: false, defaultView: 'day' },
    categories,
    blockTemplates,
    timeBlocks: [
      makeBlock('demo-1', '晨间健身', 'Morning workout', today, '07:30', '08:30', 'health', '#39a876', 'high', 'completed'),
      makeBlock('demo-2', 'IELTS 词汇', 'IELTS vocabulary', today, '09:30', '10:15', 'study', '#6c87ee', 'high'),
      makeBlock('demo-3', 'AI 项目', 'AI project', today, '10:30', '12:00', 'study', '#5b7cfa', 'high'),
      makeBlock('demo-4', '做午饭', 'Cook lunch', today, '12:00', '12:45', 'life', '#ee9b4c'),
      makeBlock('demo-5', '缓冲时间', 'Buffer time', today, '15:00', '15:30', 'rest', '#93a8b0', 'low', 'pending', true),
      makeBlock('demo-6', '视频剪辑', 'Video editing', today, '15:30', '17:30', 'creative', '#a36be0'),
      makeBlock('demo-7', 'IELTS 口语', 'IELTS speaking', day(1), '09:00', '10:00', 'study', '#7489df'),
      makeBlock('demo-8', '朋友聚餐', 'Dinner with friends', day(2), '18:30', '21:00', 'social', '#e86e8e'),
      makeBlock('demo-9', 'AI 项目', 'AI project', day(-1), '10:00', '12:00', 'study', '#5b7cfa', 'high', 'completed'),
    ],
    summerPhases: [
      { id: 'phase-1', title: '建立节奏', titleEn: 'Build rhythm', startDate: day(-7), endDate: day(14), color: '#5b7cfa' },
      { id: 'phase-2', title: '集中成长', titleEn: 'Deep growth', startDate: day(15), endDate: day(35), color: '#a36be0' },
      { id: 'phase-3', title: '收尾与回顾', titleEn: 'Wrap up', startDate: day(36), endDate: day(55), color: '#39a876' },
    ],
  }
}

export function isPlannerData(value: unknown): value is PlannerData {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<PlannerData>
  return data.schemaVersion === 1 && !!data.settings && Array.isArray(data.categories) &&
    Array.isArray(data.blockTemplates) && Array.isArray(data.timeBlocks) && Array.isArray(data.summerPhases) &&
    data.timeBlocks.every(block => typeof block.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(block.date))
}

export function loadData(): PlannerData {
  try {
    const stored = localStorage.getItem(KEY)
    if (!stored) return createDefaultData()
    const parsed: unknown = JSON.parse(stored)
    return isPlannerData(parsed) ? parsed : createDefaultData()
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
