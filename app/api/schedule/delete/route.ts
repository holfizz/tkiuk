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
export async function DELETE(request: NextRequest) {
	try {
		const user = await requireUser(request)
		const id = parseId(request.nextUrl.searchParams.get('id'))
		await prisma.$transaction(async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001)`
			const before = await tx.schedule.findUnique({ where: { id } })
			if (!before) throw new ApiError(404, 'Пара не найдена')
			requireCampus(user, before.campus)
			await tx.schedule.delete({ where: { id } })
			await audit(
				tx,
				user,
				'DELETE',
				'schedule',
				{ before },
				before.campus,
				String(id),
			)
		})
		return NextResponse.json({ success: true })
	} catch (error) {
		return apiError(error)
	}
}
