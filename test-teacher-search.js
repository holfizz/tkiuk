const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
	const teacherName = 'Невзорова Э.Б.'

	console.log(`Ищем расписание для: ${teacherName}`)
	console.log('Используем contains для поиска...\n')

	const schedule = await prisma.schedule.findMany({
		where: {
			teacher: {
				contains: teacherName,
			},
		},
		orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
	})

	console.log(`Найдено пар: ${schedule.length}\n`)

	if (schedule.length > 0) {
		// Группируем по дням
		const byDay = {}
		schedule.forEach(s => {
			if (!byDay[s.dayOfWeek]) {
				byDay[s.dayOfWeek] = []
			}
			byDay[s.dayOfWeek].push(s)
		})

		Object.keys(byDay).forEach(day => {
			console.log(`\n${day}:`)
			byDay[day].forEach(s => {
				console.log(
					`  ${s.timeSlot} - ${s.subject} (${s.groupFull}) - ${s.teacher}`,
				)
				if (s.room) console.log(`    Каб: ${s.room}`)
				console.log(`    Неделя: ${s.weekType}`)
			})
		})
	} else {
		console.log('Расписание не найдено')
	}
}

main()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
