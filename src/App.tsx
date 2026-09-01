import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight, CirclePlus, Clock3,
  Download, Eye, FileUp, Focus, Languages, Layers3, Maximize2, Moon, Newspaper,
  Pencil, RotateCcw, Settings as SettingsIcon, Sun, Trash2, X,
} from 'lucide-react'
import { addDays, addMonths, format, isSameMonth, parseISO, subMonths } from 'date-fns'
import type { BlockTemplate, PlannerData, TimeBlock, View } from './types'
import { applyFall2026CourseSchedule, createDefaultData, isPlannerData, loadData, resetData, saveData } from './lib/storage'
import { dateLabel, duration, iso, monthDays, monthLabel, weekDays } from './lib/dates'
import NewsPage from './components/NewsPage'

const text = {
  zh: {
    month: '月', week: '周', day: '日', now: '现在', news: '快报', templates: '模板', settings: '设置',
    viewMode: '阅览模式', editMode: '编辑模式', today: '今天', add: '新建模块',
    focus: '今日重点', planned: '计划时长', completed: '已完成', progress: '今日进度',
    empty: '这一天还没有安排', emptyHint: '留白也是计划的一部分。需要时再添加。',
    current: '当前模块', next: '下一模块', free: '当前为空闲时间', remaining: '剩余',
    done: '完成', skip: '跳过', pending: '待完成', conflict: '发生冲突',
    export: '导出 JSON 备份', import: '导入 JSON 备份', reset: '恢复示例数据',
    language: '界面语言', appearance: '外观', system: '跟随系统', light: '浅色', dark: '深色',
    local: '数据仅保存在当前浏览器', save: '已自动保存', templateHint: '模板只定义持续时间。拖入日视图的时间轴，再决定具体开始时间。',
  },
  en: {
    month: 'Month', week: 'Week', day: 'Day', now: 'Now', news: 'Brief', templates: 'Templates', settings: 'Settings',
    viewMode: 'View mode', editMode: 'Edit mode', today: 'Today', add: 'New block',
    focus: 'Today’s focus', planned: 'Planned', completed: 'Completed', progress: 'Today’s progress',
    empty: 'Nothing planned for this day', emptyHint: 'Open space is part of a good plan. Add something when you need it.',
    current: 'Current block', next: 'Up next', free: 'You have free time right now', remaining: 'remaining',
    done: 'Done', skip: 'Skip', pending: 'Pending', conflict: 'Conflict',
    export: 'Export JSON backup', import: 'Import JSON backup', reset: 'Restore sample data',
    language: 'Language', appearance: 'Appearance', system: 'System', light: 'Light', dark: 'Dark',
    local: 'Data stays in this browser only', save: 'Saved automatically', templateHint: 'Templates define duration only. Drag one onto the day timeline to choose its start time.',
  },
} as const

const dailyQuotes = [
  { zh: '失去的时间，再也找不回来。', en: 'Lost time is never found again.', authorZh: '本杰明·富兰克林', authorEn: 'Benjamin Franklin' },
  { zh: '不要挥霍时间，因为时间是构成生命的材料。', en: 'Do not squander time, for that is the stuff life is made of.', authorZh: '本杰明·富兰克林', authorEn: 'Benjamin Franklin' },
  { zh: '今日能做之事，切勿留到明日。', en: 'Never leave that till tomorrow which you can do today.', authorZh: '本杰明·富兰克林', authorEn: 'Benjamin Franklin' },
  { zh: '勤奋是好运之母。', en: 'Diligence is the mother of good luck.', authorZh: '本杰明·富兰克林', authorEn: 'Benjamin Franklin' },
  { zh: '不是生命太短，而是我们浪费了太多时间。', en: 'It is not that we have a short time to live, but that we waste much of it.', authorZh: '塞涅卡', authorEn: 'Seneca' },
  { zh: '我们常常不是时间太少，而是失去得太多。', en: 'We do not have too little time; we lose much of it.', authorZh: '塞涅卡', authorEn: 'Seneca' },
  { zh: '当我们一再拖延，生命便匆匆而过。', en: 'While we postpone, life speeds by.', authorZh: '塞涅卡', authorEn: 'Seneca' },
  { zh: '没有目的地的人，不会有顺风。', en: 'No wind is favorable to one who does not know the harbor.', authorZh: '塞涅卡', authorEn: 'Seneca' },
  { zh: '不要再争论一个好人应该是什么样子。去成为一个好人。', en: 'Waste no more time arguing what a good person should be. Be one.', authorZh: '马可·奥勒留', authorEn: 'Marcus Aurelius' },
  { zh: '只要做眼前之事，并且把它做好。', en: 'Do what is before you, and do it well.', authorZh: '马可·奥勒留', authorEn: 'Marcus Aurelius' },
  { zh: '行动的障碍，反而能推动行动。', en: 'The impediment to action advances action.', authorZh: '马可·奥勒留', authorEn: 'Marcus Aurelius' },
  { zh: '你思想的品质，决定你生活的品质。', en: 'The happiness of your life depends upon the quality of your thoughts.', authorZh: '马可·奥勒留', authorEn: 'Marcus Aurelius' },
  { zh: '最好的报复，就是不成为伤害你的人。', en: 'The best revenge is not to be like your enemy.', authorZh: '马可·奥勒留', authorEn: 'Marcus Aurelius' },
  { zh: '先决定你想成为什么样的人，然后去做该做的事。', en: 'First say to yourself what you would be; then do what you have to do.', authorZh: '爱比克泰德', authorEn: 'Epictetus' },
  { zh: '不能主宰自己的人，不可能自由。', en: 'No man is free who is not master of himself.', authorZh: '爱比克泰德', authorEn: 'Epictetus' },
  { zh: '学而时习之，不亦说乎。', en: 'To learn and practice what is learned—is that not a joy?', authorZh: '孔子', authorEn: 'Confucius' },
  { zh: '温故而知新，可以为师矣。', en: 'Review the old and discover the new; then you may teach.', authorZh: '孔子', authorEn: 'Confucius' },
  { zh: '学而不思则罔，思而不学则殆。', en: 'Learning without thought is labor lost; thought without learning is perilous.', authorZh: '孔子', authorEn: 'Confucius' },
  { zh: '知之为知之，不知为不知，是知也。', en: 'To know what you know and what you do not know—that is knowledge.', authorZh: '孔子', authorEn: 'Confucius' },
  { zh: '三人行，必有我师焉。', en: 'When walking with others, I can always learn from someone.', authorZh: '孔子', authorEn: 'Confucius' },
  { zh: '见贤思齐焉，见不贤而内自省也。', en: 'See the worthy and strive to equal them; see faults and examine yourself.', authorZh: '孔子', authorEn: 'Confucius' },
  { zh: '君子欲讷于言而敏于行。', en: 'The exemplary person is modest in speech and quick in action.', authorZh: '孔子', authorEn: 'Confucius' },
  { zh: '工欲善其事，必先利其器。', en: 'To do good work, one must first sharpen the tools.', authorZh: '孔子', authorEn: 'Confucius' },
  { zh: '欲速则不达。', en: 'Haste prevents achievement.', authorZh: '孔子', authorEn: 'Confucius' },
  { zh: '人无远虑，必有近忧。', en: 'Without long-term thought, trouble will soon be near.', authorZh: '孔子', authorEn: 'Confucius' },
  { zh: '逝者如斯夫，不舍昼夜。', en: 'Time passes like this river, never ceasing day or night.', authorZh: '孔子', authorEn: 'Confucius' },
  { zh: '岁寒，然后知松柏之后凋也。', en: 'Only in winter do we know the pine and cypress remain steadfast.', authorZh: '孔子', authorEn: 'Confucius' },
  { zh: '千里之行，始于足下。', en: 'A journey of a thousand miles begins beneath one’s feet.', authorZh: '老子', authorEn: 'Laozi' },
  { zh: '合抱之木，生于毫末。', en: 'A tree too large to embrace grows from a tiny shoot.', authorZh: '老子', authorEn: 'Laozi' },
  { zh: '知人者智，自知者明。', en: 'Knowing others is intelligence; knowing yourself is true clarity.', authorZh: '老子', authorEn: 'Laozi' },
  { zh: '胜人者有力，自胜者强。', en: 'Mastering others takes strength; mastering yourself takes true power.', authorZh: '老子', authorEn: 'Laozi' },
  { zh: '慎终如始，则无败事。', en: 'Attend to the end as carefully as the beginning, and the work will not fail.', authorZh: '老子', authorEn: 'Laozi' },
] as const

