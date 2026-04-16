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
	const { searchParams } = new URL(request.url)
	const date = searchParams.get('date')
	const groupFull = searchParams.get('group')

	try {
		const replacements = await retryOperation(async () => {
			const where: any = {}

			if (date) {
				where.date = date
			}

			if (groupFull) {
				where.groupFull = groupFull
			}

			return await prisma.replacement.findMany({
				where,
				orderBy: [
					{ date: 'desc' },
					{ groupFull: 'asc' },
					{ pairNumber: 'asc' },
				],
			})
		})

		return NextResponse.json({ replacements })
	} catch (error: any) {
		console.error('Error fetching replacements:', error)

		// Return empty array if database is unavailable
		if (error.code === 'P1017' || error.message?.includes('connection')) {
			return NextResponse.json({ replacements: [] })
		}

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
		await retryOperation(async () => {
			return await prisma.replacement.deleteMany({
				where: { date },
			})
		})

		return NextResponse.json({ success: true })
	} catch (error: any) {
		console.error('Error deleting replacements:', error)
		return NextResponse.json(
			{ error: 'Ошибка при удалении замен' },
			{ status: 500 },
		)
	}
}
