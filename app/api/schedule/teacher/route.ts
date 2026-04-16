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

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams
	const teacher = searchParams.get('teacher')

	if (!teacher) {
		return NextResponse.json({ schedule: [] })
	}

	try {
		const schedule = await retryOperation(async () => {
			// Ищем расписание по точному совпадению имени преподавателя
			return await prisma.schedule.findMany({
				where: {
					teacher: teacher,
				},
				orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
			})
		})

		return NextResponse.json({ schedule })
	} catch (error: any) {
		console.error('Error fetching teacher schedule:', error)

		// Return empty array if database is unavailable
		if (error.code === 'P1017' || error.message?.includes('connection')) {
			return NextResponse.json({ schedule: [] })
		}

		return NextResponse.json(
			{ error: 'Ошибка при получении расписания' },
			{ status: 500 },
		)
	}
}
