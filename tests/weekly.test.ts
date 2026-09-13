import test from 'node:test'
import assert from 'node:assert/strict'
import {
  allocatedFlex, applyDoneEarly, applyTemporaryReallocation, baseFlex, canAllocateFlex, completedTrackedMinutes, createWeeklyPlan, effectiveFloor, overcommitAmount,
  plannedTrackedTotal, protectedTotal, scheduledTrackedMinutes, trackProgress, unallocatedFlex, weeklyBudget,
} from '../src/lib/weekly.ts'
import type { Settings, TimeBlock, Track } from '../src/types/index.ts'

const floors: Record<string, number> = { courses: 480, ielts: 300, urop: 300, cuda: 180, stocklens: 120 }
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

test('Default: 35h capacity, 23h protected, 12h Flex', () => {
  const plan = createWeeklyPlan('2026-09-14')
  const protectedMinutes = protectedTotal(tracks, plan, settings)
  assert.equal(protectedMinutes, 1380)
  assert.equal(baseFlex(2100, protectedMinutes), 720)
})

test('Busy mode multiplies user Base Floors', () => {
  const plan = { ...createWeeklyPlan('2026-09-14'), mode: 'busy' as const }
  const protectedMinutes = protectedTotal(tracks, plan, settings)
  assert.equal(protectedMinutes, 1110)
  assert.equal(baseFlex(2100, protectedMinutes), 990)
})

test('Custom Base Floor recalculates Normal and Busy Flex', () => {
  const customTracks = tracks.map(track => track.id === 'courses' ? { ...track, weeklyFloorMinutes: 360, weeklyTargetMinutes: 360 } : track)
  const normal = createWeeklyPlan('2026-09-14')
  const busy = { ...normal, mode: 'busy' as const }
  assert.equal(protectedTotal(customTracks, normal, settings), 1260)
  assert.equal(baseFlex(2100, protectedTotal(customTracks, normal, settings)), 840)
  assert.equal(protectedTotal(customTracks, busy, settings), 990)
  assert.equal(baseFlex(2100, protectedTotal(customTracks, busy, settings)), 1110)
})

test('Crunch: 19h protected and 16h Flex', () => {
  const plan = { ...createWeeklyPlan('2026-09-14'), mode: 'crunch' as const }
  const protectedMinutes = protectedTotal(tracks, plan, settings)
  assert.equal(protectedMinutes, 720)
  assert.equal(baseFlex(2100, protectedMinutes), 1380)
})

test('Deload: per-track profile produces 6.4h protected', () => {
  const plan = { ...createWeeklyPlan('2026-09-14'), mode: 'deload' as const }
  assert.equal(protectedTotal(tracks, plan, settings), 384)
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

test('Done Early honors a custom Base Floor and resets next week', () => {
  const customTracks = tracks.map(track => track.id === 'courses' ? { ...track, weeklyFloorMinutes: 360, weeklyTargetMinutes: 360 } : track)
  const initial = { ...createWeeklyPlan('2026-09-14'), flexAllocations: { courses: 60 } }
  const current = applyDoneEarly(initial, 'courses', 240, 360)
  const next = createWeeklyPlan('2026-09-21')
  const courses = customTracks[0]
  assert.equal(effectiveFloor(courses, current, settings), 240)
  assert.equal(effectiveFloor(courses, next, settings), 360)
  assert.equal(current.flexAllocations.courses, 0)
  assert.equal(baseFlex(2100, protectedTotal(customTracks, current, settings)) - baseFlex(2100, protectedTotal(customTracks, next, settings)), 120)
})

test('temporary reallocation honors a custom CUDA Base Floor and resets next week', () => {
  const customTracks = tracks.map(track => track.id === 'cuda' ? { ...track, weeklyFloorMinutes: 240, weeklyTargetMinutes: 240 } : track)
  const current = applyTemporaryReallocation(createWeeklyPlan('2026-09-14'), 'urop', 180, 120, { cuda: 60 }, [tracks.find(track => track.id === 'cuda')!], settings)
  const next = createWeeklyPlan('2026-09-21')
  const cuda = customTracks.find(track => track.id === 'cuda')!
  const urop = tracks.find(track => track.id === 'urop')!
  const customCurrent = applyTemporaryReallocation(createWeeklyPlan('2026-09-14'), 'urop', 180, 120, { cuda: 60 }, [cuda], settings)
  assert.equal(effectiveFloor(cuda, customCurrent, settings), 180)
  assert.equal(weeklyBudget(urop, current, settings), 480)
  assert.equal(effectiveFloor(cuda, next, settings), 240)
})

test('Unallocated Flex may remain unused', () => {
  const plan = { ...createWeeklyPlan('2026-09-14'), flexAllocations: { courses: 120 } }
  assert.equal(allocatedFlex(plan), 120)
  assert.equal(unallocatedFlex(300, allocatedFlex(plan)), 180)
})

test('Flex allocation cannot exceed available Flex when increasing it', () => {
  const plan = createWeeklyPlan('2026-09-14')
  assert.equal(canAllocateFlex(plan, 300, 'urop', 330), false)
  assert.equal(canAllocateFlex(plan, 300, 'urop', 300), true)
})

test('Floor increase keeps existing Flex allocations and reports the overflow', () => {
  const plan = { ...createWeeklyPlan('2026-09-14'), flexAllocations: { courses: 180, urop: 120, cuda: 60 } }
  assert.equal(allocatedFlex(plan), 360)
  assert.equal(unallocatedFlex(180, allocatedFlex(plan)), 0)
  assert.equal(allocatedFlex(plan) - 180, 180)
})

test('Protected above capacity leaves Flex at zero and reports overcommit', () => {
  const highFloors = tracks.map(track => ({ ...track, weeklyFloorMinutes: 480 }))
  const protectedMinutes = protectedTotal(highFloors, createWeeklyPlan('2026-09-14'), settings)
  assert.equal(protectedMinutes, 2400)
  assert.equal(baseFlex(2100, protectedMinutes), 0)
  assert.equal(overcommitAmount(protectedMinutes, 2100), 300)
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

test('partial completion is not double-counted with scheduled time', () => {
  const plan = createWeeklyPlan('2026-09-14')
  const cuda = tracks.find(track => track.id === 'cuda')!
  const partial = block('cuda-partial', 'cuda', 180, 'partial', { completedMinutes: 60 })
  const progress = trackProgress(cuda, plan, [partial], settings)
  assert.equal(progress.scheduled, 180)
  assert.equal(progress.completed, 60)
  assert.equal(progress.scheduled - progress.completed, 120)
  assert.equal(progress.status, 'covered')
})
