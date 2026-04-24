import { prisma } from '@/lib/prisma'
import { calculateCurrentWeekType } from '@/lib/weekCalculator'
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
		// Автоматически вычисляем текущую неделю
		const calculatedWeekType = calculateCurrentWeekType()

		const settings = await retryOperation(async () => {
			let settings = await prisma.weekSettings.findFirst()

			if (!settings) {
				// Создаем настройки с автоматически вычисленным типом недели
				settings = await prisma.weekSettings.create({
					data: {
						currentWeekType: calculatedWeekType,
						startDate: new Date().toISOString().split('T')[0],
					},
				})
			} else {
				// Обновляем тип недели на основе расчета
				settings = await prisma.weekSettings.update({
					where: { id: settings.id },
					data: {
						currentWeekType: calculatedWeekType,
						updatedAt: new Date(),
					},
				})
			}

			return settings
		})

		return NextResponse.json({ settings })
	} catch (error: any) {
		console.error('Get week settings error:', error)

		// Return default settings with calculated week type if database is unavailable
		if (error.code === 'P1017' || error.message?.includes('connection')) {
			const calculatedWeekType = calculateCurrentWeekType()
			return NextResponse.json({
				settings: {
					id: 1,
					currentWeekType: calculatedWeekType,
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
