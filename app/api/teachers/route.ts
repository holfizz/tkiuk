import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { ApiError, apiError, audit, requireUser } from '@/lib/auth'

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

// The directory is shared by both campuses. Never remove a teacher who is
// still referenced: dispatchers must not affect the other campus's lessons.
export async function DELETE(request: NextRequest) {
	try {
		const user = await requireUser(request)
		const name = request.nextUrl.searchParams.get('name')?.trim()
		if (!name || name.length > 500)
			throw new ApiError(400, 'Укажите преподавателя')
		await prisma.$transaction(async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001)`
			const teacher = await tx.teacher.findUnique({ where: { name } })
			if (!teacher) throw new ApiError(404, 'Преподаватель не найден')
			const [lessons, replacements] = await Promise.all([
				tx.schedule.findMany({ where: { teacher: { contains: name } }, select: { teacher: true } }),
				tx.replacement.findMany({
					where: { OR: [{ originalTeacher: { contains: name } }, { newTeacher: { contains: name } }] },
					select: { originalTeacher: true, newTeacher: true },
				}),
			])
			const includesTeacher = (value: string | null) =>
				(value || '').split(',').some((part) => part.trim() === name)
			if (lessons.some((row) => includesTeacher(row.teacher)) ||
				replacements.some((row) => includesTeacher(row.originalTeacher) || includesTeacher(row.newTeacher)))
				throw new ApiError(409, 'Преподаватель указан в расписании или заменах. Сначала измените назначения, затем удалите его из списка.')
			await tx.teacher.delete({ where: { id: teacher.id } })
			await audit(tx, user, 'DELETE', 'teacher', { before: teacher }, null, String(teacher.id))
		})
		return NextResponse.json({ success: true })
	} catch (error) {
		return apiError(error)
	}
}
