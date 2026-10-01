import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
	ApiError,
	apiError,
	audit,
	parseCampus,
	requireCampus,
	requireUser,
} from '@/lib/auth'
import { parseSchedule, replaceSchedule } from '@/lib/scheduleImport'
export async function POST(request: NextRequest) {
	try {
		const user = await requireUser(request)
		const form = await request.formData()
		const campus = parseCampus(form.get('campus'))
		requireCampus(user, campus)
		const course = Number(form.get('course'))
		const file = form.get('file')
		if (
			!(file instanceof File) ||
			!/\.xlsx?$/i.test(file.name) ||
			file.size > 5 * 1024 * 1024
		)
			throw new ApiError(400, 'Выберите Excel-файл до 5 МБ')
		let entries
		try {
			entries = parseSchedule(
				Buffer.from(await file.arrayBuffer()),
				course,
				campus,
			)
		} catch (error) {
			throw new ApiError(
				400,
				error instanceof Error ? error.message : 'Неверный файл',
			)
		}
		await prisma.$transaction(
			async (tx) => {
				const before = await replaceSchedule(tx, entries, course, campus)
				await audit(
					tx,
					user,
					'IMPORT',
					'schedule',
					{ file: file.name, course, before, after: entries },
					campus,
				)
			},
			{ timeout: 30_000 },
		)
		return NextResponse.json({ success: true, count: entries.length })
	} catch (error) {
		return apiError(error)
	}
}
