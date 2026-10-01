import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
	ApiError,
	apiError,
	audit,
	parseId,
	requireCampus,
	requireUser,
} from '@/lib/auth'
export async function PUT(request: NextRequest) {
	try {
		const user = await requireUser(request)
		const body = await request.json()
		const id = parseId(body.id)
		if (
			typeof body.newSubject !== 'string' ||
			typeof body.newTeacher !== 'string' ||
			(body.room != null && typeof body.room !== 'string')
		)
			throw new ApiError(400, 'Проверьте данные замены')
		const replacement = await prisma.$transaction(async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001)`
			const before = await tx.replacement.findUnique({ where: { id } })
			if (!before) throw new ApiError(404, 'Замена не найдена')
			requireCampus(user, before.campus)
			const after = await tx.replacement.update({
				where: { id },
				data: {
					newSubject: body.newSubject.trim(),
					newTeacher: body.newTeacher.trim(),
					room: body.room?.trim() || null,
				},
			})
			await audit(
				tx,
				user,
				'UPDATE',
				'replacement',
				{ before, after },
				before.campus,
				String(id),
			)
			return after
		})
		return NextResponse.json({ success: true, replacement })
	} catch (error) {
		return apiError(error)
	}
}
