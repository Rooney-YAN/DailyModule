import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight, CirclePlus, Clock3,
  Copy, Download, Eye, FileUp, Focus, Languages, Maximize2, Moon, Pencil, RotateCcw,
  Settings as SettingsIcon, Sun, Trash2, X,
} from 'lucide-react'
import { addDays, addMonths, format, isSameMonth, parseISO, subMonths } from 'date-fns'
import type { BlockTemplate, PlannerData, TimeBlock, View } from './types'
import { createDefaultData, isPlannerData, loadData, resetData, saveData } from './lib/storage'
import { dateLabel, duration, iso, monthDays, monthLabel, weekDays } from './lib/dates'

const text = {
  zh: {
    month: '月', week: '周', day: '日', now: '现在', templates: '模板', settings: '设置',
    viewMode: '阅览模式', editMode: '编辑模式', today: '今天', add: '新建模块',
    focus: '今日重点', planned: '计划时长', completed: '已完成', progress: '今日进度',
    empty: '这一天还没有安排', emptyHint: '留白也是计划的一部分。需要时再添加。',
    current: '当前模块', next: '下一模块', free: '当前为空闲时间', remaining: '剩余',
    done: '完成', skip: '跳过', pending: '待完成', conflict: '发生冲突',
    export: '导出 JSON 备份', import: '导入 JSON 备份', reset: '恢复示例数据',
    language: '界面语言', appearance: '外观', system: '跟随系统', light: '浅色', dark: '深色',
    local: '数据仅保存在当前浏览器', save: '已自动保存', templateHint: '点击模板，快速添加到当前选中的日期。',
  },
  en: {
    month: 'Month', week: 'Week', day: 'Day', now: 'Now', templates: 'Templates', settings: 'Settings',
    viewMode: 'View mode', editMode: 'Edit mode', today: 'Today', add: 'New block',
    focus: 'Today’s focus', planned: 'Planned', completed: 'Completed', progress: 'Today’s progress',
    empty: 'Nothing planned for this day', emptyHint: 'Open space is part of a good plan. Add something when you need it.',
    current: 'Current block', next: 'Up next', free: 'You have free time right now', remaining: 'remaining',
    done: 'Done', skip: 'Skip', pending: 'Pending', conflict: 'Conflict',
    export: 'Export JSON backup', import: 'Import JSON backup', reset: 'Restore sample data',
    language: 'Language', appearance: 'Appearance', system: 'System', light: 'Light', dark: 'Dark',
    local: 'Data stays in this browser only', save: 'Saved automatically', templateHint: 'Click a template to add it to the selected day.',
  },
} as const

const nav: Array<[View, typeof CalendarDays]> = [
  ['month', CalendarDays], ['week', CalendarRange], ['day', CalendarDays],
  ['now', Focus], ['templates', Copy], ['settings', SettingsIcon],
]

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
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
  const addFromTemplate = (template: BlockTemplate) => {
    const start = data.settings.defaultDayStart
    const endMinutes = timeToMinutes(start) + template.durationMinutes
    const end = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
    const now = new Date().toISOString()
    saveBlock({
      id: crypto.randomUUID(), title: template.title, titleEn: template.titleEn, date: selectedDate, startTime: start, endTime: end,
      categoryId: template.categoryId, color: template.color, icon: template.icon, priority: template.priority, status: 'pending',
      isFixed: template.isFixed, canMove: template.canMove, canSplit: template.canSplit, canBeOverridden: template.canBeOverridden,
      isBuffer: template.isBuffer, templateId: template.id, createdAt: now, updatedAt: now,
    })
    setNotice(language === 'zh' ? `已添加“${template.title}”` : `Added “${template.titleEn}”`)
    window.setTimeout(() => setNotice(''), 1800)
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `summer-planner-${iso(new Date())}.json`; link.click()
    URL.revokeObjectURL(url)
  }
  const importData = async (file?: File) => {
    if (!file) return
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isPlannerData(parsed)) throw new Error('invalid')
      if (window.confirm(language === 'zh' ? '导入会覆盖当前数据，确定继续吗？' : 'Importing replaces current data. Continue?')) setData(parsed)
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
      <button className="brand" onClick={() => setView('now')}><span className="brand-mark"><Sun /></span><span><b>夏日计划</b><small>Summer Planner</small></span></button>
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
        {view === 'day' && <DayView {...{ data, selectedDate, language, t, editMode, conflicts, updateBlock, removeBlock, setModal }} />}
        {view === 'now' && <NowView {...{ data, selectedDate, language, t, updateBlock }} />}
        {view === 'week' && <WeekView {...{ data, selectedDate, language, t, conflicts, setSelectedDate, setView }} />}
        {view === 'month' && <MonthView {...{ data, selectedDate, language, conflicts, setSelectedDate, setView }} />}
        {view === 'templates' && <TemplatesView data={data} language={language} t={t} addFromTemplate={addFromTemplate} />}
        {view === 'settings' && <SettingsView {...{ data, setData, t, exportData, importRef, restore }} />}
      </div>
    </main>

    {editMode && !['templates', 'settings'].includes(view) && <button className="floating-add" onClick={() => setModal({ open: true })}><CirclePlus />{t.add}</button>}
    <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={event => { void importData(event.target.files?.[0]); event.target.value = '' }} />
    <BlockModal open={modal.open} block={modal.block} date={selectedDate} data={data} language={language} onClose={() => setModal({ open: false })} onSave={saveBlock} />
    {notice && <div className="toast">{notice}</div>}
  </div>
}

