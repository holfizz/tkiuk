import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const date = searchParams.get('date')
	const groupFull = searchParams.get('group')

	try {
		const where: any = {}

		if (date) {
			where.date = date
		}

		if (groupFull) {
			where.groupFull = groupFull
		}

		const replacements = await prisma.replacement.findMany({
			where,
			orderBy: [{ date: 'desc' }, { groupFull: 'asc' }, { pairNumber: 'asc' }],
		})

		return NextResponse.json({ replacements })
	} catch (error) {
		console.error('Error fetching replacements:', error)
		return NextResponse.json(
			{ error: 'Ошибка при получении замен' },
			{ status: 500 },
		)
	}
}

export async function DELETE(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const date = searchParams.get('date')

	if (!date) {
		return NextResponse.json({ error: 'Не указана дата' }, { status: 400 })
	}

	try {
		await prisma.replacement.deleteMany({
			where: { date },
		})

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Error deleting replacements:', error)
		return NextResponse.json(
			{ error: 'Ошибка при удалении замен' },
			{ status: 500 },
		)
	}
}
