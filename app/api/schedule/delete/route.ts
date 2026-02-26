import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams
		const id = searchParams.get('id')

		if (!id) {
			return NextResponse.json({ error: 'ID не указан' }, { status: 400 })
		}

		await prisma.schedule.delete({
			where: { id: parseInt(id) },
		})

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Delete error:', error)
		return NextResponse.json({ error: 'Ошибка при удалении' }, { status: 500 })
	}
}
