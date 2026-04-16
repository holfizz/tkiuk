const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
	// Проверяем преподавателя Невзорова
	console.log('Ищем преподавателя Невзорова...')
	const teachers = await prisma.teacher.findMany({
		where: {
			name: {
				contains: 'Невзор',
			},
		},
	})

	console.log('Найденные преподаватели:', teachers)

	if (teachers.length > 0) {
		const teacherName = teachers[0].name
		console.log(`\nПроверяем расписание для: ${teacherName}`)

		const schedule = await prisma.schedule.findMany({
			where: {
				teacher: teacherName,
			},
		})

		console.log(`Найдено пар: ${schedule.length}`)
		console.log('Расписание:', schedule)
	}

	// Проверяем все уникальные имена преподавателей в расписании
	console.log('\n--- Все преподаватели в Schedule ---')
	const allSchedule = await prisma.schedule.findMany({
		select: {
			teacher: true,
		},
		distinct: ['teacher'],
	})

	const uniqueTeachers = [...new Set(allSchedule.map(s => s.teacher))].sort()
	console.log(
		`Всего уникальных преподавателей в расписании: ${uniqueTeachers.length}`,
	)
	uniqueTeachers.forEach(t => console.log(`  - ${t}`))
}

main()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
