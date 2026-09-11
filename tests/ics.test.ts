import test from 'node:test'
import assert from 'node:assert/strict'
import { parseIcsCalendar } from '../src/lib/ics.ts'

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
