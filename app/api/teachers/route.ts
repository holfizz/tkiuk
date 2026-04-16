import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
	try {
		// Сначала пытаемся получить преподавателей из отдельной таблицы
		const teachers = await prisma.teacher.findMany({
			orderBy: { name: 'asc' },
		})

		let teacherNames = teachers
			.map(t => t.name)
			.filter(name => name && name.trim())

		// Если таблица Teacher пуста, получаем преподавателей из Schedule
		if (teacherNames.length === 0) {
			const scheduleTeachers = await prisma.schedule.findMany({
				select: { teacher: true },
				distinct: ['teacher'],
				where: {
					teacher: {
						not: '',
					},
				},
				orderBy: { teacher: 'asc' },
			})

			teacherNames = scheduleTeachers
				.map(s => s.teacher)
				.filter(name => name && name.trim())
		}

		return NextResponse.json({ teachers: teacherNames })
	} catch (error) {
		console.error('Error fetching teachers:', error)
		return NextResponse.json({ teachers: [] })
	}
}
