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

const templateSeed: Array<[string, string, string, number, string, string]> = [
  ['健身', 'Workout', '🏃', 60, 'health', '#39a876'],
  ['AI 项目', 'AI Project', '✦', 120, 'study', '#5b7cfa'],
  ['IELTS 词汇', 'IELTS Vocabulary', 'Aa', 45, 'study', '#6c87ee'],
  ['IELTS 口语', 'IELTS Speaking', '◌', 45, 'study', '#7489df'],
  ['视频素材筛选', 'Footage Review', '▣', 60, 'creative', '#9c72d5'],
  ['视频剪辑', 'Video Editing', '▶', 120, 'creative', '#a36be0'],
  ['做午饭', 'Cook Lunch', '♨', 45, 'life', '#ee9b4c'],
  ['做晚饭', 'Cook Dinner', '♨', 45, 'life', '#e78d43'],
  ['午饭', 'Lunch', '◐', 45, 'life', '#eba25c'],
  ['晚饭', 'Dinner', '◑', 45, 'life', '#e49351'],
  ['Valorant', 'Valorant', '◆', 90, 'rest', '#49a9bd'],
  ['社交与外出', 'Social', '☺', 120, 'social', '#e86e8e'],
  ['自由时间', 'Free Time', '○', 60, 'rest', '#63adbd'],
  ['睡觉', 'Sleep', '☾', 480, 'rest', '#60739a'],
  ['起床和晨间准备', 'Morning Routine', '☀', 45, 'life', '#e6aa4c'],
]

const blockTemplates: BlockTemplate[] = templateSeed.map((t, i) => ({
  id: `tpl-${i + 1}`, title: t[0], titleEn: t[1], icon: t[2], durationMinutes: t[3],
  categoryId: t[4], color: t[5], priority: i === 1 ? 'high' : 'medium',
  isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, isBuiltIn: true, isHidden: false,
}))

const FALL_2026_START = '2026-09-01'
const COURSE_TIMESTAMP = '2026-09-01T00:00:00.000Z'

type CourseTemplateSeed = {
  id: string
  title: string
  titleEn: string
  durationMinutes: number
  color: string
  icon: string
}

const courseTemplateSeeds: CourseTemplateSeed[] = [
  { id: 'course-comp2012-l1', title: 'COMP 2012 (L1)', titleEn: 'COMP 2012 (L1)', durationMinutes: 90, color: '#536dfe', icon: '' },
  { id: 'course-comp2012-la3', title: 'COMP 2012 (LA3)', titleEn: 'COMP 2012 (LA3)', durationMinutes: 120, color: '#536dfe', icon: '' },
  { id: 'course-comp2611-l1', title: 'COMP 2611 (L1)', titleEn: 'COMP 2611 (L1)', durationMinutes: 90, color: '#7c4dff', icon: '' },
  { id: 'course-comp2611-t2', title: 'COMP 2611 (T2)', titleEn: 'COMP 2611 (T2)', durationMinutes: 60, color: '#7c4dff', icon: '' },
  { id: 'course-comp2611-la1', title: 'COMP 2611 (LA1)', titleEn: 'COMP 2611 (LA1)', durationMinutes: 60, color: '#7c4dff', icon: '' },
  { id: 'course-comp3711-l2', title: 'COMP 3711 (L2)', titleEn: 'COMP 3711 (L2)', durationMinutes: 90, color: '#16a07a', icon: '' },
  { id: 'course-comp3711-t1', title: 'COMP 3711 (T1)', titleEn: 'COMP 3711 (T1)', durationMinutes: 60, color: '#16a07a', icon: '' },
  { id: 'course-comp4900-t1', title: 'COMP 4900 (T1)', titleEn: 'COMP 4900 (T1)', durationMinutes: 60, color: '#ef9548', icon: '' },
  { id: 'course-math2023-l1', title: 'MATH 2023 (L1)', titleEn: 'MATH 2023 (L1)', durationMinutes: 90, color: '#df5c88', icon: '' },
  { id: 'course-math2023-t1a', title: 'MATH 2023 (T1A)', titleEn: 'MATH 2023 (T1A)', durationMinutes: 60, color: '#df5c88', icon: '' },
]

const courseTemplates: BlockTemplate[] = courseTemplateSeeds.map(template => ({
  ...template,
  categoryId: 'study',
  priority: 'medium',
  isFixed: true,
  canMove: false,
  canSplit: false,
  canBeOverridden: false,
  isBuiltIn: true,
  isHidden: false,
}))

type CourseMeeting = {
  templateId: string
  weekday: number
  startTime: string
  endTime: string
  endDate: string
  courseName: string
  section: string
  location: string
  instructor?: string
  excludedDates?: string[]
}

