import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams
		const course = searchParams.get('course')
		const campus = searchParams.get('campus')

		console.log('=== Groups API ===')
		console.log('Course:', course)
		console.log('Campus:', campus)

		if (!course) {
			return NextResponse.json({ groups: [] })
		}

		const where: any = {
			course: parseInt(course),
		}

		// Фильтруем по площадке если указана
		if (campus) {
			where.campus = campus as any
		}

		const schedules = await prisma.schedule.findMany({
			where,
			select: { groupFull: true, group: true, campus: true },
			distinct: ['groupFull'],
		})

		console.log('Found groups:', schedules.length)
		console.log('Sample groups:', JSON.stringify(schedules.slice(0, 3)))

		const groups = schedules.map(s => s.groupFull).sort()

		console.log('Returning groups:', groups)

		return NextResponse.json({ groups })
	} catch (error) {
		console.error('Error fetching groups:', error)
		return NextResponse.json({ groups: [] })
	}
}
