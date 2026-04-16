import { prisma } from '@/lib/prisma'
import mammoth from 'mammoth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData()
		const file = formData.get('file') as File

		if (!file) {
			return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
		}

		const buffer = Buffer.from(await file.arrayBuffer())

		// Читаем HTML чтобы сохранить структуру таблицы
		const result = await mammoth.convertToHtml({ buffer })
		const html = result.value

		console.log('HTML length:', html.length)

		// Ищем дату в HTML
		let replacementDate = ''
		const dateMatch = html.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
		if (dateMatch) {
			const day = dateMatch[1].padStart(2, '0')
			const month = dateMatch[2].padStart(2, '0')
			const year = dateMatch[3]
			replacementDate = `${year}-${month}-${day}`
		}

		if (!replacementDate) {
			return NextResponse.json(
				{ error: 'Не удалось найти дату в файле' },
				{ status: 400 },
			)
		}

		console.log('Found date:', replacementDate)

		// Парсим таблицу
		const replacements = []

		// Извлекаем строки таблицы (используем exec вместо matchAll для совместимости)
		const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
		const rows: string[] = []
		let rowMatch
		while ((rowMatch = rowRegex.exec(html)) !== null) {
			rows.push(rowMatch[1])
		}

		console.log('Total rows:', rows.length)

		for (let i = 0; i < rows.length; i++) {
			const rowHtml = rows[i]

			// Извлекаем ячейки
			const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
			const cells: string[] = []
			let cellMatch
			while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
				cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim())
			}

			// Пропускаем заголовки и пустые строки
			if (cells.length < 6 || cells[0] === 'Группа' || !cells[0]) {
				continue
			}

			// Формат таблицы:
			// [0] Группа, [1] Пара, [2] Снято занятие, [3] Ауд, [4] Назначено занятие, [5] Ауд
			// [6] Дисциплина (снято), [7] Преподаватель (снято), [8] Дисциплина (назначено), [9] Преподаватель (назначено)

			const groupFull = cells[0]
			const pairNumberStr = cells[1]

			// Проверяем что это валидная группа
			if (!groupFull.match(/^\d{1,2}[А-Яа-я]{1,3}-\d{1,2}/)) {
				continue
			}

			// Обрабатываем множественные пары (3,4 или 1-3)
			let pairNumbers: number[] = []

			if (pairNumberStr.includes(',')) {
				// Формат "3,4" - разделяем по запятой
				pairNumbers = pairNumberStr
					.split(',')
					.map(p => parseInt(p.trim()))
					.filter(p => !isNaN(p))
			} else if (pairNumberStr.includes('-')) {
				// Формат "1-3" - диапазон пар
				const [start, end] = pairNumberStr
					.split('-')
					.map(p => parseInt(p.trim()))
				if (!isNaN(start) && !isNaN(end) && start <= end) {
					for (let i = start; i <= end; i++) {
						pairNumbers.push(i)
					}
				}
			} else {
				// Одна пара
				const singlePair = parseInt(pairNumberStr)
				if (!isNaN(singlePair)) {
					pairNumbers = [singlePair]
				}
			}

			console.log(
				`Row ${i}: Group=${groupFull}, Pairs=${pairNumbers.join(',')}, Cells=${cells.length}`,
			)
			console.log(`  All cells:`, cells)

			const firstDigit = parseInt(groupFull.charAt(0))
			const course = firstDigit >= 9 ? 1 : firstDigit

			// Назначенное занятие
			let newSubject = ''
			let newTeacher = ''
			let room = ''

			// Структура: [0]Группа [1]Пара [2]СнятоДисц [3]СнятоПреп [4]СнятоАуд [5]НазначДисц [6]НазначПреп [7]НазначАуд
			if (cells.length >= 8) {
				newSubject = cells[5] && cells[5] !== '-' ? cells[5] : ''
				newTeacher = cells[6] && cells[6] !== '-' ? cells[6] : ''
				room = cells[7] && cells[7] !== '-' ? cells[7] : ''

				// Если аудитория "Дист" - это дистанционная пара
				if (room === 'Дист') {
					room = 'Дистанционно'
				}
			}

			console.log(
				`  Parsed: Subject="${newSubject}", Teacher="${newTeacher}", Room="${room}"`,
			)

			// Создаем замену для каждой пары в списке
			for (const pairNumber of pairNumbers) {
				if (pairNumber >= 1 && pairNumber <= 4) {
					// Даже если предмет пустой, создаем замену (отмена пары)
					replacements.push({
						date: replacementDate,
						course,
						groupFull,
						pairNumber,
						originalSubject: null as string | null,
						newSubject: newSubject.trim() || '', // Может быть пустым для отмены
						originalTeacher: null as string | null,
						newTeacher: newTeacher.trim() || '', // Может быть пустым для отмены
						room: room || null,
						notes: null,
					})
				}
			}
		}

		console.log('Parsed replacements:', replacements.length)

		if (replacements.length === 0) {
			return NextResponse.json(
				{ error: 'Не удалось распарсить замены из файла' },
				{ status: 400 },
			)
		}

		// Получаем текущий тип недели
		const weekSettings = await prisma.weekSettings.findFirst()
		const currentWeekType = weekSettings?.currentWeekType || 'numerator'

		// Определяем временные слоты для пар
		const timeSlots: Record<number, string> = {
			1: '09:00-10:35',
			2: '10:45-12:20',
			3: '12:55-14:30',
			4: '14:40-16:15',
		}

		// Определяем день недели для даты замены
		const replacementDateObj = new Date(replacementDate)
		const dayOfWeekNum = replacementDateObj.getDay()
		const daysOfWeek = [
			'Воскресенье',
			'Понедельник',
			'Вторник',
			'Среда',
			'Четверг',
			'Пятница',
			'Суббота',
		]
		const dayOfWeek = daysOfWeek[dayOfWeekNum]

		// Для каждой замены находим оригинальную пару из расписания
		for (const replacement of replacements) {
			const timeSlot = timeSlots[replacement.pairNumber]
			if (!timeSlot) continue

			// Ищем пару в расписании для текущей недели
			const originalLesson = await prisma.schedule.findFirst({
				where: {
					groupFull: replacement.groupFull,
					dayOfWeek: dayOfWeek,
					timeSlot: timeSlot,
					weekType: currentWeekType,
				},
			})

			// Если нашли оригинальную пару - сохраняем её данные
			if (originalLesson) {
				replacement.originalSubject = originalLesson.subject
				replacement.originalTeacher = originalLesson.teacher
			}
		}

		for (const replacement of replacements) {
			await prisma.replacement.upsert({
				where: {
					date_groupFull_pairNumber: {
						date: replacement.date,
						groupFull: replacement.groupFull,
						pairNumber: replacement.pairNumber,
					},
				},
				update: replacement,
				create: replacement,
			})
		}

		return NextResponse.json({
			success: true,
			message: `Загружено ${replacements.length} замен на ${replacementDate}`,
			date: replacementDate,
			count: replacements.length,
		})
	} catch (error) {
		console.error('Upload error:', error)
		return NextResponse.json(
			{ error: `Ошибка при обработке файла: ${error}` },
			{ status: 500 },
		)
	}
}