const courseMeetings: CourseMeeting[] = [
  { templateId: 'course-comp2012-l1', weekday: 2, startTime: '13:30', endTime: '15:00', endDate: '2026-11-30', courseName: 'Object-Oriented Programming and Data Structures', section: 'L1', location: 'Lecture Theater A (401)', instructor: 'MAK, Brian' },
  { templateId: 'course-comp2012-l1', weekday: 4, startTime: '13:30', endTime: '15:00', endDate: '2026-11-30', courseName: 'Object-Oriented Programming and Data Structures', section: 'L1', location: 'Lecture Theater A (401)', instructor: 'MAK, Brian', excludedDates: ['2026-10-01'] },
  { templateId: 'course-comp2012-la3', weekday: 4, startTime: '18:00', endTime: '20:00', endDate: '2026-11-30', courseName: 'Object-Oriented Programming and Data Structures', section: 'LA3', location: 'G012, LSK Bldg (199)', excludedDates: ['2026-10-01'] },
  { templateId: 'course-comp2611-l1', weekday: 2, startTime: '10:30', endTime: '12:00', endDate: '2026-11-30', courseName: 'Computer Organization', section: 'L1', location: 'Rm 4619, Lift 31-32 (126)', instructor: 'LI, Xin' },
  { templateId: 'course-comp2611-l1', weekday: 4, startTime: '10:30', endTime: '12:00', endDate: '2026-11-30', courseName: 'Computer Organization', section: 'L1', location: 'Rm 4619, Lift 31-32 (126)', instructor: 'LI, Xin', excludedDates: ['2026-10-01'] },
  { templateId: 'course-comp2611-t2', weekday: 2, startTime: '12:00', endTime: '13:00', endDate: '2026-11-30', courseName: 'Computer Organization', section: 'T2', location: 'Rm 2465, Lift 25-26 (122)' },
  { templateId: 'course-comp2611-la1', weekday: 4, startTime: '12:00', endTime: '13:00', endDate: '2026-11-30', courseName: 'Computer Organization', section: 'LA1', location: 'Rm 2465, Lift 25-26 (122)', excludedDates: ['2026-10-01'] },
  { templateId: 'course-comp3711-l2', weekday: 1, startTime: '10:30', endTime: '12:00', endDate: '2026-11-30', courseName: 'Design and Analysis of Algorithms', section: 'L2', location: 'Lecture Theater G (150) / LG4101, Teaching Hub (150)', instructor: 'MA, Xiaojuan', excludedDates: ['2026-10-19'] },
  { templateId: 'course-comp3711-l2', weekday: 3, startTime: '10:30', endTime: '12:00', endDate: '2026-11-30', courseName: 'Design and Analysis of Algorithms', section: 'L2', location: 'Lecture Theater G (150) / LG4101, Teaching Hub (150)', instructor: 'MA, Xiaojuan' },
  { templateId: 'course-comp3711-t1', weekday: 1, startTime: '15:30', endTime: '16:30', endDate: '2026-11-30', courseName: 'Design and Analysis of Algorithms', section: 'T1', location: 'Rm 5403, Lift 17-18 (134)', excludedDates: ['2026-10-19'] },
  { templateId: 'course-comp4900-t1', weekday: 3, startTime: '18:00', endTime: '19:00', endDate: '2026-11-30', courseName: 'Academic and Professional Development', section: 'T1', location: 'Lecture Theater A (401)', instructor: 'LEUNG, Wai Ting' },
  { templateId: 'course-math2023-l1', weekday: 2, startTime: '09:00', endTime: '10:30', endDate: '2026-11-26', courseName: 'Multivariable Calculus', section: 'L1', location: 'Lecture Theater F (150) / LG4101, Teaching Hub (150)', instructor: 'HO, Hon Ming' },
  { templateId: 'course-math2023-l1', weekday: 4, startTime: '09:00', endTime: '10:30', endDate: '2026-11-26', courseName: 'Multivariable Calculus', section: 'L1', location: 'Lecture Theater F (150) / LG4101, Teaching Hub (150)', instructor: 'HO, Hon Ming', excludedDates: ['2026-10-01'] },
  { templateId: 'course-math2023-t1a', weekday: 2, startTime: '18:00', endTime: '19:00', endDate: '2026-11-30', courseName: 'Multivariable Calculus', section: 'T1A', location: 'Rm 2302, Lift 17-18 (74)', instructor: 'HO, Hon Ming' },
]

