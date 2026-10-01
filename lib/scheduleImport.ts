import * as XLSX from 'xlsx'
import type { Campus, Prisma } from '@prisma/client'

export const timeSlots = [
	'09:00-10:35',
	'10:45-12:20',
	'12:55-14:30',
	'14:40-16:15',
]
const days = [
	'Понедельник',
	'Вторник',
	'Среда',
	'Четверг',
	'Пятница',
	'Суббота',
]
const clean = (value: unknown) =>
	String(value ?? '')
		.replace(/\s+/g, ' ')
		.trim()
const groupPattern = /^(\d+)([А-ЯЁа-яё]+)-([1-4])(\d+)(к)?$/i

export function parseSchedule(
	buffer: Buffer,
	course: number,
	campus: Campus,
): Prisma.ScheduleCreateManyInput[] {
	if (![1, 2, 3, 4].includes(course)) throw new Error('Неверный курс')
	const workbook = XLSX.read(buffer, { type: 'buffer' })
	const entries: Prisma.ScheduleCreateManyInput[] = []
	const seen = new Set<string>()
	for (const name of workbook.SheetNames) {
		const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
			header: 1,
			defval: '',
		})
		const header = rows.findIndex((row) =>
			row.some((cell) => groupPattern.test(clean(cell))),
		)
		if (header < 0) continue
		const groups = rows[header].flatMap((cell, col) => {
			const groupFull = clean(cell)
			const match = groupFull.match(groupPattern)
			if (!match) return []
			if (Number(match[3]) !== course)
				throw new Error(`Группа ${groupFull} не относится к ${course} курсу`)
			return [
				{
					col,
					groupFull,
					specialty: match[2],
					group: match[4] + (match[5] || ''),
				},
			]
		})
		const defaultWeek = /числ/i.test(name)
			? 'numerator'
			: /знам/i.test(name)
				? 'denominator'
				: 'both'
		let day = ''
		for (let r = header + 1; r < rows.length; r++) {
			const row = rows[r]
			const rowDay = days.find(
				(d) => clean(row[0]).toLowerCase() === d.toLowerCase(),
			)
			if (rowDay) day = rowDay
			const pair = Number(row[1])
			if (!day || !Number.isInteger(pair) || pair < 1 || pair > 4) continue
			const next = rows[r + 1] || []
			const teacherRow = !clean(next[0]) && !clean(next[1]) ? next : []
			for (const group of groups) {
				let subject = clean(row[group.col])
				if (!subject || /^[-—_\s]+$/.test(subject)) continue
				let weekType = defaultWeek
				if (/\((числ|ч)\)/i.test(subject)) weekType = 'numerator'
				if (/\((знам|з)\)/i.test(subject)) weekType = 'denominator'
				subject = subject
					.replace(/\((числ|ч|знам|з)\)/gi, '')
					.replace(/\s*[-_]{2,}\s*/g, ' / ')
					.trim()
				const teachers = clean(teacherRow[group.col])
					.split(',')
					.map(clean)
					.filter(Boolean)
				const room = clean(row[group.col + 1])
				const rooms = room.split(',').map(clean)
				for (const [index, teacher] of (teachers.length
					? teachers
					: ['']
				).entries()) {
					const entry = {
						course,
						group: group.group,
						groupFull: group.groupFull,
						specialty: group.specialty,
						dayOfWeek: day,
						timeSlot: timeSlots[pair - 1],
						subject,
						teacher,
						room:
							(rooms.length === teachers.length ? rooms[index] : room) || null,
						weekType,
						campus,
					}
					const key = JSON.stringify(entry)
					if (!seen.has(key)) {
						entries.push(entry)
						seen.add(key)
					}
				}
			}
		}
	}
	if (!entries.length)
		throw new Error(
			'В файле не найдено расписание. Существующие данные сохранены',
		)
	return entries
}

export async function replaceSchedule(
	tx: Prisma.TransactionClient,
	entries: Prisma.ScheduleCreateManyInput[],
	course: number,
	campus: Campus,
) {
	// Serialize imports and writes to avoid overlapping replacements of the same course.
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001)`
	const before = await tx.schedule.findMany({ where: { course, campus } })
	await tx.schedule.deleteMany({ where: { course, campus } })
	await tx.schedule.createMany({ data: entries })
	const teachers = [...new Set(entries.map((e) => e.teacher).filter(Boolean))]
	await tx.teacher.createMany({
		data: teachers.map((name) => ({ name })),
		skipDuplicates: true,
	})
	return before
}
