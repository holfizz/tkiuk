import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiError, apiError, audit, requireUser } from '@/lib/auth'
import { calculateCurrentWeekType, moscowDayString } from '@/lib/weekCalculator'
export async function GET() {
	try {
		const settings = await prisma.weekSettings.findFirst({
			orderBy: { id: 'asc' },
		})
		return NextResponse.json({
			settings: {
				...settings,
				currentWeekType: calculateCurrentWeekType(new Date(), settings),
			},
		})
	} catch (error) {
		return apiError(error)
	}
}
export async function PUT(request: NextRequest) {
	try {
		const user = await requireUser(request)
		if (user.campus)
			throw new ApiError(
				403,
				'Общие настройки доступны только главному администратору',
			)
		const { currentWeekType } = await request.json()
		if (!['numerator', 'denominator'].includes(currentWeekType))
			throw new ApiError(400, 'Неверный тип недели')
		const settings = await prisma.$transaction(async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001)`
			const before = await tx.weekSettings.findFirst({ orderBy: { id: 'asc' } })
			const data = {
				currentWeekType,
				startDate: moscowDayString(),
				manualOverride: true,
			}
			const after = before
				? await tx.weekSettings.update({ where: { id: before.id }, data })
				: await tx.weekSettings.create({ data })
			await audit(tx, user, 'UPDATE', 'week-settings', { before, after })
			return after
		})
		return NextResponse.json({ success: true, settings })
	} catch (error) {
		return apiError(error)
	}
}
