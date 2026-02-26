import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams
	const teacher = searchParams.get('teacher')

	if (!teacher) {
		return NextResponse.json({ schedule: [] })
	}

	const schedule = await prisma.schedule.findMany({
		where: { teacher },
		orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
	})

	return NextResponse.json({ schedule })
}
