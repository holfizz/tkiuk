import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json()
		const { id, subject, teacher, room, weekType } = body

		if (!id) {
			return NextResponse.json({ error: 'ID не указан' }, { status: 400 })
		}

		const updated = await prisma.schedule.update({
			where: { id: parseInt(id) },
			data: {
				subject: subject || '',
				teacher: teacher || '',
				room: room || null,
				weekType: weekType || 'both',
			},
		})

		return NextResponse.json({ success: true, schedule: updated })
	} catch (error) {
		console.error('Update error:', error)
		return NextResponse.json(
			{ error: 'Ошибка при обновлении: ' + (error as Error).message },
			{ status: 500 },
		)
	}
}
