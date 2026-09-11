import test from 'node:test'
import assert from 'node:assert/strict'
import { parseIcsCalendar, uniqueIcsBlocks } from '../src/lib/ics.ts'

const calendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:comp-test@example.com\r
DTSTART;TZID=Asia/Hong_Kong:20260901T103000\r
DTEND;TZID=Asia/Hong_Kong:20260901T120000\r
RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20260915T235959\r
EXDATE;TZID=Asia/Hong_Kong:20260908T103000\r
SUMMARY:COMP 9999 (L1)\r
DESCRIPTION:Weekly lecture\r
LOCATION:Room A\r
END:VEVENT\r
END:VCALENDAR`

test('ICS weekly recurrence respects UNTIL and EXDATE in Hong Kong local time', () => {
  const result = parseIcsCalendar(calendar)
  assert.equal(result.templates.length, 1)
  assert.deepEqual(result.blocks.map(block => block.date), ['2026-09-01', '2026-09-15'])
  assert.equal(result.blocks[0].startTime, '10:30')
  assert.equal(result.blocks[0].endTime, '12:00')
  assert.match(result.blocks[0].note ?? '', /Room A/)
  assert.equal(result.blocks[0].isFixed, true)
})

test('ICS occurrence IDs are stable for UID-based re-import deduplication', () => {
  const first = parseIcsCalendar(calendar).blocks.map(block => block.id)
  const second = parseIcsCalendar(calendar).blocks.map(block => block.id)
  assert.deepEqual(first, second)
})

test('duplicate course, date and time entries are merged', () => {
  const duplicate = calendar.replace('END:VCALENDAR', `BEGIN:VEVENT\r
UID:another-uid@example.com\r
DTSTART;TZID=Asia/Hong_Kong:20260901T103000\r
DTEND;TZID=Asia/Hong_Kong:20260901T120000\r
SUMMARY:COMP 9999 (L1)\r
LOCATION:Room B\r
END:VEVENT\r
END:VCALENDAR`)
  const result = parseIcsCalendar(duplicate)
  assert.equal(result.blocks.filter(block => block.date === '2026-09-01').length, 1)
  assert.match(result.blocks[0].note ?? '', /Room B/)
})

const hkustCalendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//HKUST//Timetable Planner//EN\r
CALSCALE:GREGORIAN\r
BEGIN:VEVENT\r
UID:EA375779A8192BCF02071C4961C926D8@timetable.ust.hk\r
DTSTART;TZID=Asia/Hong_Kong:20260901T103000\r
DTEND;TZID=Asia/Hong_Kong:20260901T120000\r
SUMMARY:COMP 2012 (L3)\r
LOCATION:Lecture Theater J (300)\r
RRULE:FREQ=WEEKLY;UNTIL=20261130T235959Z\r
EXDATE;TZID=Asia/Hong_Kong:20261001\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:B3A248EB11FD810872FC05CBE145B0B8@timetable.ust.hk\r
DTSTART;TZID=Asia/Hong_Kong:20260907T090000\r
DTEND;TZID=Asia/Hong_Kong:20260907T103000\r
SUMMARY:COMP 2611 (L2)\r
LOCATION:Rm 2464\r
RRULE:FREQ=WEEKLY;UNTIL=20261130T235959Z\r
EXDATE;TZID=Asia/Hong_Kong:20261019\r
END:VEVENT\r
END:VCALENDAR`

test('HKUST recurrence remains in Hong Kong time, respects UTC UNTIL and deduplicates imports', () => {
  const result = parseIcsCalendar(hkustCalendar)
  const comp2012 = result.blocks.filter(block => block.title === 'COMP 2012 (L3)')
  const comp2611 = result.blocks.filter(block => block.title === 'COMP 2611 (L2)')

  assert.equal(comp2012[0].date, '2026-09-01')
  assert.equal(comp2012[0].startTime, '10:30')
  assert.equal(comp2012.some(block => block.date === '2026-12-01'), false)
  assert.equal(comp2611.some(block => block.date === '2026-10-19'), false)
  assert.ok(comp2611.some(block => block.date === '2026-10-12'))
  assert.ok(result.blocks.every(block => block.source === 'ics' && block.trackId === 'courses' && block.isFixed && !block.canMove && block.countsTowardWeeklyCapacity === false))
  assert.deepEqual(uniqueIcsBlocks([], result.blocks), result.blocks)
  assert.deepEqual(uniqueIcsBlocks(result.blocks, result.blocks), [])
  assert.deepEqual(uniqueIcsBlocks([{ ...result.blocks[0], id: 'manual-course', source: undefined, sourceUid: undefined, recurrenceId: undefined }], [result.blocks[0]]), [result.blocks[0]])
})
