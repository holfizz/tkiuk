import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams
	const course = searchParams.get('course')
	const group = searchParams.get('group')
	const campus = searchParams.get('campus')

	console.log('=== Student Schedule API ===')
	console.log('Course:', course)
	console.log('Group:', group)
	console.log('Campus:', campus)

	if (!course || !group) {
		console.log('Missing course or group')
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

	console.log('Query where:', JSON.stringify(where))

	const schedule = await prisma.schedule.findMany({
		where,
		orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
	})

	console.log('Found schedule items:', schedule.length)
	if (schedule.length > 0) {
		console.log('Sample item:', JSON.stringify(schedule[0]))
	}

	// Проверим, есть ли вообще записи для этой группы
	const allForGroup = await prisma.schedule.findMany({
		where: {
			course: parseInt(course),
			groupFull: group,
		},
		select: {
			id: true,
			groupFull: true,
			campus: true,
		},
		take: 5,
	})
	console.log(
		'All records for this group (sample):',
		JSON.stringify(allForGroup),
	)

	return NextResponse.json({ schedule })
}
