import test from 'node:test'
import assert from 'node:assert/strict'
import {
  allocatedFlex, baseFlex, canAllocateFlex, completedTrackedMinutes, createWeeklyPlan, effectiveFloor, overcommitAmount,
  plannedTrackedTotal, protectedTotal, scheduledTrackedMinutes, trackProgress, unallocatedFlex, weeklyBudget,
} from '../src/lib/weekly.ts'
import type { Settings, TimeBlock, Track } from '../src/types/index.ts'

const floors: Record<string, number> = { courses: 900, ielts: 300, urop: 300, cuda: 180, stocklens: 120 }
const tracks: Track[] = Object.entries(floors).map(([id, weeklyFloorMinutes]) => ({ id, name: id, nameEn: id, color: '#000', kind: 'goal', weeklyFloorMinutes, weeklyTargetMinutes: weeklyFloorMinutes, important: true, urgent: false, countsTowardWeeklyCapacity: true }))
const settings = { modeFloorProfiles: {
  normal: { courses: 1, ielts: 1, urop: 1, cuda: 1, stocklens: 1 },
  busy: { courses: 1, ielts: .8, urop: .8, cuda: .5, stocklens: .5 },
  crunch: { courses: 1, ielts: .4, urop: .4, cuda: 0, stocklens: 0 },
  deload: { courses: .3, ielts: .5, urop: .3, cuda: 0, stocklens: 0 },
} } as Pick<Settings, 'modeFloorProfiles'>

const block = (id: string, trackId: string, minutes: number, status: TimeBlock['status'] = 'pending', options: Partial<TimeBlock> = {}): TimeBlock => ({
  id, title: id, date: '2026-09-14', startTime: '10:00', endTime: `${String(10 + Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
  categoryId: 'study', color: '#000', priority: 'medium', status, completedMinutes: status === 'completed' ? minutes : 0,
  isFixed: false, canMove: true, canSplit: true, canBeOverridden: true, trackId, countsTowardWeeklyCapacity: true, createdAt: '', updatedAt: '', ...options,
})

test('Normal: 35h capacity, 30h protected, 5h Flex', () => {
  const plan = createWeeklyPlan('2026-09-14')
  const protectedMinutes = protectedTotal(tracks, plan, settings)
  assert.equal(protectedMinutes, 1800)
  assert.equal(baseFlex(2100, protectedMinutes), 300)
})

test('Busy: 25.5h protected and 9.5h Flex', () => {
  const plan = { ...createWeeklyPlan('2026-09-14'), mode: 'busy' as const }
  const protectedMinutes = protectedTotal(tracks, plan, settings)
  assert.equal(protectedMinutes, 1530)
  assert.equal(baseFlex(2100, protectedMinutes), 570)
})

test('Crunch: 19h protected and 16h Flex', () => {
  const plan = { ...createWeeklyPlan('2026-09-14'), mode: 'crunch' as const }
  const protectedMinutes = protectedTotal(tracks, plan, settings)
  assert.equal(protectedMinutes, 1140)
  assert.equal(baseFlex(2100, protectedMinutes), 960)
})

test('fixed ICS classes are excluded from Weekly Planned Work', () => {
  const fixedClass = block('lecture', 'courses', 90, 'completed', { isFixed: true, source: 'ics', countsTowardWeeklyCapacity: false })
  assert.equal(plannedTrackedTotal([fixedClass]), 0)
  assert.equal(completedTrackedMinutes([fixedClass]), 0)
})

test('Courses self-study counts toward Scheduled and Completed', () => {
  const study = block('review', 'courses', 90, 'completed')
  assert.equal(scheduledTrackedMinutes([study], 'courses'), 90)
  assert.equal(completedTrackedMinutes([study], 'courses'), 90)
})

test('Gym and personal blocks do not enter Capacity calculations', () => {
  const gym = block('gym', 'health', 60, 'completed')
  assert.equal(plannedTrackedTotal([gym]), 0)
})

test('Done Early releases 7h this week and resets next week', () => {
  const current = { ...createWeeklyPlan('2026-09-14'), floorOverrides: { courses: 480 } }
  const next = createWeeklyPlan('2026-09-21')
  const courses = tracks[0]
  assert.equal(effectiveFloor(courses, current, settings), 480)
  assert.equal(effectiveFloor(courses, next, settings), 900)
  assert.equal(baseFlex(2100, protectedTotal(tracks, current, settings)) - baseFlex(2100, protectedTotal(tracks, next, settings)), 420)
})

test('temporary reallocation lowers CUDA only this week and adds UROP budget', () => {
  const current = { ...createWeeklyPlan('2026-09-14'), floorOverrides: { cuda: 120 }, flexAllocations: { urop: 60 } }
  const next = createWeeklyPlan('2026-09-21')
  const cuda = tracks.find(track => track.id === 'cuda')!
  const urop = tracks.find(track => track.id === 'urop')!
  assert.equal(effectiveFloor(cuda, current, settings), 120)
  assert.equal(weeklyBudget(urop, current, settings), 360)
  assert.equal(effectiveFloor(cuda, next, settings), 180)
})

test('Unallocated Flex may remain unused', () => {
  const plan = { ...createWeeklyPlan('2026-09-14'), flexAllocations: { courses: 120 } }
  assert.equal(allocatedFlex(plan), 120)
  assert.equal(unallocatedFlex(300, allocatedFlex(plan)), 180)
})

test('Flex allocation cannot exceed Base Flex', () => {
  const plan = createWeeklyPlan('2026-09-14')
  assert.equal(canAllocateFlex(plan, 300, 'urop', 330), false)
  assert.equal(canAllocateFlex(plan, 300, 'urop', 300), true)
})

test('Planned over Capacity reports the overcommit amount', () => {
  assert.equal(overcommitAmount(2280, 2100), 180)
  assert.equal(overcommitAmount(1800, 2100), 0)
})

test('track status is based on Budget, Scheduled and Completed', () => {
  const plan = createWeeklyPlan('2026-09-14')
  const cuda = tracks.find(track => track.id === 'cuda')!
  assert.equal(trackProgress(cuda, plan, [block('cuda-work', 'cuda', 180)], settings).status, 'covered')
  assert.equal(trackProgress(cuda, plan, [block('cuda-done', 'cuda', 180, 'completed')], settings).status, 'done')
})
