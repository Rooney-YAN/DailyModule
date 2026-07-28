export type View = 'month' | 'week' | 'day' | 'now' | 'templates' | 'settings'
export type Language = 'zh' | 'en'
export type Theme = 'system' | 'light' | 'dark'
export type Status = 'pending' | 'completed' | 'skipped' | 'conflict'
export type Priority = 'low' | 'medium' | 'high'

export type Category = {
  id: string
  name: string
  nameEn: string
  color: string
  countsTowardCompletion: boolean
}

export type TimeBlock = {
  id: string
  title: string
  titleEn?: string
  date: string
  startTime: string
  endTime: string
  categoryId: string
  color: string
  icon?: string
  priority: Priority
  note?: string
  status: Status
  isFixed: boolean
  canMove: boolean
  canSplit: boolean
  canBeOverridden: boolean
  isBuffer: boolean
  templateId?: string
  createdAt: string
  updatedAt: string
}

export type BlockTemplate = {
  id: string
  title: string
  titleEn: string
  durationMinutes: number
  categoryId: string
  color: string
  icon: string
  priority: Priority
  isFixed: boolean
  canMove: boolean
  canSplit: boolean
  canBeOverridden: boolean
  isBuffer: boolean
  isBuiltIn: boolean
  isHidden: boolean
}

export type SummerPhase = {
  id: string
  title: string
  titleEn: string
  startDate: string
  endDate: string
  color: string
}

export type Settings = {
  language: Language
  theme: Theme
  weekStartsOn: 0 | 1
  defaultDayStart: string
  defaultDayEnd: string
  countLifeBlocks: boolean
  defaultView: 'day' | 'now'
}

export type PlannerData = {
  schemaVersion: 1
  settings: Settings
  categories: Category[]
  blockTemplates: BlockTemplate[]
  timeBlocks: TimeBlock[]
  summerPhases: SummerPhase[]
}
