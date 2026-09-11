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
  assert.deepEqual(data.weeklyPlans, {})
  assert.deepEqual(plan.topOutcomes, [])
  assert.deepEqual(plan.commitments, [])
  assert.deepEqual(plan.flexAllocations, {})
  assert.deepEqual(plan.floorOverrides, {})
  assert.equal(plan.primaryFocusTrackId, undefined)
  assert.equal(plan.capacityOverrideMinutes, undefined)
  assert.equal(data.settings.baseWeeklyCapacityMinutes, 2100)
  assert.deepEqual(data.blockTemplates.map(template => template.titleEn), ['Courses', 'IELTS', 'UROP', 'CUDA', 'StockLens', 'Gym'])
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
    timeBlocks: [{ id: 'old-block', title: 'IELTS 阅读', date: '2026-09-11', startTime: '10:00', endTime: '11:00', categoryId: 'study', color: '#000', priority: 'medium', status: 'completed', isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, createdAt: '', updatedAt: '' }],
    summerPhases: [],
    weeklyPlans: { '2026-09-07': { ...createWeeklyPlan('2026-09-07'), topOutcomes: ['真实目标'], flexAllocations: { ielts: 60 } } },
  }
  const migrated = migratePlannerData(legacy)
  assert.equal(migrated.schemaVersion, 3)
  assert.equal(migrated.timeBlocks.length, 1)
  assert.equal(migrated.timeBlocks[0].id, 'old-block')
  assert.equal(migrated.timeBlocks[0].trackId, 'ielts')
  assert.equal(migrated.timeBlocks[0].completedMinutes, 60)
  assert.deepEqual(migrated.weeklyPlans['2026-09-07'].topOutcomes, ['真实目标'])
  assert.equal(migrated.weeklyPlans['2026-09-07'].flexAllocations.ielts, 60)
  assert.equal(migrated.settings.baseWeeklyCapacityMinutes, 2100)
  assert.ok(migrated.tracks.length >= 8)
})