const nav: Array<[View, typeof CalendarDays]> = [
  ['month', CalendarDays], ['week', CalendarRange], ['day', CalendarDays],
  ['now', Focus], ['news', Newspaper], ['settings', SettingsIcon],
]

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const timeFromMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.min(24 * 60, minutes))
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

const TIME_STEP = 10
const snapMinutes = (minutes: number) => Math.round(minutes / TIME_STEP) * TIME_STEP

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder}min`
  return remainder === 0 ? `${hours}h` : `${hours}h${remainder}min`
}

function findAvailableStart(desired: number, blockDuration: number, blocks: TimeBlock[], dayStart: number, dayEnd: number, ignoreId?: string) {
  const latestStart = dayEnd - blockDuration
  if (latestStart < dayStart) return null
  const preferred = Math.max(dayStart, Math.min(latestStart, snapMinutes(desired)))
  const occupied = blocks.filter(block => block.id !== ignoreId).map(block => [timeToMinutes(block.startTime), timeToMinutes(block.endTime)] as const)
  const fits = (start: number) => occupied.every(([otherStart, otherEnd]) => start + blockDuration <= otherStart || start >= otherEnd)
  for (let distance = 0; distance <= dayEnd - dayStart; distance += TIME_STEP) {
    const later = preferred + distance
    if (later <= latestStart && fits(later)) return later
    const earlier = preferred - distance
    if (distance > 0 && earlier >= dayStart && fits(earlier)) return earlier
  }
  return null
}

function detectConflicts(blocks: TimeBlock[]) {
  const ids = new Set<string>()
  const byDate = new Map<string, TimeBlock[]>()
  blocks.forEach(block => byDate.set(block.date, [...(byDate.get(block.date) ?? []), block]))
  byDate.forEach(dayBlocks => {
    dayBlocks.forEach((a, index) => dayBlocks.slice(index + 1).forEach(b => {
      if (timeToMinutes(a.startTime) < timeToMinutes(b.endTime) && timeToMinutes(b.startTime) < timeToMinutes(a.endTime)) {
        ids.add(a.id); ids.add(b.id)
      }
    }))
  })
  return ids
}

export default function App() {
  const [data, setData] = useState<PlannerData>(() => loadData())
  const [view, setView] = useState<View>(() => loadData().settings.defaultView)
  const [selectedDate, setSelectedDate] = useState(iso(new Date()))
  const [editMode, setEditMode] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; block?: TimeBlock }>({ open: false })
  const [moduleModal, setModuleModal] = useState<{ open: boolean; template?: BlockTemplate }>({ open: false })
  const [notice, setNotice] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const language = data.settings.language
  const t = text[language]

  useEffect(() => {
    const timer = window.setTimeout(() => saveData(data), 250)
    return () => window.clearTimeout(timer)
  }, [data])

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  }, [data.settings.theme, language])

  const conflicts = useMemo(() => detectConflicts(data.timeBlocks), [data.timeBlocks])
  const updateBlock = (id: string, patch: Partial<TimeBlock>) =>
    setData(current => ({ ...current, timeBlocks: current.timeBlocks.map(block => block.id === id ? { ...block, ...patch, updatedAt: new Date().toISOString() } : block) }))
  const removeBlock = (id: string) => {
    if (!window.confirm(language === 'zh' ? '确定删除这个时间模块吗？' : 'Delete this time block?')) return
    setData(current => ({ ...current, timeBlocks: current.timeBlocks.filter(block => block.id !== id) }))
  }
  const saveBlock = (block: TimeBlock) => {
    setData(current => ({ ...current, timeBlocks: current.timeBlocks.some(item => item.id === block.id) ? current.timeBlocks.map(item => item.id === block.id ? block : item) : [...current.timeBlocks, block] }))
    setModal({ open: false })
  }
  const addFromTemplate = (template: BlockTemplate, requestedStart?: string) => {
    const dayStart = 0
    const dayEnd = 24 * 60
    const dayBlocks = data.timeBlocks.filter(block => block.date === selectedDate)
    const startMinutes = findAvailableStart(requestedStart ? timeToMinutes(requestedStart) : dayStart, template.durationMinutes, dayBlocks, dayStart, dayEnd)
    if (startMinutes === null) {
      setNotice(language === 'zh' ? '当天没有足够的连续空闲时间' : 'No continuous free slot is available')
      window.setTimeout(() => setNotice(''), 2200)
      return
    }
    const start = timeFromMinutes(startMinutes)
    const end = timeFromMinutes(startMinutes + template.durationMinutes)
    const now = new Date().toISOString()
    saveBlock({
      id: crypto.randomUUID(), title: template.title, titleEn: template.titleEn, date: selectedDate, startTime: start, endTime: end,
      categoryId: template.categoryId, color: template.color, icon: template.icon, priority: template.priority, status: 'pending',
      isFixed: template.isFixed, canMove: template.canMove, canSplit: template.canSplit, canBeOverridden: template.canBeOverridden,
      templateId: template.id, createdAt: now, updatedAt: now,
    })
    setNotice(language === 'zh' ? `已添加“${template.title}”` : `Added “${template.titleEn}”`)
    window.setTimeout(() => setNotice(''), 1800)
  }
  const saveTemplate = (value: { title: string; durationMinutes: number; categoryId: string }) => {
    const category = data.categories.find(item => item.id === value.categoryId) ?? data.categories[0]
    const template: BlockTemplate = {
      id: moduleModal.template?.id ?? crypto.randomUUID(), title: value.title, titleEn: moduleModal.template?.titleEn ?? value.title, durationMinutes: value.durationMinutes,
      categoryId: category.id, color: category.color, icon: moduleModal.template?.icon ?? '◆', priority: moduleModal.template?.priority ?? 'medium', isFixed: moduleModal.template?.isFixed ?? false,
      canMove: moduleModal.template?.canMove ?? true, canSplit: moduleModal.template?.canSplit ?? true, canBeOverridden: moduleModal.template?.canBeOverridden ?? true, isBuiltIn: moduleModal.template?.isBuiltIn ?? false, isHidden: false,
    }
    setData(current => ({ ...current, blockTemplates: current.blockTemplates.some(item => item.id === template.id) ? current.blockTemplates.map(item => item.id === template.id ? template : item) : [...current.blockTemplates, template] }))
    setModuleModal({ open: false })
    setNotice(language === 'zh' ? `“${value.title}”已保存` : `“${value.title}” saved`)
    window.setTimeout(() => setNotice(''), 1800)
  }
  const removeTemplate = (template: BlockTemplate) => {
    if (!window.confirm(language === 'zh' ? `从模块库删除“${template.title}”？已安排的日程不会受影响。` : `Delete “${template.titleEn}” from the library? Scheduled items will remain.`)) return
    setData(current => ({ ...current, blockTemplates: current.blockTemplates.filter(item => item.id !== template.id) }))
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `daily-module-${iso(new Date())}.json`; link.click()
    URL.revokeObjectURL(url)
  }
  const importData = async (file?: File) => {
    if (!file) return
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isPlannerData(parsed)) throw new Error('invalid')
      if (window.confirm(language === 'zh' ? '导入会覆盖当前数据，确定继续吗？' : 'Importing replaces current data. Continue?')) setData(applyFall2026CourseSchedule(parsed))
    } catch {
      window.alert(language === 'zh' ? '无法导入：文件格式不正确。' : 'Import failed: invalid file format.')
    }
  }
  const restore = () => {
    if (!window.confirm(language === 'zh' ? '确定恢复示例数据？当前数据将被覆盖。' : 'Restore sample data and replace current data?')) return
    resetData(); setData(createDefaultData())
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setView('now')}><span className="brand-mark"><Layers3 /></span><span><b>DailyModule</b><small>Plan · Focus · Finish</small></span></button>
      <nav>{nav.map(([key, Icon]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}><Icon /><span>{t[key]}</span></button>)}</nav>
      <div className="sidebar-foot"><span className="save-dot" />{t.save}</div>
    </aside>

    <main className="workspace">
      <header className="topbar">
        <div className="date-controls">
          <button className="ghost icon" onClick={() => setSelectedDate(iso(addDays(parseISO(selectedDate), -1)))} aria-label="Previous day"><ChevronLeft /></button>
          <button className="ghost today" onClick={() => setSelectedDate(iso(new Date()))}>{t.today}</button>
          <button className="ghost icon" onClick={() => setSelectedDate(iso(addDays(parseISO(selectedDate), 1)))} aria-label="Next day"><ChevronRight /></button>
          <strong>{dateLabel(selectedDate, language)}</strong>
        </div>
        <div className="top-actions">
          <span className="theme-state">{data.settings.theme === 'dark' ? <Moon /> : <Sun />}{t[data.settings.theme]}</span>
          <button className={`mode-toggle ${editMode ? 'editing' : ''}`} onClick={() => setEditMode(!editMode)}>{editMode ? <Pencil /> : <Eye />}{editMode ? t.editMode : t.viewMode}</button>
        </div>
      </header>

      <div className="page">
        {view === 'day' && <DayView {...{ data, selectedDate, language, t, editMode, conflicts, updateBlock, removeBlock, setModal, addFromTemplate, removeTemplate }} onNewTemplate={() => setModuleModal({ open: true })} onEditTemplate={template => setModuleModal({ open: true, template })} />}
        {view === 'now' && <NowView {...{ data, selectedDate, language, t, updateBlock }} />}
        {view === 'week' && <WeekView {...{ data, selectedDate, language, t, conflicts, setSelectedDate, setView }} />}
        {view === 'month' && <MonthView {...{ data, selectedDate, language, conflicts, setSelectedDate, setView }} />}
        {view === 'news' && <NewsPage language={language} />}
        {view === 'settings' && <SettingsView {...{ data, setData, t, exportData, importRef, restore }} />}
      </div>
    </main>

    {editMode && !['news', 'settings'].includes(view) && <button className="floating-add" onClick={() => view === 'day' ? setModuleModal({ open: true }) : setModal({ open: true })}><CirclePlus />{t.add}</button>}
    <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={event => { void importData(event.target.files?.[0]); event.target.value = '' }} />
    <BlockModal open={modal.open} block={modal.block} date={selectedDate} data={data} language={language} onClose={() => setModal({ open: false })} onSave={saveBlock} />
    <ModuleModal open={moduleModal.open} template={moduleModal.template} data={data} language={language} onClose={() => setModuleModal({ open: false })} onSave={saveTemplate} />
    {notice && <div className="toast">{notice}</div>}
  </div>
}

type SharedProps = {
  data: PlannerData
  selectedDate: string
  language: 'zh' | 'en'
  t: typeof text.zh | typeof text.en
}

function DayView({ data, selectedDate, language, t, editMode, conflicts, updateBlock, removeBlock, setModal, addFromTemplate, onNewTemplate, onEditTemplate, removeTemplate }: SharedProps & {
  editMode: boolean; conflicts: Set<string>; updateBlock: (id: string, patch: Partial<TimeBlock>) => void
  removeBlock: (id: string) => void; setModal: (value: { open: boolean; block?: TimeBlock }) => void
  addFromTemplate: (template: BlockTemplate, requestedStart?: string) => void
  onNewTemplate: () => void
  onEditTemplate: (template: BlockTemplate) => void
  removeTemplate: (template: BlockTemplate) => void
}) {
  const [armedTemplateId, setArmedTemplateId] = useState<string>()
  const [dragPreview, setDragPreview] = useState<{ start: number; duration: number }>()
  const [draggingPayload, setDraggingPayload] = useState<{ type: 'template' | 'block'; id: string }>()
  const blocks = data.timeBlocks.filter(block => block.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const core = blocks.filter(block => data.categories.find(category => category.id === block.categoryId)?.countsTowardCompletion)
  const completed = core.filter(block => block.status === 'completed').length
  const minutes = blocks.reduce((sum, block) => sum + duration(block.startTime, block.endTime), 0)
  const quote = dailyQuotes[Math.abs(Number(selectedDate.replaceAll('-', ''))) % dailyQuotes.length]
  const templates = data.blockTemplates.filter(template => !template.isHidden)
  const timelineStart = 0
  const timelineEnd = 24 * 60
  const hourHeight = 96
  const timelineHeight = (timelineEnd - timelineStart) / 60 * hourHeight
  const ticks = Array.from({ length: (timelineEnd - timelineStart) / TIME_STEP + 1 }, (_, index) => timelineStart + index * TIME_STEP)
  const getMinutesFromPointer = (clientY: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    return snapMinutes(timelineStart + (clientY - rect.top) / hourHeight * 60)
  }
  const dragData = (event: React.DragEvent) => {
    try { return JSON.parse(event.dataTransfer.getData('application/x-dailymodule')) as { type: 'template' | 'block'; id: string } } catch { return null }
  }
  const previewFor = (payload: { type: 'template' | 'block'; id: string } | null, desired: number) => {
    if (!payload) return undefined
    const blockDuration = payload.type === 'template'
      ? templates.find(template => template.id === payload.id)?.durationMinutes
      : blocks.find(block => block.id === payload.id) ? duration(blocks.find(block => block.id === payload.id)!.startTime, blocks.find(block => block.id === payload.id)!.endTime) : undefined
    if (!blockDuration) return undefined
    const available = findAvailableStart(desired, blockDuration, blocks, timelineStart, timelineEnd, payload.type === 'block' ? payload.id : undefined)
    return available === null ? undefined : { start: available, duration: blockDuration }
  }
  const placeTemplate = (template: BlockTemplate, desired: number) => {
    const available = findAvailableStart(desired, template.durationMinutes, blocks, timelineStart, timelineEnd)
    if (available !== null) addFromTemplate(template, timeFromMinutes(available))
    setArmedTemplateId(undefined)
    setDragPreview(undefined)
  }
  const moveBlock = (block: TimeBlock, desired: number) => {
    const blockDuration = duration(block.startTime, block.endTime)
    const available = findAvailableStart(desired, blockDuration, blocks, timelineStart, timelineEnd, block.id)
    if (available !== null) updateBlock(block.id, { startTime: timeFromMinutes(available), endTime: timeFromMinutes(available + blockDuration) })
    setDragPreview(undefined)
  }
  return <>
    <section className="hero-row">
      <div className="daily-quote"><span className="eyebrow">{dateLabel(selectedDate, language)}</span><blockquote>“{language === 'zh' ? quote.zh : quote.en}”</blockquote><cite>— {language === 'zh' ? quote.authorZh : quote.authorEn}</cite></div>
      <div className="summary-card"><div><span>{t.planned}</span><strong>{Math.floor(minutes / 60)}h {minutes % 60}m</strong></div><div><span>{t.progress}</span><strong>{core.length ? Math.round(completed / core.length * 100) : 0}%</strong></div></div>
    </section>
    <section className="focus-strip"><div><span className="eyebrow">{t.focus}</span><div className="focus-items">{blocks.filter(block => block.priority === 'high').slice(0, 3).map(block => <span key={block.id}><i style={{ background: block.color }} />{language === 'en' && block.titleEn ? block.titleEn : block.title}</span>)}</div></div><div className="progress-ring" style={{ '--progress': `${core.length ? completed / core.length * 360 : 0}deg` } as React.CSSProperties}><span>{completed}/{core.length}</span></div></section>
    <section className="section-head"><div><span className="eyebrow">{language === 'zh' ? '积木式日程' : 'Block schedule'}</span><h2>{language === 'zh' ? '拖放安排今天' : 'Build your day'}</h2></div>{conflicts.size > 0 && <span className="conflict-pill">{conflicts.size} {t.conflict}</span>}</section>
    <div className="day-builder">
      <aside className="module-dock">
        <div className="module-dock-head"><div><span className="eyebrow">{t.templates}</span><h3>{language === 'zh' ? '模块库' : 'Module library'}</h3></div><button className="module-add" onClick={onNewTemplate}><CirclePlus />{language === 'zh' ? '新建' : 'New'}</button></div>
        <div className="module-stack">{templates.map(template => <article
          className={`module-piece ${template.icon ? '' : 'no-symbol'} ${armedTemplateId === template.id ? 'armed' : ''}`}
          style={{ '--module': template.color } as React.CSSProperties}
          draggable
          onDragStart={event => {
            const dragItem = { type: 'template' as const, id: template.id }
            const payload = JSON.stringify(dragItem)
            setDraggingPayload(dragItem)
            event.dataTransfer.setData('application/x-dailymodule', payload); event.dataTransfer.setData('text/plain', payload)
            event.dataTransfer.effectAllowed = 'copy'
          }}
          onDragEnd={() => { setDraggingPayload(undefined); setDragPreview(undefined) }}
          onClick={() => setArmedTemplateId(current => current === template.id ? undefined : template.id)}
          key={template.id}
        ><span className="module-grip" aria-hidden="true">⠿</span>{template.icon && <span className="module-symbol">{template.icon}</span>}<span className="module-copy"><b>{language === 'en' ? template.titleEn : template.title}</b><small>{formatDuration(template.durationMinutes)}</small></span><span className="module-tools"><button type="button" draggable={false} onClick={event => { event.stopPropagation(); onEditTemplate(template) }} aria-label={language === 'zh' ? '修改模块' : 'Edit module'}><Pencil /></button><button type="button" draggable={false} onClick={event => { event.stopPropagation(); removeTemplate(template) }} aria-label={language === 'zh' ? '删除模块' : 'Delete module'}><Trash2 /></button></span></article>)}</div>
      </aside>
      <section className={`schedule-board ${armedTemplateId ? 'placing' : ''}`}>
        <div className="schedule-instructions"><span>{editMode ? (language === 'zh' ? '拖动已安排模块可重新排期' : 'Drag scheduled blocks to reschedule') : (language === 'zh' ? '开启编辑模式后可移动已有模块' : 'Turn on edit mode to move scheduled blocks')}</span>{armedTemplateId && <b>{language === 'zh' ? '点击时间轴放置选中的模块' : 'Click the timeline to place the selected module'}</b>}</div>
        <div
          className="schedule-canvas"
          style={{ height: timelineHeight }}
          onClick={event => {
            const template = templates.find(item => item.id === armedTemplateId)
            if (template) placeTemplate(template, getMinutesFromPointer(event.clientY, event.currentTarget))
          }}
          onDragOver={event => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            setDragPreview(previewFor(draggingPayload ?? dragData(event), getMinutesFromPointer(event.clientY, event.currentTarget)))
          }}
          onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragPreview(undefined) }}
          onDrop={event => {
            event.preventDefault()
            const payload = draggingPayload ?? dragData(event)
            const desired = getMinutesFromPointer(event.clientY, event.currentTarget)
            if (payload?.type === 'template') {
              const template = templates.find(item => item.id === payload.id)
              if (template) placeTemplate(template, desired)
            } else if (payload?.type === 'block') {
              const block = blocks.find(item => item.id === payload.id)
              if (block) moveBlock(block, desired)
            }
            setDraggingPayload(undefined)
          }}
        >
          {ticks.map(tick => <div className={`schedule-tick ${tick % 60 === 0 ? 'major' : tick % 30 === 0 ? 'half' : 'minor'}`} style={{ top: (tick - timelineStart) / 60 * hourHeight }} key={tick}><time>{timeFromMinutes(tick)}</time><span /></div>)}
          {dragPreview && <div className="schedule-ghost" style={{ top: (dragPreview.start - timelineStart) / 60 * hourHeight, height: dragPreview.duration / 60 * hourHeight }}><strong>{timeFromMinutes(dragPreview.start)} — {timeFromMinutes(dragPreview.start + dragPreview.duration)}</strong></div>}
          {blocks.length === 0 && <div className="schedule-empty"><CirclePlus /><b>{language === 'zh' ? '把左侧模块拖到这里' : 'Drag a module here'}</b><span>{language === 'zh' ? '时间会自动吸附到 10 分钟刻度' : 'Time snaps to 10-minute intervals'}</span></div>}
          {blocks.map(block => <article
            tabIndex={0}
            draggable={editMode && block.canMove}
            className={`scheduled-piece ${duration(block.startTime, block.endTime) <= 30 ? 'compact' : ''} ${block.status} ${conflicts.has(block.id) ? 'conflicting' : ''} ${editMode ? 'movable' : ''}`}
            style={{ '--module': block.color, top: (timeToMinutes(block.startTime) - timelineStart) / 60 * hourHeight, height: duration(block.startTime, block.endTime) / 60 * hourHeight } as React.CSSProperties}
            onClick={event => { event.stopPropagation(); setModal({ open: true, block }) }}
            onDragStart={event => {
              const dragItem = { type: 'block' as const, id: block.id }
              const payload = JSON.stringify(dragItem)
              setDraggingPayload(dragItem)
              event.dataTransfer.setData('application/x-dailymodule', payload); event.dataTransfer.setData('text/plain', payload)
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => { setDraggingPayload(undefined); setDragPreview(undefined) }}
            onKeyDown={event => {
              if (!editMode || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
              event.preventDefault()
              const delta = (event.shiftKey ? 60 : TIME_STEP) * (event.key === 'ArrowDown' ? 1 : -1)
              moveBlock(block, timeToMinutes(block.startTime) + delta)
            }}
            key={block.id}
          >
            <span className="scheduled-accent" />
            <div className="scheduled-content"><div><strong>{block.icon && <span>{block.icon}</span>}{language === 'en' && block.titleEn ? block.titleEn : block.title}</strong><small>{block.startTime} — {block.endTime} · {duration(block.startTime, block.endTime)} min</small></div><div className="scheduled-actions"><button onClick={event => { event.stopPropagation(); updateBlock(block.id, { status: block.status === 'completed' ? 'pending' : 'completed' }) }} aria-label={t.done}><Check /></button>{editMode && <button onClick={event => { event.stopPropagation(); removeBlock(block.id) }} aria-label="Delete"><Trash2 /></button>}</div></div>
          </article>)}
        </div>
      </section>
    </div>
  </>
}

function NowView({ data, selectedDate, language, t, updateBlock }: SharedProps & { updateBlock: (id: string, patch: Partial<TimeBlock>) => void }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const updateNow = () => setNow(new Date())
    const timer = window.setInterval(updateNow, 1000)
    document.addEventListener('visibilitychange', updateNow)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', updateNow)
    }
  }, [])
  const blocks = data.timeBlocks.filter(block => block.date === selectedDate && block.status === 'pending').sort((a, b) => a.startTime.localeCompare(b.startTime))
  const isToday = selectedDate === iso(now)
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const current = isToday ? blocks.find(block => timeToMinutes(block.startTime) * 60 <= nowSeconds && timeToMinutes(block.endTime) * 60 > nowSeconds) : blocks[0]
  const next = blocks.find(block => !current || timeToMinutes(block.startTime) > timeToMinutes(current.endTime))
  const remainingSeconds = current ? Math.max(0, isToday ? timeToMinutes(current.endTime) * 60 - nowSeconds : duration(current.startTime, current.endTime) * 60) : 0
  const countdown = `${String(Math.floor(remainingSeconds / 3600)).padStart(2, '0')}:${String(Math.floor(remainingSeconds % 3600 / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`
  return <div className="now-layout">
    <section className="now-main">
      <div className="now-top"><span className="eyebrow">{t.current}</span><button className="ghost icon" onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Fullscreen"><Maximize2 /></button></div>
      {current ? <>
        <span className="now-time">{current.startTime} — {current.endTime}</span>
        <h1>{language === 'en' && current.titleEn ? current.titleEn : current.title}</h1>
        <div className="countdown"><time dateTime={`PT${remainingSeconds}S`}>{countdown}</time><span>{language === 'zh' ? '时 : 分 : 秒' : 'hr : min : sec'}<br />{t.remaining}</span></div>
        {current.note && <p className="now-note">{current.note}</p>}
        <div className="now-actions"><button className="primary" onClick={() => updateBlock(current.id, { status: 'completed' })}><Check />{t.done}</button><button className="secondary" onClick={() => updateBlock(current.id, { status: 'skipped' })}>{t.skip}</button></div>
      </> : <Empty title={t.free} hint={next ? `${language === 'zh' ? '下一项开始于' : 'Next starts at'} ${next.startTime}` : t.emptyHint} />}
    </section>
    <aside className="now-side">
      <span className="eyebrow">{t.next}</span>
      {next ? <><h3>{language === 'en' && next.titleEn ? next.titleEn : next.title}</h3><p>{next.startTime} · {duration(next.startTime, next.endTime)} min</p></> : <p>{language === 'zh' ? '今天没有更多安排' : 'Nothing else planned today'}</p>}
      <hr /><span className="eyebrow">{t.focus}</span>
      {blocks.filter(block => block.priority === 'high').slice(0, 3).map(block => <div className="mini-focus" key={block.id}><i style={{ background: block.color }} /><span>{language === 'en' && block.titleEn ? block.titleEn : block.title}</span><small>{block.startTime}</small></div>)}
    </aside>
  </div>
}

function WeekView({ data, selectedDate, language, t, conflicts, setSelectedDate, setView }: SharedProps & { conflicts: Set<string>; setSelectedDate: (date: string) => void; setView: (view: View) => void }) {
  const days = weekDays(selectedDate)
  const weekBlocks = data.timeBlocks.filter(block => days.some(day => iso(day) === block.date))
  const planned = weekBlocks.reduce((sum, block) => sum + duration(block.startTime, block.endTime), 0)
  return <>
    <section className="page-title"><span className="eyebrow">{t.week}</span><h1>{language === 'zh' ? '本周的节奏' : 'Your week at a glance'}</h1><p>{formatDuration(planned)} {language === 'zh' ? '已计划' : 'planned'}</p></section>
    <div className="week-grid">{days.map(day => {
      const date = iso(day); const blocks = weekBlocks.filter(block => block.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime))
      return <section className={`week-day ${date === iso(new Date()) ? 'today-col' : ''}`} key={date}>
        <button className="week-date" onClick={() => { setSelectedDate(date); setView('day') }}><span>{format(day, 'EEE')}</span><strong>{format(day, 'd')}</strong></button>
        <div>{blocks.map(block => <button key={block.id} className={`week-block ${conflicts.has(block.id) ? 'conflicting' : ''}`} style={{ '--block': block.color } as React.CSSProperties} onClick={() => { setSelectedDate(date); setView('day') }}><small>{block.startTime}</small><b>{language === 'en' && block.titleEn ? block.titleEn : block.title}</b></button>)}</div>
      </section>
    })}</div>
  </>
}

function MonthView({ data, selectedDate, language, conflicts, setSelectedDate, setView }: Omit<SharedProps, 't'> & { conflicts: Set<string>; setSelectedDate: (date: string) => void; setView: (view: View) => void }) {
  const [month, setMonth] = useState(selectedDate)
  return <>
    <section className="month-head"><div><h1>{monthLabel(month, language)}</h1></div><div><button className="ghost icon" onClick={() => setMonth(iso(subMonths(parseISO(month), 1)))}><ChevronLeft /></button><button className="ghost icon" onClick={() => setMonth(iso(addMonths(parseISO(month), 1)))}><ChevronRight /></button></div></section>
    <div className="calendar-scroll"><div className="calendar-grid calendar-labels">{(language === 'zh' ? ['一','二','三','四','五','六','日'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']).map(label => <span key={label}>{label}</span>)}</div>
    <div className="calendar-grid">{monthDays(month).map(day => {
      const date = iso(day); const blocks = data.timeBlocks.filter(block => block.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)); const completed = blocks.filter(block => block.status === 'completed').length
      return <button key={date} className={`calendar-day ${!isSameMonth(day, parseISO(month)) ? 'outside' : ''} ${date === iso(new Date()) ? 'today-cell' : ''}`} onClick={() => { setSelectedDate(date); setView('day') }}>
        <span className="day-number">{format(day, 'd')}</span><div>{blocks.map(block => <span className={`calendar-block ${conflicts.has(block.id) ? 'conflicting' : ''}`} key={block.id} style={{ '--block': block.color } as React.CSSProperties} title={`${block.startTime} ${block.title}`}>{block.startTime} {block.title}</span>)}</div>
        {blocks.length > 0 && <small>{completed}/{blocks.length} · {Math.round(blocks.reduce((sum, block) => sum + duration(block.startTime, block.endTime), 0) / 60 * 10) / 10}h</small>}
      </button>
    })}</div></div>
  </>
}

function SettingsView({ data, setData, t, exportData, importRef, restore }: { data: PlannerData; setData: React.Dispatch<React.SetStateAction<PlannerData>>; t: SharedProps['t']; exportData: () => void; importRef: React.RefObject<HTMLInputElement | null>; restore: () => void }) {
  const patch = (settings: Partial<PlannerData['settings']>) => setData(current => ({ ...current, settings: { ...current.settings, ...settings } }))
  return <div className="settings-page">
    <section className="page-title"><span className="eyebrow">{t.settings}</span><h1>{data.settings.language === 'zh' ? '让计划适合你' : 'Make it yours'}</h1><p>{t.local}</p></section>
    <section className="settings-card"><div><Languages /><span><b>{t.language}</b><small>简体中文 / English</small></span></div><div className="segmented"><button className={data.settings.language === 'zh' ? 'active' : ''} onClick={() => patch({ language: 'zh' })}>中文</button><button className={data.settings.language === 'en' ? 'active' : ''} onClick={() => patch({ language: 'en' })}>English</button></div></section>
    <section className="settings-card"><div><Sun /><span><b>{t.appearance}</b><small>{t[data.settings.theme]}</small></span></div><div className="segmented">{(['system','light','dark'] as const).map(theme => <button className={data.settings.theme === theme ? 'active' : ''} onClick={() => patch({ theme })} key={theme}>{t[theme]}</button>)}</div></section>
    <section className="settings-card data-actions"><div><Download /><span><b>{data.settings.language === 'zh' ? '数据与备份' : 'Data & backup'}</b><small>JSON</small></span></div><div><button className="secondary" onClick={exportData}><Download />{t.export}</button><button className="secondary" onClick={() => importRef.current?.click()}><FileUp />{t.import}</button><button className="danger-button" onClick={restore}><RotateCcw />{t.reset}</button></div></section>
  </div>
}

function TimeRangePicker({ startTime, endTime, language, onChange }: {
  startTime: string
  endTime: string
  language: 'zh' | 'en'
  onChange: (startTime: string, endTime: string) => void
}) {
  const min = 0
  const max = 24 * 60
  const step = TIME_STEP
  const start = Math.min(timeToMinutes(startTime), max - step)
  const end = Math.max(Math.min(timeToMinutes(endTime), max), start + step)
  const startPercent = start / max * 100
  const endPercent = end / max * 100
  const totalMinutes = end - start
  const durationLabel = language === 'zh'
    ? `${Math.floor(totalMinutes / 60)} 小时 ${totalMinutes % 60} 分钟`
    : `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`

  return <section className="time-picker" aria-label={language === 'zh' ? '时间范围' : 'Time range'}>
    <div className="time-picker-head">
      <div><Clock3 /><span>{language === 'zh' ? '时间范围' : 'Time range'}</span></div>
      <span className="time-duration">{durationLabel}</span>
    </div>
    <div className="time-values" aria-live="polite">
      <div className="time-value"><span>{language === 'zh' ? '开始' : 'Start'}</span><strong>{timeFromMinutes(start)}</strong></div>
      <span className="time-value-arrow">→</span>
      <div className="time-value"><span>{language === 'zh' ? '结束' : 'End'}</span><strong>{timeFromMinutes(end)}</strong></div>
    </div>
    <div className="time-range" style={{ '--start': `${startPercent}%`, '--end': `${endPercent}%` } as React.CSSProperties}>
      <div className="time-track" />
      <input
        type="range"
        min={min}
        max={max - step}
        step={step}
        value={start}
        aria-label={language === 'zh' ? '拖动设置开始时间' : 'Drag to set start time'}
        aria-valuetext={timeFromMinutes(start)}
        onChange={event => {
          const nextStart = Math.min(Number(event.target.value), end - step)
          onChange(timeFromMinutes(nextStart), timeFromMinutes(end))
        }}
      />
      <input
        type="range"
        min={step}
        max={max}
        step={step}
        value={end}
        aria-label={language === 'zh' ? '拖动设置结束时间' : 'Drag to set end time'}
        aria-valuetext={timeFromMinutes(end)}
        onChange={event => {
          const nextEnd = Math.max(Number(event.target.value), start + step)
          onChange(timeFromMinutes(start), timeFromMinutes(nextEnd))
        }}
      />
    </div>
    <div className="time-ticks" aria-hidden="true"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
    <p className="time-picker-hint">{language === 'zh' ? '拖动两个圆点调整时间，每次 10 分钟。' : 'Drag either handle to adjust in 10-minute steps.'}</p>
  </section>
}

function ModuleModal({ open, template, data, language, onClose, onSave }: {
  open: boolean
  template?: BlockTemplate
  data: PlannerData
  language: 'zh' | 'en'
  onClose: () => void
  onSave: (value: { title: string; durationMinutes: number; categoryId: string }) => void
}) {
  const [title, setTitle] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(45)
  const [categoryId, setCategoryId] = useState('study')
  useEffect(() => {
    if (open) { setTitle(template?.title ?? ''); setDurationMinutes(template?.durationMinutes ?? 45); setCategoryId(template?.categoryId ?? 'study') }
  }, [open, template])
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={event => event.currentTarget === event.target && onClose()}>
    <form className="modal module-modal" onSubmit={event => { event.preventDefault(); if (title.trim()) onSave({ title: title.trim(), durationMinutes, categoryId }) }}>
      <header><div><span className="eyebrow">{language === 'zh' ? '模块库' : 'Module library'}</span><h2>{template ? (language === 'zh' ? '修改事项模块' : 'Edit task module') : (language === 'zh' ? '创建一个事项模块' : 'Create a task module')}</h2></div><button type="button" className="ghost icon" onClick={onClose}><X /></button></header>
      <p className="module-modal-intro">{language === 'zh' ? '这里只定义事项和持续时间。具体日期与开始时间在拖入时间轴时决定。' : 'Define the task and its duration here. Choose the date and start time when you place it on the timeline.'}</p>
      <label>{language === 'zh' ? '模块名称' : 'Module name'}<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder={language === 'zh' ? '例如：阅读、健身、复习' : 'e.g. Reading, workout, review'} required /></label>
      <div className="form-row"><label>{language === 'zh' ? '持续时间' : 'Duration'}<select value={durationMinutes} onChange={event => setDurationMinutes(Number(event.target.value))}>{[15, 30, 45, 60, 90, 120, 180, 240].map(value => <option value={value} key={value}>{formatDuration(value)}</option>)}</select></label><label>{language === 'zh' ? '分类' : 'Category'}<select value={categoryId} onChange={event => setCategoryId(event.target.value)}>{data.categories.map(category => <option value={category.id} key={category.id}>{language === 'zh' ? category.name : category.nameEn}</option>)}</select></label></div>
      <footer><button type="button" className="secondary" onClick={onClose}>{language === 'zh' ? '取消' : 'Cancel'}</button><button className="primary" type="submit">{template ? <Pencil /> : <CirclePlus />}{template ? (language === 'zh' ? '保存修改' : 'Save changes') : (language === 'zh' ? '加入模块库' : 'Add to library')}</button></footer>
    </form>
  </div>
}

function BlockModal({ open, block, date, data, language, onClose, onSave }: { open: boolean; block?: TimeBlock; date: string; data: PlannerData; language: 'zh' | 'en'; onClose: () => void; onSave: (block: TimeBlock) => void }) {
  const [form, setForm] = useState<Partial<TimeBlock>>({})
  useEffect(() => setForm(block ?? { date, startTime: '09:00', endTime: '10:00', categoryId: 'study', priority: 'medium', status: 'pending', isFixed: false, canMove: true, canSplit: true, canBeOverridden: true }), [open, block, date])
  if (!open) return null
  const category = data.categories.find(item => item.id === form.categoryId) ?? data.categories[0]
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title?.trim() || !form.date || !form.startTime || !form.endTime || form.endTime <= form.startTime) return
    const timestamp = new Date().toISOString()
    onSave({ id: block?.id ?? crypto.randomUUID(), title: form.title.trim(), titleEn: form.titleEn?.trim(), date: form.date, startTime: form.startTime, endTime: form.endTime, categoryId: category.id, color: category.color, priority: form.priority ?? 'medium', note: form.note?.trim(), status: block?.status ?? 'pending', isFixed: !!form.isFixed, canMove: form.canMove !== false, canSplit: form.canSplit !== false, canBeOverridden: form.canBeOverridden !== false, templateId: block?.templateId, createdAt: block?.createdAt ?? timestamp, updatedAt: timestamp })
  }
  const patch = (value: Partial<TimeBlock>) => setForm(current => ({ ...current, ...value }))
  return <div className="modal-backdrop" onMouseDown={event => event.currentTarget === event.target && onClose()}>
    <form className="modal" onSubmit={submit}><header><div><span className="eyebrow">{block ? (language === 'zh' ? '编辑时间模块' : 'Edit time block') : (language === 'zh' ? '新建时间模块' : 'New time block')}</span><h2>{language === 'zh' ? '安排一段专注时间' : 'Plan a focused block'}</h2></div><button type="button" className="ghost icon" onClick={onClose}><X /></button></header>
      <label>{language === 'zh' ? '名称' : 'Title'}<input autoFocus value={form.title ?? ''} onChange={event => patch({ title: event.target.value })} required /></label>
      <div className="form-row"><label>{language === 'zh' ? '日期' : 'Date'}<input type="date" value={form.date ?? date} onChange={event => patch({ date: event.target.value })} /></label><label>{language === 'zh' ? '分类' : 'Category'}<select value={form.categoryId} onChange={event => patch({ categoryId: event.target.value })}>{data.categories.map(item => <option key={item.id} value={item.id}>{language === 'en' ? item.nameEn : item.name}</option>)}</select></label></div>
      <TimeRangePicker startTime={form.startTime ?? '09:00'} endTime={form.endTime ?? '10:00'} language={language} onChange={(startTime, endTime) => patch({ startTime, endTime })} />
      <label>{language === 'zh' ? '备注' : 'Note'}<textarea rows={3} value={form.note ?? ''} onChange={event => patch({ note: event.target.value })} /></label>
      <label>{language === 'zh' ? '优先级' : 'Priority'}<select value={form.priority} onChange={event => patch({ priority: event.target.value as TimeBlock['priority'] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
      {form.startTime && form.endTime && form.endTime <= form.startTime && <p className="form-error">{language === 'zh' ? '结束时间必须晚于开始时间。' : 'End time must be later than start time.'}</p>}
      <footer><button type="button" className="secondary" onClick={onClose}>{language === 'zh' ? '取消' : 'Cancel'}</button><button className="primary" type="submit">{language === 'zh' ? '保存模块' : 'Save block'}</button></footer>
    </form>
  </div>
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return <div className="empty"><span><Sun /></span><h3>{title}</h3><p>{hint}</p></div>
}
