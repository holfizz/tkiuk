import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData()
		const file = formData.get('file') as File
		const course = parseInt(formData.get('course') as string)

		if (!file) {
			return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
		}

		const buffer = Buffer.from(await file.arrayBuffer())
		const workbook = XLSX.read(buffer, { type: 'buffer' })
		const sheetName = workbook.SheetNames[0]
		const sheet = workbook.Sheets[sheetName]
		const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

		// Удаляем старые записи для этого курса
		await prisma.schedule.deleteMany({
			where: { course },
		})

		const entries: Array<{
			course: number
			group: string
			groupFull: string
			specialty: string
			dayOfWeek: string
			timeSlot: string
			subject: string
			teacher: string
			room: string | null
			weekType: string
		}> = []

		// Находим строку с группами
		let groupRow: any[] = []
		let groupRowIndex = -1

		for (let i = 0; i < Math.min(15, data.length); i++) {
			const row = data[i]
			if (row && row.length > 2) {
				const hasGroups = row.some((cell: any) => {
					const str = cell?.toString() || ''
					return /\d+[А-Яа-я]+-\d+/.test(str)
				})
				if (hasGroups) {
					groupRow = row
					groupRowIndex = i
					break
				}
			}
		}

		if (groupRowIndex === -1) {
			return NextResponse.json(
				{
					error: 'Не найдена строка с группами в файле',
				},
				{ status: 400 },
			)
		}

		// Парсим группы из заголовка
		const groups: Array<{
			col: number
			fullName: string
			course: number
			group: string
			specialty: string
		}> = []

		for (let col = 2; col < groupRow.length; col += 2) {
			const groupInfo = groupRow[col]?.toString().trim()
			if (!groupInfo) continue

			const groupMatch = groupInfo.match(/(\d+)([А-Яа-я]+)-(\d)(\d+)(к)?/)
			if (groupMatch) {
				const specialty = groupMatch[2]
				const parsedCourse = parseInt(groupMatch[3])
				const groupNum = groupMatch[4] + (groupMatch[5] === 'к' ? 'к' : '')

				groups.push({
					col,
					fullName: groupInfo,
					course: parsedCourse,
					group: groupNum,
					specialty,
				})
			}
		}

		// Парсим расписание
		let currentDay = ''
		const processedRows = new Set<number>()

		for (let i = groupRowIndex + 1; i < data.length; i++) {
			// Пропускаем уже обработанные строки (строки с преподавателями)
			if (processedRows.has(i)) continue

			const row = data[i]
			if (!row || row.length < 3) continue

			const firstCell = row[0]?.toString().trim().toLowerCase()

			// Проверяем день недели (может быть с пробелами в начале)
			if (
				firstCell &&
				(firstCell.includes('понедельник') ||
					firstCell.includes('вторник') ||
					firstCell.includes('среда') ||
					firstCell.includes('четверг') ||
					firstCell.includes('пятница') ||
					firstCell.includes('суббота'))
			) {
				currentDay = firstCell.replace(/\s+/g, ' ').trim()
				// Проверяем, есть ли номер пары в этой же строке
				const samePairNum = row[1]?.toString().trim()
				if (samePairNum && /^\d+$/.test(samePairNum)) {
					// Это строка с днем И парой одновременно - обрабатываем пару
					const timeSlot = getTimeSlot(parseInt(samePairNum))

					// Получаем строку с преподавателями (следующая строка)
					const teacherRow = i + 1 < data.length ? data[i + 1] : null
					let isTeacherRow = false

					// Помечаем следующую строку как обработанную если это строка с преподавателями
					if (teacherRow) {
						const nextFirstCell = teacherRow[0]?.toString().trim()
						const nextPairNum = teacherRow[1]?.toString().trim()
						// Если в следующей строке нет дня недели и нет номера пары - это строка с преподавателями
						if (
							!nextFirstCell &&
							(!nextPairNum || !/^\d+$/.test(nextPairNum))
						) {
							processedRows.add(i + 1)
							isTeacherRow = true

							// Логирование для отладки
							if (entries.length < 3) {
								console.log(`Row ${i}: Found teacher row at ${i + 1}`)
								console.log(`Teacher row sample:`, teacherRow.slice(0, 10))
							}
						}
					}

					// Парсим предметы для каждой группы
					for (const groupInfo of groups) {
						const subjectCol = groupInfo.col
						const roomCol = groupInfo.col + 1

						let subject = row[subjectCol]?.toString().trim() || ''
						let roomData = row[roomCol]?.toString().trim() || ''

						if (!subject) continue

						// Определяем тип недели
						let weekType = 'both'

						if (subject.includes('(числ)') || subject.includes('(ч)')) {
							weekType = 'numerator'
							subject = subject
								.replace(/\(числ\)/gi, '')
								.replace(/\(ч\)/gi, '')
								.trim()
						} else if (subject.includes('(знам)') || subject.includes('(з)')) {
							weekType = 'denominator'
							subject = subject
								.replace(/\(знам\)/gi, '')
								.replace(/\(з\)/gi, '')
								.trim()
						}

						// Очищаем предмет
						subject = subject
							.replace(/\s*[-_]{2,}\s*/g, ' / ')
							.replace(/\s+/g, ' ')
							.trim()

						if (!subject || subject.length < 2) continue

						// Кабинет из второй колонки
						let room = roomData.replace(/\s+/g, ' ').trim()

						// Преподаватель из следующей строки (в колонке с предметом, а не с кабинетом!)
						let teacher = ''
						if (isTeacherRow && teacherRow) {
							const teacherData =
								teacherRow[subjectCol]?.toString().trim() || ''
							teacher = teacherData.replace(/\s+/g, ' ').trim()

							// Логирование для отладки
							if (entries.length < 5) {
								console.log(
									`Group ${groupInfo.fullName}, subjectCol=${subjectCol}, roomCol=${roomCol}`,
								)
								console.log(
									`Subject: "${subject}", Room: "${room}", Teacher: "${teacher}"`,
								)
								console.log(`Teacher from subjectCol:`, teacherRow[subjectCol])
							}
						}

						// Проверяем, не добавили ли мы уже эту запись
						const isDuplicate = entries.some(
							entry =>
								entry.course === groupInfo.course &&
								entry.groupFull === groupInfo.fullName &&
								entry.dayOfWeek === capitalizeDay(currentDay) &&
								entry.timeSlot === timeSlot,
						)

						if (isDuplicate) continue

						entries.push({
							course: groupInfo.course,
							group: groupInfo.group,
							groupFull: groupInfo.fullName,
							specialty: groupInfo.specialty,
							dayOfWeek: capitalizeDay(currentDay),
							timeSlot,
							subject,
							teacher: teacher || '',
							room: room || null,
							weekType,
						})
					}
				}
				continue
			}

			// Проверяем номер пары
			const pairNum = row[1]?.toString().trim()
			if (!pairNum || !/^\d+$/.test(pairNum)) continue
			if (!currentDay) continue

			const timeSlot = getTimeSlot(parseInt(pairNum))

			// Получаем строку с преподавателями (следующая строка)
			const teacherRow = i + 1 < data.length ? data[i + 1] : null
			let isTeacherRow = false

			// Помечаем следующую строку как обработанную если это строка с преподавателями
			if (teacherRow) {
				const nextFirstCell = teacherRow[0]?.toString().trim()
				const nextPairNum = teacherRow[1]?.toString().trim()
				const nextDayCell = teacherRow[0]?.toString().trim().toLowerCase()

				// Строка с преподавателями: нет дня недели, нет номера пары
				const hasDay =
					nextDayCell &&
					(nextDayCell.includes('понедельник') ||
						nextDayCell.includes('вторник') ||
						nextDayCell.includes('среда') ||
						nextDayCell.includes('четверг') ||
						nextDayCell.includes('пятница') ||
						nextDayCell.includes('суббота'))

				if (!hasDay && (!nextPairNum || !/^\d+$/.test(nextPairNum))) {
					processedRows.add(i + 1)
					isTeacherRow = true

					// Логирование для отладки
					if (entries.length >= 3 && entries.length < 6) {
						console.log(
							`Row ${i}: Found teacher row at ${i + 1} (regular pair)`,
						)
						console.log(`Teacher row sample:`, teacherRow.slice(0, 10))
					}
				}
			}

			// Парсим предметы для каждой группы
			for (const groupInfo of groups) {
				const subjectCol = groupInfo.col
				const roomCol = groupInfo.col + 1

				let subject = row[subjectCol]?.toString().trim() || ''
				let roomData = row[roomCol]?.toString().trim() || ''

				if (!subject) continue

				// Определяем тип недели
				let weekType = 'both'

				if (subject.includes('(числ)') || subject.includes('(ч)')) {
					weekType = 'numerator'
					subject = subject
						.replace(/\(числ\)/gi, '')
						.replace(/\(ч\)/gi, '')
						.trim()
				} else if (subject.includes('(знам)') || subject.includes('(з)')) {
					weekType = 'denominator'
					subject = subject
						.replace(/\(знам\)/gi, '')
						.replace(/\(з\)/gi, '')
						.trim()
				}

				// Очищаем предмет
				subject = subject
					.replace(/\s*[-_]{2,}\s*/g, ' / ')
					.replace(/\s+/g, ' ')
					.trim()

				if (!subject || subject.length < 2) continue

				// Кабинет из второй колонки
				let room = roomData.replace(/\s+/g, ' ').trim()

				// Преподаватель из следующей строки (в колонке с предметом, а не с кабинетом!)
				let teacher = ''
				if (isTeacherRow && teacherRow) {
					const teacherData = teacherRow[subjectCol]?.toString().trim() || ''
					teacher = teacherData.replace(/\s+/g, ' ').trim()

					// Логирование для отладки
					if (entries.length >= 5 && entries.length < 10) {
						console.log(
							`Group ${groupInfo.fullName}, subjectCol=${subjectCol}, roomCol=${roomCol}`,
						)
						console.log(
							`Subject: "${subject}", Room: "${room}", Teacher: "${teacher}"`,
						)
						console.log(`Teacher from subjectCol:`, teacherRow[subjectCol])
					}
				}

				// Проверяем, не добавили ли мы уже эту запись
				const isDuplicate = entries.some(
					entry =>
						entry.course === groupInfo.course &&
						entry.groupFull === groupInfo.fullName &&
						entry.dayOfWeek === capitalizeDay(currentDay) &&
						entry.timeSlot === timeSlot,
				)

				if (isDuplicate) continue

				entries.push({
					course: groupInfo.course,
					group: groupInfo.group,
					groupFull: groupInfo.fullName,
					specialty: groupInfo.specialty,
					dayOfWeek: capitalizeDay(currentDay),
					timeSlot,
					subject,
					teacher: teacher || '',
					room: room || null,
					weekType,
				})
			}
		}

		// Сохраняем в БД
		if (entries.length > 0) {
			console.log(`Saving ${entries.length} entries to database`)
			console.log('Sample entry:', entries[0])
			console.log(
				'Sample entry with teacher:',
				entries.find(e => e.teacher),
			)

			// Собираем уникальных преподавателей
			const teacherNames = new Set<string>()
			entries.forEach(entry => {
				if (entry.teacher && entry.teacher.trim()) {
					// Разделяем преподавателей по запятой
					const teachers = entry.teacher
						.split(',')
						.map(t => t.trim())
						.filter(t => t)
					teachers.forEach(teacher => {
						if (teacher) {
							teacherNames.add(teacher)
						}
					})
				}
			})

			// Сохраняем преподавателей (upsert - создаем или обновляем)
			console.log(`Found ${teacherNames.size} unique teachers`)
			const teacherArray = Array.from(teacherNames)
			for (const teacherName of teacherArray) {
				await prisma.teacher.upsert({
					where: { name: teacherName },
					update: { updatedAt: new Date() },
					create: { name: teacherName },
				})
			}

			// Сохраняем расписание
			await prisma.schedule.createMany({
				data: entries,
			})
		}

		return NextResponse.json({
			success: true,
			count: entries.length,
		})
	} catch (error) {
		console.error('Upload error:', error)
		return NextResponse.json(
			{
				error: 'Ошибка при обработке файла: ' + (error as Error).message,
			},
			{ status: 500 },
		)
	}
}

function getTimeSlot(pairNum: number): string {
	const times: Record<number, string> = {
		1: '09:00-10:35',
		2: '10:45-12:20',
		3: '12:55-14:30',
		4: '14:40-16:15',
	}
	return times[pairNum] || `Пара ${pairNum}`
}

function capitalizeDay(day: string): string {
	const days: Record<string, string> = {
		понедельник: 'Понедельник',
		вторник: 'Вторник',
		среда: 'Среда',
		четверг: 'Четверг',
		пятница: 'Пятница',
		суббота: 'Суббота',
	}
	return days[day.toLowerCase()] || day
}
