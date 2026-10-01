import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
	ApiError,
	apiError,
	audit,
	parseCampus,
	requireCampus,
	requireUser,
} from '@/lib/auth'
export async function GET(request: NextRequest) {
	try {
		const params = request.nextUrl.searchParams
		const date = params.get('date')
		const groupFull = params.get('group')
		const campus = params.get('campus')
			? parseCampus(params.get('campus'))
			: undefined
		const replacements = await prisma.replacement.findMany({
			where: {
				...(date ? { date } : {}),
				...(groupFull ? { groupFull } : {}),
				...(campus ? { campus } : {}),
			},
			orderBy: [{ date: 'desc' }, { groupFull: 'asc' }, { pairNumber: 'asc' }],
		})
		return NextResponse.json({ replacements })
	} catch (error) {
		return apiError(error)
	}
}
export async function DELETE(request: NextRequest) {
	try {
		const user = await requireUser(request)
		const params = request.nextUrl.searchParams
		const date = params.get('date')
		const campus = parseCampus(params.get('campus'))
		requireCampus(user, campus)
		if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
			throw new ApiError(400, 'Укажите дату')
		await prisma.$transaction(async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001)`
			const before = await tx.replacement.findMany({ where: { date, campus } })
			await tx.replacement.deleteMany({ where: { date, campus } })
			await audit(tx, user, 'DELETE', 'replacement', { date, before }, campus)
		})
		return NextResponse.json({ success: true })
	} catch (error) {
		return apiError(error)
	}
}
