import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiError, apiError, parseId, requireUser } from '@/lib/auth'
export async function GET(request: NextRequest) {
	try {
		const user = await requireUser()
		if (user.campus !== null)
			throw new ApiError(403, 'Журнал действий доступен только администратору')
		const cursor = request.nextUrl.searchParams.get('cursor')
		const logs = await prisma.auditLog.findMany({
			where: {
				...(cursor ? { id: { lt: parseId(cursor) } } : {}),
			},
			orderBy: { id: 'desc' },
			take: 50,
		})
		return NextResponse.json(
			{ logs, nextCursor: logs.length === 50 ? logs[49].id : null },
			{ headers: { 'Cache-Control': 'no-store' } },
		)
	} catch (error) {
		return apiError(error)
	}
}
