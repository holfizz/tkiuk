import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams
	const course = searchParams.get('course')
	const group = searchParams.get('group')
	const campus = searchParams.get('campus')


	if (!course || !group) {
		return NextResponse.json({ schedule: [] })
	}

	const where: any = {
		course: parseInt(course),
		groupFull: group, // Используем groupFull вместо group
	}

	// Если указана площадка, фильтруем по ней
	if (campus) {
		where.campus = campus as any
	}


	const schedule = await prisma.schedule.findMany({
		where,
		orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
	})

	if (schedule.length > 0) {
	}


	return NextResponse.json({ schedule })
}
