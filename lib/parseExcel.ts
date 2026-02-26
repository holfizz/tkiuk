import * as XLSX from 'xlsx'

export interface ScheduleEntry {
	course: number
	group: string
	specialty: string
	dayOfWeek: string
	timeSlot: string
	subject: string
	teacher: string
	room?: string
}

export function parseExcelFile(
	buffer: Buffer,
	course: number,
): ScheduleEntry[] {
	const workbook = XLSX.read(buffer, { type: 'buffer' })
	const sheetName = workbook.SheetNames[0]
	const sheet = workbook.Sheets[sheetName]
	const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

	const entries: ScheduleEntry[] = []

	// Парсинг структуры расписания
	for (let i = 1; i < data.length; i++) {
		const row = data[i]
		if (!row || row.length < 4) continue

		const dayOfWeek = row[0]?.toString().trim()
		const timeSlot = row[1]?.toString().trim()
		const subject = row[2]?.toString().trim()
		const teacher = row[3]?.toString().trim()
		const room = row[4]?.toString().trim()
		const groupInfo = row[5]?.toString().trim()

		if (!dayOfWeek || !timeSlot || !subject) continue

		// Парсинг группы (например, 9ПО-319)
		const groupMatch = groupInfo?.match(/(\d+)([А-Я]+)-(\d)(\d+)(к)?/)
		if (groupMatch) {
			const specialty = groupMatch[2]
			const parsedCourse = parseInt(groupMatch[3])
			const group = groupMatch[4]
			const isCommercial = groupMatch[5] === 'к'

			entries.push({
				course: parsedCourse,
				group: group + (isCommercial ? 'к' : ''),
				specialty,
				dayOfWeek,
				timeSlot,
				subject,
				teacher,
				room,
			})
		}
	}

	return entries
}
