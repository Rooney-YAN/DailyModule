import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultData, loadData, migratePlannerData, resetData, saveData } from '../src/lib/storage.ts'
import { createWeeklyPlan } from '../src/lib/weekly.ts'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
  clear() { this.values.clear() }
}

const storage = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })

test('fresh storage initializes an empty workspace with exactly six default presets', () => {
  storage.clear()
  const data = loadData()
  const plan = createWeeklyPlan('2026-09-14')

  assert.deepEqual(data.timeBlocks, [])
  assert.deepEqual(data.dailyMemos, {})
  assert.deepEqual(data.weeklyPlans, {})
  assert.deepEqual(plan.topOutcomes, [])
  assert.deepEqual(plan.commitments, [])
  assert.deepEqual(plan.flexAllocations, {})
  assert.deepEqual(plan.floorOverrides, {})
  assert.equal(plan.primaryFocusTrackId, undefined)
  assert.equal(plan.capacityOverrideMinutes, undefined)
  assert.equal(data.settings.baseWeeklyCapacityMinutes, 2100)
  assert.deepEqual(data.tracks.filter(track => ['courses', 'ielts', 'urop', 'cuda', 'stocklens'].includes(track.id)).map(track => track.weeklyFloorMinutes), [480, 300, 300, 180, 120])
  assert.deepEqual(data.blockTemplates.map(template => template.titleEn), ['Courses', 'IELTS', 'UROP', 'CUDA', 'StockLens', 'Gym'])
  assert.deepEqual(data.blockTemplates.map(template => template.countsTowardWeeklyCapacity), [true, true, true, true, true, false])
})

test('new-user initialization contains no demo or example content', () => {
  const serialized = JSON.stringify(createDefaultData()).toLowerCase()
  for (const marker of ['demo-', 'morning workout', 'cuda project', 'dinner with friends', 'valorant', 'free time', 'ai project']) {
    assert.equal(serialized.includes(marker), false, marker)
  }
})

test('reset clears user data and restores the empty defaults', () => {
  const populated = createDefaultData()
  populated.timeBlocks.push({
    id: 'user-block', title: 'Real work', date: '2026-09-14', startTime: '10:00', endTime: '11:00', categoryId: 'study', color: '#000',
    priority: 'medium', status: 'pending', isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, trackId: 'urop',
    countsTowardWeeklyCapacity: true, createdAt: '', updatedAt: '',
  })
  populated.weeklyPlans['2026-09-14'] = { ...createWeeklyPlan('2026-09-14'), flexAllocations: { urop: 120 }, primaryFocusTrackId: 'urop' }
  populated.calendarImports.push({ id: 'import', fileName: 'courses.ics', importedAt: '', eventCount: 1 })
  saveData(populated)

  resetData()
  const reset = loadData()
  assert.deepEqual(reset.timeBlocks, [])
  assert.deepEqual(reset.weeklyPlans, {})
  assert.deepEqual(reset.calendarImports, [])
  assert.equal(reset.settings.baseWeeklyCapacityMinutes, 2100)
  assert.equal(reset.blockTemplates.length, 6)
})