function weeklyDates(weekday: number, endDate: string, excludedDates: string[] = []) {
  const dates: string[] = []
  const cursor = new Date(`${FALL_2026_START}T00:00:00Z`)
  while (cursor.getUTCDay() !== weekday) cursor.setUTCDate(cursor.getUTCDate() + 1)
  while (cursor.toISOString().slice(0, 10) <= endDate) {
    const date = cursor.toISOString().slice(0, 10)
    if (!excludedDates.includes(date)) dates.push(date)
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return dates
}

const courseTemplateMap = new Map(courseTemplates.map(template => [template.id, template]))
const courseBlocks: TimeBlock[] = courseMeetings.flatMap(meeting => {
  const template = courseTemplateMap.get(meeting.templateId)
  if (!template) return []
  const note = [
    template.title.split(' (')[0] + ` - ${meeting.courseName}`,
    `Section: ${meeting.section}`,
    `Location: ${meeting.location}`,
    meeting.instructor ? `Instructor: ${meeting.instructor}` : '',
  ].filter(Boolean).join('\n')
  return weeklyDates(meeting.weekday, meeting.endDate, meeting.excludedDates).map(date => ({
    id: `fall-2026-${meeting.templateId}-${date}`,
    title: template.title,
    titleEn: template.titleEn,
    date,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    categoryId: 'study',
    color: template.color,
    icon: template.icon,
    priority: 'medium' as const,
    note,
    status: 'pending' as const,
    isFixed: true,
    canMove: false,
    canSplit: false,
    canBeOverridden: false,
    templateId: template.id,
    createdAt: COURSE_TIMESTAMP,
    updatedAt: COURSE_TIMESTAMP,
  }))
})

export function applyFall2026CourseSchedule(data: PlannerData): PlannerData {
  const courseTemplateIds = new Set(courseTemplates.map(template => template.id))
  const normalizedData: PlannerData = {
    ...data,
    blockTemplates: data.blockTemplates.map(template => courseTemplateIds.has(template.id) ? { ...template, icon: '', priority: 'medium' } : template),
    timeBlocks: data.timeBlocks.map(block => block.id.startsWith('fall-2026-course-') ? { ...block, icon: '', priority: 'medium' } : block),
  }
  if (normalizedData.settings.fall2026CoursesImported) return normalizedData
  const templateIds = new Set(normalizedData.blockTemplates.map(template => template.id))
  const blockIds = new Set(normalizedData.timeBlocks.map(block => block.id))
  const blockSignatures = new Set(normalizedData.timeBlocks.map(block => `${block.date}|${block.startTime}|${block.endTime}|${block.title}`))
  const newBlocks = courseBlocks.filter(block => !blockIds.has(block.id) && !blockSignatures.has(`${block.date}|${block.startTime}|${block.endTime}|${block.title}`))
  return {
    ...normalizedData,
    settings: { ...normalizedData.settings, fall2026CoursesImported: true },
    blockTemplates: [...normalizedData.blockTemplates, ...courseTemplates.filter(template => !templateIds.has(template.id))],
    timeBlocks: [...normalizedData.timeBlocks, ...newBlocks],
  }
}

function makeBlock(id: string, title: string, titleEn: string, date: string, startTime: string, endTime: string, categoryId: string, color: string, priority: 'low' | 'medium' | 'high' = 'medium', status: TimeBlock['status'] = 'pending'): TimeBlock {
  const timestamp = new Date().toISOString()
  return { id, title, titleEn, date, startTime, endTime, categoryId, color, priority, status, isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, createdAt: timestamp, updatedAt: timestamp }
}

export function createDefaultData(): PlannerData {
  return applyFall2026CourseSchedule({
    schemaVersion: 1,
    settings: { language: 'zh', theme: 'system', weekStartsOn: 1, defaultDayStart: '07:00', defaultDayEnd: '23:00', countLifeBlocks: false, defaultView: 'day', fall2026CoursesImported: false },
    categories,
    blockTemplates,
    timeBlocks: [
      makeBlock('demo-1', '晨间健身', 'Morning workout', today, '07:30', '08:30', 'health', '#39a876', 'high', 'completed'),
      makeBlock('demo-2', 'IELTS 词汇', 'IELTS vocabulary', today, '09:30', '10:15', 'study', '#6c87ee', 'high'),
      makeBlock('demo-3', 'AI 项目', 'AI project', today, '10:30', '12:00', 'study', '#5b7cfa', 'high'),
      makeBlock('demo-4', '做午饭', 'Cook lunch', today, '12:00', '12:45', 'life', '#ee9b4c'),
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
  })
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
    if (!isPlannerData(parsed)) return createDefaultData()
    const isLegacyBuffer = (item: { title: string; titleEn?: string }) => {
      const legacy = item as typeof item & { isBuffer?: boolean }
      return legacy.isBuffer === true || item.title === '缓冲时间' || item.titleEn === 'Buffer Time' || item.titleEn === 'Buffer time'
    }
    return applyFall2026CourseSchedule({
      ...parsed,
      blockTemplates: parsed.blockTemplates.filter(template => !isLegacyBuffer(template)).map(template => {
        const { isBuffer: _legacyBuffer, ...clean } = template as BlockTemplate & { isBuffer?: boolean }
        return clean
      }),
      timeBlocks: parsed.timeBlocks.filter(block => !isLegacyBuffer(block)).map(block => {
        const { isBuffer: _legacyBuffer, ...clean } = block as TimeBlock & { isBuffer?: boolean }
        return clean
      }),
    })
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
