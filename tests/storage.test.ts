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

test('new workspace has no preset content or weekly budget', () => {
  storage.clear()
  const data = loadData()
  assert.equal(data.schemaVersion, 6)
  assert.deepEqual(data.categories, [])
  assert.deepEqual(data.tracks, [])
  assert.deepEqual(data.blockTemplates, [])
  assert.deepEqual(data.timeBlocks, [])
  assert.deepEqual(data.weeklyPlans, {})
  assert.equal(data.settings.baseWeeklyCapacityMinutes, 0)
  assert.deepEqual(data.settings.modeFloorProfiles, { normal: {}, busy: {}, crunch: {}, deload: {} })
  assert.deepEqual(createWeeklyPlan('2026-09-14').flexAllocations, {})
})

test('reset returns to the empty workspace', () => {
  const data = createDefaultData()
  data.settings.baseWeeklyCapacityMinutes = 900
  data.tracks.push({ id: 'my-work', name: 'My Work', nameEn: 'My Work', color: '#123456', kind: 'goal', weeklyFloorMinutes: 240, weeklyTargetMinutes: 240, important: false, urgent: false, countsTowardWeeklyCapacity: true })
  saveData(data)
  assert.equal(loadData().tracks.length, 1)
  resetData()
  assert.deepEqual(loadData(), createDefaultData())
})

test('old presets are removed without deleting user modules, blocks, and allocations', () => {
  const legacy = {
    ...createDefaultData(), schemaVersion: 5, settings: { ...createDefaultData().settings, baseWeeklyCapacityMinutes: 2100 },
    categories: [{ id: 'study', name: '学习', nameEn: 'Study', color: '#5b7cfa', countsTowardCompletion: true }],
    tracks: [
      { id: 'courses', name: 'Courses', nameEn: 'Courses', color: '#5876de', kind: 'goal', weeklyFloorMinutes: 480, weeklyTargetMinutes: 480, important: true, urgent: true, countsTowardWeeklyCapacity: true },
      { id: 'cuda', name: 'CUDA', nameEn: 'CUDA', color: '#d47838', kind: 'goal', weeklyFloorMinutes: 180, weeklyTargetMinutes: 180, important: true, urgent: false, countsTowardWeeklyCapacity: true },
    ],
    blockTemplates: [
      { id: 'builtin-courses', title: 'Courses', titleEn: 'Courses', durationMinutes: 60, categoryId: 'study', color: '#5876de', icon: '', priority: 'medium', isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, isBuiltIn: true, isHidden: false, countsTowardWeeklyCapacity: true },
      { id: 'mine', title: 'My review', titleEn: 'My review', durationMinutes: 60, categoryId: 'study', color: '#5876de', icon: '', priority: 'medium', isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, isBuiltIn: false, isHidden: false, trackId: 'courses', countsTowardWeeklyCapacity: true },
    ],
    weeklyPlans: { '2026-09-14': { ...createWeeklyPlan('2026-09-14'), flexAllocations: { courses: 60 } } },
  }
  const migrated = migratePlannerData(legacy)
  assert.equal(migrated.schemaVersion, 6)
  assert.equal(migrated.settings.baseWeeklyCapacityMinutes, 0)
  assert.deepEqual(migrated.blockTemplates.map(item => item.id), ['mine'])
  assert.deepEqual(migrated.tracks.map(item => item.id), ['courses'])
  assert.equal(migrated.weeklyPlans['2026-09-14'].flexAllocations.courses, 60)
  assert.equal(migrated.categories.length, 1)
})

test('migration keeps a customized legacy floor but does not recreate missing presets', () => {
  const legacy = { ...createDefaultData(), schemaVersion: 5,
    tracks: [{ id: 'courses', name: 'Courses', nameEn: 'Courses', color: '#5876de', kind: 'goal', weeklyFloorMinutes: 360, weeklyTargetMinutes: 360, important: true, urgent: true, countsTowardWeeklyCapacity: true }] }
  const migrated = migratePlannerData(legacy)
  assert.equal(migrated.tracks.find(track => track.id === 'courses')?.weeklyFloorMinutes, 360)
  assert.equal(migrated.tracks.length, 1)
})

test('migration preserves renamed legacy categories and recolored work items', () => {
  const legacy = { ...createDefaultData(), schemaVersion: 5,
    categories: [{ id: 'study', name: 'My category', nameEn: 'My category', color: '#5b7cfa', countsTowardCompletion: true }],
    tracks: [{ id: 'courses', name: 'Courses', nameEn: 'Courses', color: '#123456', kind: 'goal', weeklyFloorMinutes: 480, weeklyTargetMinutes: 480, important: true, urgent: true, countsTowardWeeklyCapacity: true }] }
  const migrated = migratePlannerData(legacy)
  assert.equal(migrated.categories[0]?.name, 'My category')
  assert.equal(migrated.tracks[0]?.color, '#123456')
})
