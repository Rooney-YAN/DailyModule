import test from 'node:test'
import assert from 'node:assert/strict'
import { migratePlannerData } from '../src/lib/storage.ts'

test('schema v1 data migrates without losing existing blocks', () => {
  const legacy = {
    schemaVersion: 1,
    settings: { language: 'zh', theme: 'system', weekStartsOn: 1, defaultDayStart: '07:00', defaultDayEnd: '23:00', countLifeBlocks: false, defaultView: 'day' },
    categories: [{ id: 'study', name: '学习', nameEn: 'Study', color: '#000', countsTowardCompletion: true }],
    blockTemplates: [{ id: 'old-template', title: 'IELTS 阅读', titleEn: 'IELTS Reading', durationMinutes: 60, categoryId: 'study', color: '#000', icon: '', priority: 'medium', isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, isBuiltIn: false, isHidden: false }],
    timeBlocks: [{ id: 'old-block', title: 'IELTS 阅读', date: '2026-09-11', startTime: '10:00', endTime: '11:00', categoryId: 'study', color: '#000', priority: 'medium', status: 'completed', isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, createdAt: '', updatedAt: '' }],
    summerPhases: [],
  }
  const migrated = migratePlannerData(legacy)
  assert.equal(migrated.schemaVersion, 3)
  assert.equal(migrated.timeBlocks.length, 1)
  assert.equal(migrated.timeBlocks[0].id, 'old-block')
  assert.equal(migrated.timeBlocks[0].trackId, 'ielts')
  assert.equal(migrated.timeBlocks[0].completedMinutes, 60)
  assert.equal(migrated.settings.baseWeeklyCapacityMinutes, 2100)
  assert.ok(migrated.tracks.length >= 8)
})
