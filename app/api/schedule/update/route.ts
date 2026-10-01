import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
	ApiError,
	apiError,
	audit,
	parseCampus,
	parseId,
	requireCampus,
	requireUser,
} from '@/lib/auth'

function fields(body: Record<string, unknown>) {
	const { subject, teacher, room, weekType } = body
	if (
		typeof subject !== 'string' ||
		typeof teacher !== 'string' ||
		(room != null && typeof room !== 'string') ||
		!['both', 'numerator', 'denominator'].includes(String(weekType))
	)
		throw new ApiError(400, 'Проверьте предмет, преподавателя и тип недели')
	if (
		subject.length > 2000 ||
		teacher.length > 500 ||
		String(room || '').length > 200
	)
		throw new ApiError(400, 'Слишком длинное значение')
	return {
		subject: subject.trim(),
		teacher: teacher.trim(),
		room: (room as string | null)?.trim() || null,
		weekType: String(weekType),
	}
}
export async function PUT(request: NextRequest) {
	try {
		const user = await requireUser(request)
		const body = await request.json()
		const id = parseId(body.id)
		const data = fields(body)
		const schedule = await prisma.$transaction(async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001)`
			const before = await tx.schedule.findUnique({ where: { id } })
			if (!before) throw new ApiError(404, 'Пара не найдена')
			requireCampus(user, before.campus)
			const after = await tx.schedule.update({ where: { id }, data })
			await tx.teacher.createMany({
				data: data.teacher
					.split(',')
					.map((name) => name.trim())
					.filter(Boolean)
					.map((name) => ({ name })),
				skipDuplicates: true,
			})
			await audit(
				tx,
				user,
				'UPDATE',
				'schedule',
				{ before, after },
				before.campus,
				String(id),
			)
			return after
		})
		return NextResponse.json({ success: true, schedule })
	} catch (error) {
		return apiError(error)
	}
}
export async function POST(request: NextRequest) {
	try {
		const user = await requireUser(request)
		const body = await request.json()
		const campus = parseCampus(body.campus)
		requireCampus(user, campus)
		const data = fields(body)
		const course = Number(body.course)
		if (
			![1, 2, 3, 4].includes(course) ||
			typeof body.groupFull !== 'string' ||
			!body.groupFull.trim() ||
			![
				'Понедельник',
				'Вторник',
				'Среда',
				'Четверг',
				'Пятница',
				'Суббота',
			].includes(body.dayOfWeek) ||
			!/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(body.timeSlot)
		)
			throw new ApiError(400, 'Неверные параметры пары')
		const schedule = await prisma.$transaction(async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001)`
			const existing = await tx.schedule.findFirst({
				where: { groupFull: body.groupFull, campus, course },
			})
			if (!existing)
				throw new ApiError(
					400,
					'Сначала загрузите расписание этой группы для выбранной площадки',
				)
			const after = await tx.schedule.create({
				data: {
					...data,
					course,
					campus,
					group: existing.group,
					groupFull: existing.groupFull,
					specialty: existing.specialty,
					dayOfWeek: body.dayOfWeek,
					timeSlot: body.timeSlot,
				},
			})
			await tx.teacher.createMany({
				data: data.teacher
					.split(',')
					.map((name) => name.trim())
					.filter(Boolean)
					.map((name) => ({ name })),
				skipDuplicates: true,
			})
			await audit(
				tx,
				user,
				'CREATE',
				'schedule',
				{ after },
				campus,
				String(after.id),
			)
			return after
		})
		return NextResponse.json({ success: true, schedule })
	} catch (error) {
		return apiError(error)
	}
}
