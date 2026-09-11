import test from 'node:test'
import assert from 'node:assert/strict'
import { completedMinutes, createWeeklyPlan, effectiveFloor, flexSummary, trackProgress, weekBlocks, weekKey } from '../src/lib/weekly.ts'
import type { TimeBlock, Track } from '../src/types/index.ts'

const track: Track = { id: 'cuda', name: 'CUDA', nameEn: 'CUDA', color: '#000', kind: 'goal', weeklyFloorMinutes: 180, weeklyTargetMinutes: 300, important: true, urgent: false }
const block = (date: string, status: TimeBlock['status'], actual = 0): TimeBlock => ({
  id: `${date}-${status}`, title: 'CUDA', date, startTime: '10:00', endTime: '12:00', categoryId: 'study', color: '#000', priority: 'medium', status,
  completedMinutes: actual, isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, trackId: 'cuda', createdAt: '', updatedAt: '',
})

test('partial and completed time are counted from actual work', () => {
  assert.equal(completedMinutes(block('2026-09-07', 'partial', 50)), 50)
  assert.equal(completedMinutes(block('2026-09-07', 'completed')), 120)
  assert.equal(completedMinutes(block('2026-09-07', 'pending')), 0)
})

test('weekly Floor resets because each week selects only its own blocks', () => {
  const first = weekBlocks([block('2026-09-07', 'completed'), block('2026-09-14', 'partial', 30)], weekKey('2026-09-07'))
  const second = weekBlocks([block('2026-09-07', 'completed'), block('2026-09-14', 'partial', 30)], weekKey('2026-09-14'))
  assert.equal(trackProgress(track, createWeeklyPlan('2026-09-07'), first).completed, 120)
  assert.equal(trackProgress(track, createWeeklyPlan('2026-09-14'), second).completed, 30)
})

test('mode multiplier changes goal Floors but not infrastructure', () => {
  const plan = createWeeklyPlan('2026-09-07', 'busy', 0.5)
  assert.equal(effectiveFloor(track, plan), 90)
  assert.equal(effectiveFloor({ ...track, kind: 'infrastructure' }, plan), 180)
})

test('Flex summary allows over-allocation without blocking', () => {
  const plan = { ...createWeeklyPlan('2026-09-07'), flexBudgetMinutes: 480, flexAllocations: { cuda: 300, urop: 240 } }
  assert.deepEqual(flexSummary(plan), { allocated: 540, remaining: -60 })
})
