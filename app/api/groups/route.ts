import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams
		const course = searchParams.get('course')

		if (!course) {
			return NextResponse.json({ groups: [] })
		}

		const schedules = await prisma.schedule.findMany({
			where: { course: parseInt(course) },
			select: { groupFull: true },
			distinct: ['groupFull'],
		})

		const groups = schedules.map(s => s.groupFull).sort()

		return NextResponse.json({ groups })
	} catch (error) {
		console.error('Error fetching groups:', error)
		return NextResponse.json({ groups: [] })
	}
}
