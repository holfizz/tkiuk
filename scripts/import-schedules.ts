import { readFileSync } from 'node:fs'
import { PrismaClient, Campus } from '@prisma/client'
import { parseSchedule, replaceSchedule } from '../lib/scheduleImport'
import { requireLocalDatabase } from './local-env'

async function main() {
	const campusArg = process.argv
		.find((a) => a.startsWith('--campus='))
		?.split('=')[1]
	if (campusArg !== 'MAIN' && campusArg !== 'SECONDARY')
		throw new Error('Укажите --campus=MAIN или --campus=SECONDARY')
	const campus: Campus = campusArg
	const files = [1, 2, 3, 4].map((course) => {
		const path = `data/schedules/2026-2027-sem1/Rasp_${course}_kurs_1_sem_26-27_s_7_09.xls`
		const entries = parseSchedule(readFileSync(path), course, campus)
		return { course, path, entries }
	})
	for (const file of files)
		console.log(
			`${file.course} курс: ${file.entries.length} записей; ${new Set(file.entries.map((e) => e.groupFull)).size} групп`,
		)
	if (!process.argv.includes('--apply')) {
		console.log('Предпросмотр. Для записи в локальную базу добавьте --apply.')
		return
	}
	requireLocalDatabase()
	const db = new PrismaClient()
	try {
		await db.$transaction(
			async (tx) => {
				for (const file of files) {
					const before = await replaceSchedule(
						tx,
						file.entries,
						file.course,
						campus,
					)
					await tx.auditLog.create({
						data: {
							username: 'local-import',
							action: 'IMPORT',
							entity: 'schedule',
							campus,
							details: JSON.parse(
								JSON.stringify({
									file: file.path,
									course: file.course,
									before,
									after: file.entries,
								}),
							),
						},
					})
				}
			},
			{ timeout: 60_000 },
		)
		console.log('Все четыре расписания записаны одной транзакцией.')
	} finally {
		await db.$disconnect()
	}
}
main().catch((error) => {
	console.error(error.message)
	process.exitCode = 1
})
