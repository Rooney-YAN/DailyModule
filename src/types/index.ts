export type View = 'month' | 'week' | 'day' | 'now' | 'news' | 'settings'
export type Language = 'zh' | 'en'
export type Theme = 'system' | 'light' | 'dark'
export type Status = 'pending' | 'partial' | 'completed' | 'skipped' | 'conflict'
export type Priority = 'low' | 'medium' | 'high'
export type WeeklyMode = 'normal' | 'busy' | 'crunch' | 'deload'
export type TrackKind = 'goal' | 'infrastructure' | 'leisure'
export type CommitmentSize = 'small' | 'medium' | 'major'

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
  templateId?: string
  trackId?: string
  completedMinutes?: number
  source?: 'ics'
  sourceUid?: string
  recurrenceId?: string
  countsTowardWeeklyCapacity?: boolean
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
  isBuiltIn: boolean
  isHidden: boolean
  trackId?: string
}

export type Track = {
  id: string
  name: string
  nameEn: string
  color: string
  kind: TrackKind
  weeklyFloorMinutes: number
  weeklyTargetMinutes: number
  important: boolean
  urgent: boolean
  countsTowardWeeklyCapacity?: boolean
}

export type WeeklyCommitment = {
  id: string
  title: string
  dueAt: string
  size: CommitmentSize
  done: boolean
}

export type WeeklyPlan = {
  weekStart: string
  mode: WeeklyMode
  floorMultiplier: number
  flexBudgetMinutes: number
  capacityOverrideMinutes?: number
  floorOverrides: Record<string, number>
  flexAllocations: Record<string, number>
  topOutcomes: string[]
  commitments: WeeklyCommitment[]
  courseDeadlines: string
  ieltsFocus: string
  uropOutput: string
  primaryFocusTrackId?: string
  secondaryFocusTrackId?: string
  reviewCompletedAt?: string
  midweekCheckedAt?: string
  planningDismissedDate?: string
  midweekDismissedDate?: string
}

export type CalendarImport = {
  id: string
  fileName: string
  importedAt: string
  eventCount: number
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
  fall2026CoursesImported?: boolean
  modeFloorMultipliers: Record<WeeklyMode, number>
  baseWeeklyCapacityMinutes: number
  modeFloorProfiles: Record<WeeklyMode, Record<string, number>>
  reminders: {
    planningEnabled: boolean
    planningWeekday: number
    planningHour: number
    midweekEnabled: boolean
    midweekWeekday: number
    midweekHour: number
  }
}

export type PlannerData = {
  schemaVersion: 3
  settings: Settings
  categories: Category[]
  blockTemplates: BlockTemplate[]
  timeBlocks: TimeBlock[]
  summerPhases: SummerPhase[]
  tracks: Track[]
  weeklyPlans: Record<string, WeeklyPlan>
  calendarImports: CalendarImport[]
}
