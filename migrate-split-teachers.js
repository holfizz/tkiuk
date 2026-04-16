const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
	console.log('Миграция: разделение записей с несколькими преподавателями\n')

	// Находим все записи где есть запятая в поле teacher
	const scheduleWithMultipleTeachers = await prisma.schedule.findMany({
		where: {
			teacher: {
				contains: ',',
			},
		},
	})

	console.log(
		`Найдено ${scheduleWithMultipleTeachers.length} записей с несколькими преподавателями\n`,
	)

	if (scheduleWithMultipleTeachers.length === 0) {
		console.log('Нет записей для миграции')
		return
	}

	let created = 0
	let deleted = 0

	for (const entry of scheduleWithMultipleTeachers) {
		console.log(`\nОбрабатываем: ${entry.subject} - ${entry.teacher}`)

		// Разделяем преподавателей
		const teachers = entry.teacher
			.split(',')
			.map(t => t.trim())
			.filter(t => t)

		// Разделяем кабинеты если они есть
		let rooms = []
		if (entry.room && entry.room.includes(',')) {
			rooms = entry.room
				.split(',')
				.map(r => r.trim())
				.filter(r => r)
		}

		console.log(`  Преподаватели: ${teachers.join(' | ')}`)

		// Создаем отдельную запись для каждого преподавателя
		for (let i = 0; i < teachers.length; i++) {
			const teacher = teachers[i]
			const room = rooms.length > i ? rooms[i] : entry.room

			// Проверяем, не существует ли уже такая запись
			const existing = await prisma.schedule.findFirst({
				where: {
					course: entry.course,
					groupFull: entry.groupFull,
					dayOfWeek: entry.dayOfWeek,
					timeSlot: entry.timeSlot,
					weekType: entry.weekType,
					teacher: teacher,
				},
			})

			if (!existing) {
				await prisma.schedule.create({
					data: {
						course: entry.course,
						group: entry.group,
						groupFull: entry.groupFull,
						specialty: entry.specialty,
						dayOfWeek: entry.dayOfWeek,
						timeSlot: entry.timeSlot,
						subject: entry.subject,
						teacher: teacher,
						room: room,
						weekType: entry.weekType,
					},
				})
				created++
				console.log(`    ✓ Создана запись для: ${teacher}`)
			} else {
				console.log(`    - Запись уже существует для: ${teacher}`)
			}
		}

		// Удаляем старую запись с несколькими преподавателями
		await prisma.schedule.delete({
			where: {
				id: entry.id,
			},
		})
		deleted++
		console.log(`  ✗ Удалена старая запись`)
	}

	console.log(`\n=== Готово! ===`)
	console.log(`Создано новых записей: ${created}`)
	console.log(`Удалено старых записей: ${deleted}`)

	// Синхронизируем таблицу Teacher
	console.log('\n=== Синхронизация таблицы Teacher ===')

	const allSchedule = await prisma.schedule.findMany({
		select: {
			teacher: true,
		},
		distinct: ['teacher'],
	})

	const teacherNames = new Set()
	allSchedule.forEach(s => {
		if (s.teacher && s.teacher.trim()) {
			teacherNames.add(s.teacher.trim())
		}
	})

	console.log(`Найдено ${teacherNames.size} уникальных преподавателей`)

	let teachersAdded = 0
	let teachersUpdated = 0

	for (const teacherName of teacherNames) {
		const existing = await prisma.teacher.findUnique({
			where: { name: teacherName },
		})

		if (existing) {
			await prisma.teacher.update({
				where: { name: teacherName },
				data: { updatedAt: new Date() },
			})
			teachersUpdated++
		} else {
			await prisma.teacher.create({
				data: { name: teacherName },
			})
			teachersAdded++
			console.log(`  + Добавлен: ${teacherName}`)
		}
	}

	console.log(`\nДобавлено новых преподавателей: ${teachersAdded}`)
	console.log(`Обновлено существующих: ${teachersUpdated}`)
}

main()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
