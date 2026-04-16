import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Helper function to retry database operations
async function retryOperation<T>(
	operation: () => Promise<T>,
	maxRetries = 3,
): Promise<T> {
	let lastError: any

	for (let i = 0; i < maxRetries; i++) {
		try {
			return await operation()
		} catch (error: any) {
			lastError = error
			console.warn(
				`Database operation failed (attempt ${i + 1}/${maxRetries}):`,
				error.message,
			)

			// If it's a connection error, wait before retrying
			if (error.code === 'P1017' || error.message?.includes('connection')) {
				await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
			} else {
				// For other errors, don't retry
				throw error
			}
		}
	}

	throw lastError
}

export async function GET() {
	try {
		const settings = await retryOperation(async () => {
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

			return settings
		})

		return NextResponse.json({ settings })
	} catch (error: any) {
		console.error('Get week settings error:', error)

		// Return default settings if database is unavailable
		if (error.code === 'P1017' || error.message?.includes('connection')) {
			return NextResponse.json({
				settings: {
					id: 1,
					currentWeekType: 'numerator',
					startDate: new Date().toISOString().split('T')[0],
					updatedAt: new Date(),
				},
			})
		}

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

		const settings = await retryOperation(async () => {
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

			return settings
		})

		return NextResponse.json({ success: true, settings })
	} catch (error: any) {
		console.error('Update week settings error:', error)
		return NextResponse.json(
			{ error: 'Ошибка при обновлении настроек' },
			{ status: 500 },
		)
	}
}
