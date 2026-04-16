const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
	console.log('Синхронизация преподавателей из расписания...\n')

	// Получаем все уникальные значения поля teacher из Schedule
	const allSchedule = await prisma.schedule.findMany({
		select: {
			teacher: true,
		},
		distinct: ['teacher'],
	})

	console.log(`Найдено ${allSchedule.length} уникальных записей в поле teacher`)

	// Разделяем преподавателей по запятой
	const teacherNames = new Set()

	allSchedule.forEach(s => {
		if (s.teacher && s.teacher.trim()) {
			// Разделяем по запятой
			const teachers = s.teacher
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

	console.log(
		`Найдено ${teacherNames.size} уникальных преподавателей после разделения\n`,
	)

	// Добавляем каждого преподавателя в таблицу Teacher
	let added = 0
	let updated = 0

	for (const teacherName of teacherNames) {
		const existing = await prisma.teacher.findUnique({
			where: { name: teacherName },
		})

		if (existing) {
			await prisma.teacher.update({
				where: { name: teacherName },
				data: { updatedAt: new Date() },
			})
			updated++
		} else {
			await prisma.teacher.create({
				data: { name: teacherName },
			})
			added++
			console.log(`  + Добавлен: ${teacherName}`)
		}
	}

	console.log(`\nГотово!`)
	console.log(`  Добавлено новых: ${added}`)
	console.log(`  Обновлено существующих: ${updated}`)
	console.log(`  Всего преподавателей: ${teacherNames.size}`)
}

main()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