test('schema v1 migration preserves existing real blocks and weekly plans', () => {
  const legacy = {
    schemaVersion: 1,
    settings: { language: 'zh', theme: 'system', weekStartsOn: 1, defaultDayStart: '07:00', defaultDayEnd: '23:00', countLifeBlocks: false, defaultView: 'day' },
    categories: [{ id: 'study', name: '学习', nameEn: 'Study', color: '#000', countsTowardCompletion: true }],
    blockTemplates: [{ id: 'old-template', title: 'IELTS 阅读', titleEn: 'IELTS Reading', durationMinutes: 60, categoryId: 'study', color: '#000', icon: '', priority: 'medium', isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, isBuiltIn: false, isHidden: false }],
    timeBlocks: [
      { id: 'old-block', title: 'IELTS 阅读', date: '2026-09-11', startTime: '10:00', endTime: '11:00', categoryId: 'study', color: '#000', priority: 'medium', status: 'completed', isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, createdAt: '', updatedAt: '' },
      { id: 'demo-1', title: '晨间健身', date: '2026-09-11', startTime: '07:30', endTime: '08:30', categoryId: 'health', color: '#000', priority: 'medium', status: 'completed', isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, createdAt: '', updatedAt: '' },
    ],
    summerPhases: [],
    weeklyPlans: { '2026-09-07': { ...createWeeklyPlan('2026-09-07'), topOutcomes: ['真实目标'], flexAllocations: { ielts: 60 } } },
  }
  const migrated = migratePlannerData(legacy)
  assert.equal(migrated.schemaVersion, 5)
  assert.deepEqual(migrated.dailyMemos, {})
  assert.equal(migrated.timeBlocks.length, 1)
  assert.equal(migrated.timeBlocks[0].id, 'old-block')
  assert.equal(migrated.timeBlocks[0].trackId, 'ielts')
  assert.equal(migrated.timeBlocks[0].completedMinutes, 60)
  assert.deepEqual(migrated.weeklyPlans['2026-09-07'].topOutcomes, ['真实目标'])
  assert.equal(migrated.weeklyPlans['2026-09-07'].flexAllocations.ielts, 60)
  assert.equal(migrated.settings.baseWeeklyCapacityMinutes, 2100)
  assert.ok(migrated.tracks.length >= 8)
})

test('legacy built-ins are replaced while custom templates are preserved', () => {
  const legacyTemplate = (id: string, title: string, isBuiltIn: boolean) => ({
    id, title, titleEn: title, durationMinutes: 60, categoryId: 'study', color: '#000', icon: '', priority: 'medium',
    isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, isBuiltIn, isHidden: false,
  })
  const legacy = {
    schemaVersion: 3,
    settings: createDefaultData().settings,
    categories: createDefaultData().categories,
    blockTemplates: [
      ...Array.from({ length: 15 }, (_, index) => legacyTemplate(`tpl-${index + 1}`, `Old built-in ${index + 1}`, true)),
      legacyTemplate('custom-1', 'My Review', false),
      legacyTemplate('custom-2', 'My Research', false),
      legacyTemplate('ics-template-old', 'COMP 2012 (L3)', false),
    ],
    timeBlocks: [],
    summerPhases: [],
    tracks: createDefaultData().tracks,
    weeklyPlans: {},
    calendarImports: [],
  }
  const migrated = migratePlannerData(legacy)
  const builtIns = migrated.blockTemplates.filter(template => template.isBuiltIn)
  const customs = migrated.blockTemplates.filter(template => !template.isBuiltIn)

  assert.equal(migrated.schemaVersion, 5)
  assert.deepEqual(builtIns.map(template => template.titleEn), ['Courses', 'IELTS', 'UROP', 'CUDA', 'StockLens', 'Gym'])
  assert.deepEqual(customs.map(template => template.id), ['custom-1', 'custom-2'])
  assert.equal(migrated.blockTemplates.some(template => template.title.startsWith('Old built-in')), false)
})

test('migration preserves existing Base Floors and supplies new defaults only when a track is missing', () => {
  const legacy = createDefaultData()
  legacy.tracks = legacy.tracks.filter(track => track.id !== 'cuda').map(track => track.id === 'courses' ? { ...track, weeklyFloorMinutes: 360, weeklyTargetMinutes: 360 } : track)
  const migrated = migratePlannerData(legacy)
  assert.equal(migrated.tracks.find(track => track.id === 'courses')?.weeklyFloorMinutes, 360)
  assert.equal(migrated.tracks.find(track => track.id === 'cuda')?.weeklyFloorMinutes, 180)
})

test('pre-v3 migration does not overwrite a user-customized Base Floor', () => {
  const legacy = { ...createDefaultData(), schemaVersion: 1 }
  legacy.tracks = legacy.tracks.map(track => track.id === 'courses' ? { ...track, weeklyFloorMinutes: 360, weeklyTargetMinutes: 360 } : track)
  const migrated = migratePlannerData(legacy)
  assert.equal(migrated.tracks.find(track => track.id === 'courses')?.weeklyFloorMinutes, 360)
})
