import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json()
		const { id, newSubject, newTeacher, room } = body

		if (!id || !newSubject || !newTeacher) {
			return NextResponse.json(
				{ error: 'Не указаны обязательные поля' },
				{ status: 400 },
			)
		}

		const updated = await prisma.replacement.update({
			where: { id: parseInt(id) },
			data: {
				newSubject,
				newTeacher,
				room: room || null,
			},
		})

		return NextResponse.json({ success: true, replacement: updated })
	} catch (error) {
		console.error('Error updating replacement:', error)
		return NextResponse.json(
			{ error: 'Ошибка при обновлении замены' },
			{ status: 500 },
		)
	}
}
