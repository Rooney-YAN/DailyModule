import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Flag, Gauge, SlidersHorizontal, X } from 'lucide-react'
import type { PlannerData, Track, WeeklyMode, WeeklyPlan } from '../types'
import { createWeeklyPlan, effectiveFloor, flexSummary, trackProgress, weekBlocks, weekKey } from '../lib/weekly'

const modeLabels: Record<WeeklyMode, { zh: string; en: string }> = {
  normal: { zh: '正常', en: 'Normal' }, busy: { zh: '忙碌', en: 'Busy' }, crunch: { zh: '冲刺', en: 'Crunch' }, deload: { zh: '减载', en: 'Deload' },
}
const hours = (minutes: number) => `${Math.round(minutes / 6) / 10}h`

export default function WeeklyDashboard({ data, setData, selectedDate, language, reviewRequested = false, onReviewOpened }: {
  data: PlannerData
  setData: React.Dispatch<React.SetStateAction<PlannerData>>
  selectedDate: string
  language: 'zh' | 'en'
  reviewRequested?: boolean
  onReviewOpened?: () => void
}) {
  const start = weekKey(selectedDate)
  const fallbackPlan = createWeeklyPlan(start, 'normal', data.settings.modeFloorMultipliers.normal)
  const plan = data.weeklyPlans[start] ?? fallbackPlan
  const blocks = useMemo(() => weekBlocks(data.timeBlocks, start), [data.timeBlocks, start])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  useEffect(() => {
    if (reviewRequested) { setReviewOpen(true); onReviewOpened?.() }
  }, [reviewRequested, onReviewOpened])
  const flex = flexSummary(plan)
  const base = data.tracks.reduce((sum, track) => sum + effectiveFloor(track, plan), 0)

  const patchPlan = (patch: Partial<WeeklyPlan>) => setData(current => ({
    ...current,
    weeklyPlans: { ...current.weeklyPlans, [start]: { ...(current.weeklyPlans[start] ?? fallbackPlan), ...patch } },
  }))
  const patchTrack = (id: string, patch: Partial<Track>) => setData(current => ({
    ...current, tracks: current.tracks.map(track => track.id === id ? { ...track, ...patch } : track),
  }))
  const setMode = (mode: WeeklyMode) => {
    const multiplier = data.settings.modeFloorMultipliers[mode]
    const apply = window.confirm(language === 'zh'
      ? `切换为“${modeLabels[mode].zh}”模式。是否将本周 Floor 系数设为 ${Math.round(multiplier * 100)}%？不会改动已安排模块。`
      : `Switch to ${modeLabels[mode].en}. Apply the recommended ${Math.round(multiplier * 100)}% Floor multiplier? Existing blocks will not change.`)
    patchPlan(apply ? { mode, floorMultiplier: multiplier } : { mode })
  }
  const outcomes = plan.topOutcomes.length === 3 ? plan.topOutcomes : [...plan.topOutcomes, '', '', ''].slice(0, 3)

  return <section className="weekly-dashboard">
    <div className="weekly-dashboard-head">
      <div><span className="eyebrow">{language === 'zh' ? '周执行面板' : 'Weekly execution'}</span><h1>{language === 'zh' ? '守住底线，灵活投入' : 'Protect the floor, direct the flex'}</h1></div>
      <div className="weekly-head-actions">
        <label className={`mode-badge mode-${plan.mode}`}><Gauge /><select value={plan.mode} onChange={event => setMode(event.target.value as WeeklyMode)}>{(Object.keys(modeLabels) as WeeklyMode[]).map(mode => <option value={mode} key={mode}>{modeLabels[mode][language]}</option>)}</select></label>
        <button className="primary" onClick={() => setReviewOpen(true)}>{plan.reviewCompletedAt ? <Check /> : <Flag />}{language === 'zh' ? (plan.reviewCompletedAt ? '已规划' : '5 分钟周规划') : (plan.reviewCompletedAt ? 'Planned' : '5-min review')}</button>
      </div>
    </div>

    <div className="weekly-summary-strip">
      <div><span>{language === 'zh' ? '基础 Floor' : 'Base floor'}</span><strong>{hours(base)}</strong></div>
      <div><span>{language === 'zh' ? 'Flex 已分配' : 'Flex allocated'}</span><strong>{hours(flex.allocated)} / {hours(plan.flexBudgetMinutes)}</strong></div>
      <div className={flex.remaining < 0 ? 'negative' : ''}><span>{language === 'zh' ? 'Flex 剩余' : 'Flex remaining'}</span><strong>{hours(flex.remaining)}</strong></div>
      <div><span>{language === 'zh' ? '周中检查' : 'Midweek check'}</span><button className="text-action" onClick={() => patchPlan({ midweekCheckedAt: plan.midweekCheckedAt ? undefined : new Date().toISOString() })}>{plan.midweekCheckedAt ? `✓ ${language === 'zh' ? '已完成' : 'Done'}` : language === 'zh' ? '待完成' : 'Not done'}</button></div>
    </div>

    <div className="weekly-dashboard-grid">
      <div className="weekly-panel floor-panel"><header><div><span className="eyebrow">Weekly Floor / Target</span><h2>{language === 'zh' ? '目标投入' : 'Goal progress'}</h2></div><button className="secondary compact-button" onClick={() => setGoalsOpen(current => !current)}><SlidersHorizontal />{language === 'zh' ? '设置' : 'Edit'}<ChevronDown /></button></header>
        <div className="track-progress-list">{data.tracks.map(track => {
          const progress = trackProgress(track, plan, blocks)
          const denominator = Math.max(progress.target, progress.floor, 1)
          return <div className={`track-progress ${progress.targetReached ? 'target-reached' : progress.floorReached ? 'floor-reached' : ''}`} key={track.id}>
            <div className="track-progress-title"><i style={{ background: track.color }} /><b>{language === 'zh' ? track.name : track.nameEn}</b><span>{track.kind === 'infrastructure' ? (language === 'zh' ? '基础设施' : 'Infrastructure') : ''}</span>{track.important && <em>I</em>}{track.urgent && <em className="urgent">U</em>}</div>
            <div className="track-bars"><span style={{ width: `${Math.min(100, progress.completed / denominator * 100)}%`, background: track.color }} /></div>
            <small>{hours(progress.completed)} / {hours(progress.floor)} Floor　·　{hours(progress.completed)} / {hours(progress.target)} Target　·　{language === 'zh' ? '计划' : 'planned'} {hours(progress.planned)}</small>
          </div>
        })}</div>
      </div>

      <div className="weekly-panel outcomes-panel"><span className="eyebrow">Top outcomes</span><h2>{language === 'zh' ? '本周最重要的结果' : 'Most important outcomes'}</h2>
        <ol>{outcomes.map((outcome, index) => <li key={index}>{outcome || (language === 'zh' ? `结果 ${index + 1} 尚未填写` : `Outcome ${index + 1} not set`)}</li>)}</ol>
        <div className="focus-readout"><span>{language === 'zh' ? '主攻' : 'Primary'}</span><b>{data.tracks.find(track => track.id === plan.primaryFocusTrackId)?.[language === 'zh' ? 'name' : 'nameEn'] ?? '—'}</b><span>{language === 'zh' ? '副线' : 'Secondary'}</span><b>{data.tracks.find(track => track.id === plan.secondaryFocusTrackId)?.[language === 'zh' ? 'name' : 'nameEn'] ?? '—'}</b></div>
      </div>
    </div>

    <div className="flex-panel"><div><span className="eyebrow">Flex Pool</span><h2>{language === 'zh' ? '把弹性时间投向本周机会' : 'Direct time toward this week’s opportunities'}</h2></div><label>{language === 'zh' ? '预算（小时）' : 'Budget (hours)'}<input type="number" min="0" step="0.5" value={plan.flexBudgetMinutes / 60} onChange={event => patchPlan({ flexBudgetMinutes: Math.max(0, Number(event.target.value) * 60) })} /></label><div className="flex-allocations">{data.tracks.filter(track => track.kind === 'goal').map(track => <label key={track.id}><span><i style={{ background: track.color }} />{language === 'zh' ? track.name : track.nameEn}</span><input type="number" min="0" step="0.5" value={(plan.flexAllocations[track.id] ?? 0) / 60} onChange={event => patchPlan({ flexAllocations: { ...plan.flexAllocations, [track.id]: Math.max(0, Number(event.target.value) * 60) } })} /><small>h</small></label>)}</div></div>

    {goalsOpen && <div className="track-editor"><header><div><span className="eyebrow">Tracks</span><h2>{language === 'zh' ? '每周底线与目标' : 'Weekly floors and targets'}</h2></div><button className="ghost icon" onClick={() => setGoalsOpen(false)}><X /></button></header>{data.tracks.map(track => <div className="track-editor-row" key={track.id}><div><i style={{ background: track.color }} /><b>{language === 'zh' ? track.name : track.nameEn}</b></div><label>Floor <input type="number" min="0" step="0.5" value={track.weeklyFloorMinutes / 60} onChange={event => patchTrack(track.id, { weeklyFloorMinutes: Math.max(0, Number(event.target.value) * 60) })} /> h</label><label>Target <input type="number" min="0" step="0.5" value={track.weeklyTargetMinutes / 60} onChange={event => patchTrack(track.id, { weeklyTargetMinutes: Math.max(0, Number(event.target.value) * 60) })} /> h</label><label className="flag-check"><input type="checkbox" checked={track.important} onChange={event => patchTrack(track.id, { important: event.target.checked })} /> Important</label><label className="flag-check"><input type="checkbox" checked={track.urgent} onChange={event => patchTrack(track.id, { urgent: event.target.checked })} /> Urgent</label></div>)}</div>}

    {reviewOpen && <div className="modal-backdrop" onMouseDown={event => event.currentTarget === event.target && setReviewOpen(false)}><form className="modal weekly-review" onSubmit={event => { event.preventDefault(); patchPlan({ reviewCompletedAt: new Date().toISOString() }); setReviewOpen(false) }}><header><div><span className="eyebrow">Weekly planning</span><h2>{language === 'zh' ? '5 分钟确定本周打法' : 'Set the week in five minutes'}</h2></div><button type="button" className="ghost icon" onClick={() => setReviewOpen(false)}><X /></button></header>
      <fieldset><legend>{language === 'zh' ? '最重要的 3 个结果' : 'Top 3 outcomes'}</legend>{outcomes.map((outcome, index) => <input key={index} value={outcome} onChange={event => { const next = [...outcomes]; next[index] = event.target.value; patchPlan({ topOutcomes: next }) }} placeholder={`${index + 1}`} />)}</fieldset>
      <div className="form-row"><label>{language === 'zh' ? '本周运行模式' : 'Weekly mode'}<select value={plan.mode} onChange={event => setMode(event.target.value as WeeklyMode)}>{(Object.keys(modeLabels) as WeeklyMode[]).map(mode => <option value={mode} key={mode}>{modeLabels[mode][language]}</option>)}</select></label><label>{language === 'zh' ? 'Flex 预算（小时）' : 'Flex budget (hours)'}<input type="number" min="0" step="0.5" value={plan.flexBudgetMinutes / 60} onChange={event => patchPlan({ flexBudgetMinutes: Math.max(0, Number(event.target.value) * 60) })} /></label></div>
      <fieldset><legend>{language === 'zh' ? 'Flex 分配（小时）' : 'Flex allocation (hours)'}</legend><div className="review-flex-grid">{data.tracks.filter(track => track.kind === 'goal').map(track => <label key={track.id}>{language === 'zh' ? track.name : track.nameEn}<input type="number" min="0" step="0.5" value={(plan.flexAllocations[track.id] ?? 0) / 60} onChange={event => patchPlan({ flexAllocations: { ...plan.flexAllocations, [track.id]: Math.max(0, Number(event.target.value) * 60) } })} /></label>)}</div></fieldset>
      <label>{language === 'zh' ? '课程 Deadline / Exam' : 'Course deadlines / exams'}<textarea rows={2} value={plan.courseDeadlines} onChange={event => patchPlan({ courseDeadlines: event.target.value })} /></label>
      <div className="form-row"><label>IELTS {language === 'zh' ? '本周重点' : 'focus'}<textarea rows={2} value={plan.ieltsFocus} onChange={event => patchPlan({ ieltsFocus: event.target.value })} /></label><label>UROP {language === 'zh' ? '具体产出' : 'concrete output'}<textarea rows={2} value={plan.uropOutput} onChange={event => patchPlan({ uropOutput: event.target.value })} /></label></div>
      <div className="form-row"><label>{language === 'zh' ? '主攻 Track' : 'Primary focus'}<select value={plan.primaryFocusTrackId ?? ''} onChange={event => patchPlan({ primaryFocusTrackId: event.target.value || undefined })}><option value="">—</option>{data.tracks.map(track => <option value={track.id} key={track.id}>{language === 'zh' ? track.name : track.nameEn}</option>)}</select></label><label>{language === 'zh' ? '副线 Track（可选）' : 'Secondary focus (optional)'}<select value={plan.secondaryFocusTrackId ?? ''} onChange={event => patchPlan({ secondaryFocusTrackId: event.target.value || undefined })}><option value="">—</option>{data.tracks.map(track => <option value={track.id} key={track.id}>{language === 'zh' ? track.name : track.nameEn}</option>)}</select></label></div>
      <footer><button type="button" className="secondary" onClick={() => setReviewOpen(false)}>{language === 'zh' ? '稍后继续' : 'Continue later'}</button><button className="primary"><Check />{language === 'zh' ? '完成本周规划' : 'Complete review'}</button></footer>
    </form></div>}
  </section>
}
