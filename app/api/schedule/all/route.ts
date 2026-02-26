import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams
	const course = searchParams.get('course')

	const where = course ? { course: parseInt(course) } : {}

	const schedule = await prisma.schedule.findMany({
		where,
		orderBy: [
			{ course: 'asc' },
			{ group: 'asc' },
			{ dayOfWeek: 'asc' },
			{ timeSlot: 'asc' },
		],
	})

	return NextResponse.json({ schedule })
}
