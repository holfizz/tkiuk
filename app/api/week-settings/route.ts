import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
	try {
		let settings = await prisma.weekSettings.findFirst()

		if (!settings) {
			// Создаем настройки по умолчанию
			settings = await prisma.weekSettings.create({
				data: {
					currentWeekType: 'numerator',
					startDate: new Date().toISOString().split('T')[0],
				},
			})
		}

		return NextResponse.json({ settings })
	} catch (error) {
		console.error('Get week settings error:', error)
		return NextResponse.json(
			{ error: 'Ошибка при получении настроек' },
			{ status: 500 },
		)
	}
}

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json()
		const { currentWeekType } = body

		if (
			!currentWeekType ||
			!['numerator', 'denominator'].includes(currentWeekType)
		) {
			return NextResponse.json(
				{ error: 'Неверный тип недели' },
				{ status: 400 },
			)
		}

		let settings = await prisma.weekSettings.findFirst()

		if (!settings) {
			settings = await prisma.weekSettings.create({
				data: {
					currentWeekType,
					startDate: new Date().toISOString().split('T')[0],
				},
			})
		} else {
			settings = await prisma.weekSettings.update({
				where: { id: settings.id },
				data: { currentWeekType },
			})
		}

		return NextResponse.json({ success: true, settings })
	} catch (error) {
		console.error('Update week settings error:', error)
		return NextResponse.json(
			{ error: 'Ошибка при обновлении настроек' },
			{ status: 500 },
		)
	}
}