type SharedProps = {
  data: PlannerData
  selectedDate: string
  language: 'zh' | 'en'
  t: typeof text.zh | typeof text.en
}

function DayView({ data, selectedDate, language, t, editMode, conflicts, updateBlock, removeBlock, setModal }: SharedProps & {
  editMode: boolean; conflicts: Set<string>; updateBlock: (id: string, patch: Partial<TimeBlock>) => void
  removeBlock: (id: string) => void; setModal: (value: { open: boolean; block?: TimeBlock }) => void
}) {
  const blocks = data.timeBlocks.filter(block => block.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const core = blocks.filter(block => !block.isBuffer && data.categories.find(category => category.id === block.categoryId)?.countsTowardCompletion)
  const completed = core.filter(block => block.status === 'completed').length
  const minutes = blocks.reduce((sum, block) => sum + duration(block.startTime, block.endTime), 0)
  return <>
    <section className="hero-row">
      <div><span className="eyebrow">{dateLabel(selectedDate, language)}</span><h1>{language === 'zh' ? '把今天过得清楚一点。' : 'Make today feel clear.'}</h1><p>{language === 'zh' ? '专注当下，也为变化留一点空间。' : 'Focus on what matters, with room for change.'}</p></div>
      <div className="summary-card"><div><span>{t.planned}</span><strong>{Math.floor(minutes / 60)}h {minutes % 60}m</strong></div><div><span>{t.progress}</span><strong>{core.length ? Math.round(completed / core.length * 100) : 0}%</strong></div></div>
    </section>
    <section className="focus-strip"><div><span className="eyebrow">{t.focus}</span><div className="focus-items">{blocks.filter(block => block.priority === 'high').slice(0, 3).map(block => <span key={block.id}><i style={{ background: block.color }} />{language === 'en' && block.titleEn ? block.titleEn : block.title}</span>)}</div></div><div className="progress-ring" style={{ '--progress': `${core.length ? completed / core.length * 360 : 0}deg` } as React.CSSProperties}><span>{completed}/{core.length}</span></div></section>
    <section className="section-head"><div><span className="eyebrow">{language === 'zh' ? '时间线' : 'Timeline'}</span><h2>{t.day}</h2></div>{conflicts.size > 0 && <span className="conflict-pill">{conflicts.size} {t.conflict}</span>}</section>
    <div className="timeline">
      {blocks.length === 0 && <Empty title={t.empty} hint={t.emptyHint} />}
      {blocks.map(block => <BlockCard key={block.id} block={block} language={language} editMode={editMode} conflict={conflicts.has(block.id)}
        onDone={() => updateBlock(block.id, { status: block.status === 'completed' ? 'pending' : 'completed' })}
        onSkip={() => updateBlock(block.id, { status: block.status === 'skipped' ? 'pending' : 'skipped' })}
        onEdit={() => setModal({ open: true, block })} onDelete={() => removeBlock(block.id)} />)}
    </div>
  </>
}

function NowView({ data, selectedDate, language, t, updateBlock }: SharedProps & { updateBlock: (id: string, patch: Partial<TimeBlock>) => void }) {
  const blocks = data.timeBlocks.filter(block => block.date === selectedDate && block.status === 'pending').sort((a, b) => a.startTime.localeCompare(b.startTime))
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const current = selectedDate === iso(now) ? blocks.find(block => timeToMinutes(block.startTime) <= nowMinutes && timeToMinutes(block.endTime) > nowMinutes) : blocks[0]
  const next = blocks.find(block => !current || timeToMinutes(block.startTime) > timeToMinutes(current.endTime))
  const remaining = current ? Math.max(0, timeToMinutes(current.endTime) - nowMinutes) : 0
  return <div className="now-layout">
    <section className="now-main">
      <div className="now-top"><span className="eyebrow">{t.current}</span><button className="ghost icon" onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Fullscreen"><Maximize2 /></button></div>
      {current ? <>
        <span className="now-time">{current.startTime} — {current.endTime}</span>
        <h1>{language === 'en' && current.titleEn ? current.titleEn : current.title}</h1>
        <div className="countdown"><strong>{remaining}</strong><span>{language === 'zh' ? '分钟' : 'min'}<br />{t.remaining}</span></div>
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
  const buffers = weekBlocks.filter(block => block.isBuffer).reduce((sum, block) => sum + duration(block.startTime, block.endTime), 0)
  return <>
    <section className="page-title"><span className="eyebrow">{t.week}</span><h1>{language === 'zh' ? '本周的节奏' : 'Your week at a glance'}</h1><p>{Math.round(planned / 60)}h {language === 'zh' ? '已计划' : 'planned'} · {Math.round(buffers / 60 * 10) / 10}h {language === 'zh' ? '缓冲' : 'buffer'}</p></section>
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
    <section className="month-head"><div><span className="eyebrow">{language === 'zh' ? '暑假全景' : 'Summer overview'}</span><h1>{monthLabel(month, language)}</h1></div><div><button className="ghost icon" onClick={() => setMonth(iso(subMonths(parseISO(month), 1)))}><ChevronLeft /></button><button className="ghost icon" onClick={() => setMonth(iso(addMonths(parseISO(month), 1)))}><ChevronRight /></button></div></section>
    <div className="calendar-grid calendar-labels">{(language === 'zh' ? ['一','二','三','四','五','六','日'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']).map(label => <span key={label}>{label}</span>)}</div>
    <div className="calendar-grid">{monthDays(month).map(day => {
      const date = iso(day); const blocks = data.timeBlocks.filter(block => block.date === date); const completed = blocks.filter(block => block.status === 'completed').length
      return <button key={date} className={`calendar-day ${!isSameMonth(day, parseISO(month)) ? 'outside' : ''} ${date === iso(new Date()) ? 'today-cell' : ''}`} onClick={() => { setSelectedDate(date); setView('day') }}>
        <span className="day-number">{format(day, 'd')}</span><div>{blocks.slice(0, 3).map(block => <span className={`calendar-block ${conflicts.has(block.id) ? 'conflicting' : ''}`} key={block.id} style={{ '--block': block.color } as React.CSSProperties}>{block.title}</span>)}</div>
        {blocks.length > 0 && <small>{completed}/{blocks.length} · {Math.round(blocks.reduce((sum, block) => sum + duration(block.startTime, block.endTime), 0) / 60 * 10) / 10}h</small>}
      </button>
    })}</div>
    <section className="roadmap"><div className="section-head"><div><span className="eyebrow">{language === 'zh' ? '暑假路线图' : 'Summer roadmap'}</span><h2>{language === 'zh' ? '阶段目标' : 'Phases'}</h2></div></div><div className="phase-list">{data.summerPhases.map((phase, index) => <div className="phase" key={phase.id}><span style={{ background: phase.color }}>{index + 1}</span><div><b>{language === 'en' ? phase.titleEn : phase.title}</b><small>{phase.startDate} — {phase.endDate}</small></div></div>)}</div></section>
  </>
}

function TemplatesView({ data, language, t, addFromTemplate }: { data: PlannerData; language: 'zh' | 'en'; t: SharedProps['t']; addFromTemplate: (template: BlockTemplate) => void }) {
  return <>
    <section className="page-title"><span className="eyebrow">{t.templates}</span><h1>{language === 'zh' ? '常用时间模块' : 'Reusable time blocks'}</h1><p>{t.templateHint}</p></section>
    <div className="template-grid">{data.blockTemplates.filter(template => !template.isHidden).map(template => <button className="template-card" onClick={() => addFromTemplate(template)} key={template.id}><span className="template-icon" style={{ background: `${template.color}22`, color: template.color }}>{template.icon}</span><div><b>{language === 'en' ? template.titleEn : template.title}</b><small><Clock3 />{template.durationMinutes} min</small></div><CirclePlus /></button>)}</div>
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

function BlockCard({ block, language, editMode, conflict, onDone, onSkip, onEdit, onDelete }: {
  block: TimeBlock; language: 'zh' | 'en'; editMode: boolean; conflict: boolean; onDone: () => void; onSkip: () => void; onEdit: () => void; onDelete: () => void
}) {
  const title = language === 'en' && block.titleEn ? block.titleEn : block.title
  return <article className={`block-card ${block.status} ${conflict ? 'conflicting' : ''} ${block.isBuffer ? 'buffer' : ''}`} style={{ '--block': block.color } as React.CSSProperties}>
    <div className="block-time"><strong>{block.startTime}</strong><span>{block.endTime}</span></div>
    <div className="block-color" />
    <div className="block-content"><div><h3>{block.icon && <span>{block.icon}</span>}{title}</h3>{block.note && <p>{block.note}</p>}</div><div className="block-meta"><span>{duration(block.startTime, block.endTime)} min</span>{block.priority === 'high' && <span>High</span>}{conflict && <span className="conflict-text">! {language === 'zh' ? '时间冲突' : 'Time conflict'}</span>}</div></div>
    <div className="block-actions"><button onClick={onDone} className={block.status === 'completed' ? 'selected' : ''} title="Complete"><Check /></button><button onClick={onSkip} className={block.status === 'skipped' ? 'selected' : ''} title="Skip">—</button>{editMode && <><button onClick={onEdit} title="Edit"><Pencil /></button><button onClick={onDelete} title="Delete"><Trash2 /></button></>}</div>
  </article>
}

function BlockModal({ open, block, date, data, language, onClose, onSave }: { open: boolean; block?: TimeBlock; date: string; data: PlannerData; language: 'zh' | 'en'; onClose: () => void; onSave: (block: TimeBlock) => void }) {
  const [form, setForm] = useState<Partial<TimeBlock>>({})
  useEffect(() => setForm(block ?? { date, startTime: '09:00', endTime: '10:00', categoryId: 'study', priority: 'medium', status: 'pending', isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, isBuffer: false }), [open, block, date])
  if (!open) return null
  const category = data.categories.find(item => item.id === form.categoryId) ?? data.categories[0]
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title?.trim() || !form.date || !form.startTime || !form.endTime || form.endTime <= form.startTime) return
    const timestamp = new Date().toISOString()
    onSave({ id: block?.id ?? crypto.randomUUID(), title: form.title.trim(), titleEn: form.titleEn?.trim(), date: form.date, startTime: form.startTime, endTime: form.endTime, categoryId: category.id, color: category.color, priority: form.priority ?? 'medium', note: form.note?.trim(), status: block?.status ?? 'pending', isFixed: !!form.isFixed, canMove: form.canMove !== false, canSplit: form.canSplit !== false, canBeOverridden: form.canBeOverridden !== false, isBuffer: !!form.isBuffer, templateId: block?.templateId, createdAt: block?.createdAt ?? timestamp, updatedAt: timestamp })
  }
  const patch = (value: Partial<TimeBlock>) => setForm(current => ({ ...current, ...value }))
  return <div className="modal-backdrop" onMouseDown={event => event.currentTarget === event.target && onClose()}>
    <form className="modal" onSubmit={submit}><header><div><span className="eyebrow">{block ? (language === 'zh' ? '编辑时间模块' : 'Edit time block') : (language === 'zh' ? '新建时间模块' : 'New time block')}</span><h2>{language === 'zh' ? '安排一段专注时间' : 'Plan a focused block'}</h2></div><button type="button" className="ghost icon" onClick={onClose}><X /></button></header>
      <label>{language === 'zh' ? '名称' : 'Title'}<input autoFocus value={form.title ?? ''} onChange={event => patch({ title: event.target.value })} required /></label>
      <div className="form-row"><label>{language === 'zh' ? '日期' : 'Date'}<input type="date" value={form.date ?? date} onChange={event => patch({ date: event.target.value })} /></label><label>{language === 'zh' ? '分类' : 'Category'}<select value={form.categoryId} onChange={event => patch({ categoryId: event.target.value })}>{data.categories.map(item => <option key={item.id} value={item.id}>{language === 'en' ? item.nameEn : item.name}</option>)}</select></label></div>
      <div className="form-row"><label>{language === 'zh' ? '开始' : 'Start'}<input type="time" value={form.startTime ?? ''} onChange={event => patch({ startTime: event.target.value })} /></label><label>{language === 'zh' ? '结束' : 'End'}<input type="time" value={form.endTime ?? ''} onChange={event => patch({ endTime: event.target.value })} /></label></div>
      <label>{language === 'zh' ? '备注' : 'Note'}<textarea rows={3} value={form.note ?? ''} onChange={event => patch({ note: event.target.value })} /></label>
      <div className="form-row"><label>{language === 'zh' ? '优先级' : 'Priority'}<select value={form.priority} onChange={event => patch({ priority: event.target.value as TimeBlock['priority'] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label className="check-label"><input type="checkbox" checked={!!form.isBuffer} onChange={event => patch({ isBuffer: event.target.checked })} />{language === 'zh' ? '缓冲时间' : 'Buffer time'}</label></div>
      {form.startTime && form.endTime && form.endTime <= form.startTime && <p className="form-error">{language === 'zh' ? '结束时间必须晚于开始时间。' : 'End time must be later than start time.'}</p>}
      <footer><button type="button" className="secondary" onClick={onClose}>{language === 'zh' ? '取消' : 'Cancel'}</button><button className="primary" type="submit">{language === 'zh' ? '保存模块' : 'Save block'}</button></footer>
    </form>
  </div>
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return <div className="empty"><span><Sun /></span><h3>{title}</h3><p>{hint}</p></div>
}
