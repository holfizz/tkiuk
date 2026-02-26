import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams
	const course = searchParams.get('course')
	const group = searchParams.get('group')

	if (!course || !group) {
		return NextResponse.json({ schedule: [] })
	}

	const schedule = await prisma.schedule.findMany({
		where: {
			course: parseInt(course),
			group: group,
		},
		orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
	})

	return NextResponse.json({ schedule })
}
