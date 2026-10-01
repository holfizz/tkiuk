import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { parseSchedule, timeSlots } from '../lib/scheduleImport'
import { calculateCurrentWeekType } from '../lib/weekCalculator'
import { hashPassword, verifyPassword } from '../lib/passwords'

for (const course of [1, 2, 3, 4])
	test(`course ${course}: both sheets preserve all nonempty cells, teachers and campus`, () => {
		const bytes = readFileSync(
			`data/schedules/2026-2027-sem1/Rasp_${course}_kurs_1_sem_26-27_s_7_09.xls`,
		)
		const entries = parseSchedule(bytes, course, 'SECONDARY')
		const workbook = XLSX.read(bytes)
		let count = 0
		for (const name of workbook.SheetNames) {
			const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
				header: 1,
				defval: '',
			})
			for (let r = 8; r < 54; r++) {
				if (!Number(rows[r][1])) continue
				for (let c = 2; c < rows[7].length; c += 2) {
					if (!String(rows[7][c]).trim() || !String(rows[r][c]).trim()) continue
					const teacher = String(rows[r + 1][c]).trim()
					count += teacher
						? teacher.split(',').filter((t) => t.trim()).length
						: 1
				}
			}
		}
		assert.equal(entries.length, count)
		assert.ok(
			entries.every((e) => e.course === course && e.campus === 'SECONDARY'),
		)
		assert.deepEqual(
			new Set(entries.map((e) => e.weekType)),
			new Set(['numerator', 'denominator']),
		)
	})
test('9ПО-22к Friday: history only in numerator, fourth lesson only in denominator', () => {
	const entries = parseSchedule(
		readFileSync(
			'data/schedules/2026-2027-sem1/Rasp_2_kurs_1_sem_26-27_s_7_09.xls',
		),
		2,
		'SECONDARY',
	)
	const friday = entries.filter(
		(e) => e.groupFull === '9ПО-22к' && e.dayOfWeek === 'Пятница',
	)
	const first = friday.filter((e) => e.timeSlot === timeSlots[0])
	const fourth = friday.filter((e) => e.timeSlot === timeSlots[3])
	assert.equal(first.length, 1)
	assert.equal(first[0].subject, 'ИСТОРИЯ')
	assert.equal(first[0].weekType, 'numerator')
	assert.equal(fourth.length, 1)
	assert.equal(fourth[0].weekType, 'denominator')
	assert.match(fourth[0].subject, /АЛГОРИТМИЗАЦИИ/)
})
test('one-sheet schedule keeps both-week records and both teachers', () => {
	const book = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(
		book,
		XLSX.utils.aoa_to_sheet([
			['', '', '9ПО-21', ''],
			['Понедельник', 1, 'ИНОСТРАННЫЙ ЯЗЫК', '101, 102'],
			['', '', 'Первый А.А., Второй Б.Б.'],
		]),
		'Расписание',
	)
	const entries = parseSchedule(
		XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }),
		2,
		'MAIN',
	)
	assert.equal(entries.length, 2)
	assert.ok(entries.every((e) => e.weekType === 'both'))
	assert.deepEqual(
		entries.map((e) => e.room),
		['101', '102'],
	)
})
test('empty and wrong-course imports fail before writes', () => {
	assert.throws(() => parseSchedule(Buffer.from('invalid'), 1, 'MAIN'))
	assert.throws(
		() =>
			parseSchedule(
				readFileSync(
					'data/schedules/2026-2027-sem1/Rasp_2_kurs_1_sem_26-27_s_7_09.xls',
				),
				1,
				'MAIN',
			),
		/не относится/,
	)
})
test('week changes on Monday at Moscow midnight, including year boundary', () => {
	assert.equal(
		calculateCurrentWeekType(new Date('2026-09-06T20:59:59Z')),
		'numerator',
	)
	assert.equal(
		calculateCurrentWeekType(new Date('2026-09-06T21:00:00Z')),
		'denominator',
	)
	assert.equal(
		calculateCurrentWeekType(new Date('2026-09-08T12:00:00Z')),
		'denominator',
	)
	assert.equal(
		calculateCurrentWeekType(new Date('2027-01-01T12:00:00Z')),
		calculateCurrentWeekType(new Date('2026-12-31T12:00:00Z')),
	)
})
test('manual week anchor persists and alternates', () => {
	const settings = {
		currentWeekType: 'denominator',
		startDate: '2026-10-01',
		manualOverride: true,
	}
	assert.equal(
		calculateCurrentWeekType(new Date('2026-10-02T12:00:00Z'), settings),
		'denominator',
	)
	assert.equal(
		calculateCurrentWeekType(new Date('2026-10-05T12:00:00Z'), settings),
		'numerator',
	)
})
test('passwords are salted and validated', async () => {
	const first = await hashPassword('local-test-password')
	const second = await hashPassword('local-test-password')
	assert.notEqual(first, second)
	assert.equal(await verifyPassword('local-test-password', first), true)
	assert.equal(await verifyPassword('wrong', first), false)
})

test('student display keeps both subgroup teachers and rooms', async () => {
	const { combineLessons } = await import('../lib/lessonDisplay')
	const lesson = combineLessons([
		{ subject: 'Язык', teacher: 'Первый', room: '101' },
		{ subject: 'Язык', teacher: 'Второй', room: '102' },
	])
	assert.deepEqual(lesson, {
		subject: 'Язык',
		teacher: 'Первый, Второй',
		room: '101, 102',
	})
})

test('legacy automatically updated settings are not treated as a manual anchor', () => {
	const date = new Date('2026-10-01T12:00:00Z')
	assert.equal(
		calculateCurrentWeekType(date, {
			currentWeekType: 'denominator',
			startDate: '2026-10-01',
			manualOverride: false,
		}),
		calculateCurrentWeekType(date),
	)
})
