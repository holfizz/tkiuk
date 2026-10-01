import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { requireLocalDatabase } from './local-env'
const base = 'http://localhost:3002'
const db = new PrismaClient()
const credentials = readdirSync('.local')
	.filter((f) => f.startsWith('accounts-'))
	.flatMap((f) => JSON.parse(readFileSync(`.local/${f}`, 'utf8')))
async function call(
	path: string,
	method = 'GET',
	body?: unknown,
	cookie?: string,
) {
	const res = await fetch(base + path, {
		method,
		headers: {
			Origin: base,
			...(body ? { 'Content-Type': 'application/json' } : {}),
			...(cookie ? { Cookie: cookie } : {}),
		},
		...(body ? { body: JSON.stringify(body) } : {}),
	})
	return {
		status: res.status,
		body: await res.json(),
		cookie: res.headers.get('set-cookie')?.split(';')[0],
		headers: res.headers,
	}
}
async function main() {
	requireLocalDatabase()
	const sessions: Record<string, string> = {}
	const ids: number[] = []
	const replacementIds: number[] = []
	try {
		for (const [path, method] of [
			['/api/schedule/update', 'PUT'],
			['/api/schedule/update', 'POST'],
			['/api/schedule/delete?id=1', 'DELETE'],
			['/api/upload', 'POST'],
			['/api/replacements/upload', 'POST'],
			['/api/replacements/update', 'PUT'],
			['/api/replacements?date=2026-10-02&campus=MAIN', 'DELETE'],
			['/api/week-settings', 'PUT'],
			['/api/audit', 'GET'],
		]) {
			assert.equal((await call(path, method)).status, 401, `${method} ${path}`)
		}
		console.log(
			'PASS: all nine protected API operations reject unauthenticated requests',
		)
		for (const username of ['dispatcher1', 'dispatcher2', 'admin']) {
			const account = credentials.find((a) => a.username === username)
			assert.ok(account)
			const login = await call('/api/auth/login', 'POST', {
				username,
				password: account.password,
			})
			assert.equal(login.status, 200)
			assert.ok(login.cookie)
			sessions[username] = login.cookie
			assert.match(login.headers.get('set-cookie')!, /HttpOnly/i)
			const session = await call(
				'/api/auth/session',
				'GET',
				undefined,
				login.cookie,
			)
			assert.equal(session.body.user.username, username)
		}
		assert.equal(
			(
				await call('/api/auth/login', 'POST', {
					username: 'admin',
					password: 'admin',
				})
			).status,
			401,
		)
		console.log(
			'PASS: three accounts use server sessions; old admin/admin is rejected',
		)
		const original = await db.schedule.findFirstOrThrow({
			where: { campus: 'SECONDARY' },
		})
		const { id, createdAt, updatedAt, ...data } = original
		for (const campus of ['MAIN', 'SECONDARY'] as const) {
			const row = await db.schedule.create({
				data: {
					...data,
					campus,
					groupFull: `TEST-${campus}`,
					subject: 'Тест проверки прав',
				},
			})
			ids.push(row.id)
			const rep = await db.replacement.create({
				data: {
					campus,
					course: row.course,
					groupFull: row.groupFull,
					date: '2099-01-01',
					pairNumber: 1,
					newSubject: 'Тест',
					newTeacher: 'Тест',
				},
			})
			replacementIds.push(rep.id)
		}
		for (let index = 0; index < 2; index++) {
			const cookie = sessions[index === 0 ? 'dispatcher1' : 'dispatcher2']
			const own = await db.schedule.findUniqueOrThrow({
				where: { id: ids[index] },
			})
			const other = await db.schedule.findUniqueOrThrow({
				where: { id: ids[1 - index] },
			})
			assert.equal(
				(
					await call(
						'/api/schedule/update',
						'PUT',
						{ ...own, room: 'TEST-EDIT' },
						cookie,
					)
				).status,
				200,
			)
			assert.equal(
				(
					await call(
						'/api/schedule/update',
						'PUT',
						{ ...other, campus: own.campus, room: 'HACK' },
						cookie,
					)
				).status,
				403,
			)
			assert.equal(
				(
					await call(
						`/api/schedule/delete?id=${other.id}`,
						'DELETE',
						undefined,
						cookie,
					)
				).status,
				403,
			)
			assert.equal(
				(
					await call(
						'/api/schedule/update',
						'POST',
						{ ...other, id: undefined },
						cookie,
					)
				).status,
				403,
			)
			assert.equal(
				(
					await call(
						'/api/replacements/update',
						'PUT',
						{
							id: replacementIds[1 - index],
							newSubject: 'HACK',
							newTeacher: '',
						},
						cookie,
					)
				).status,
				403,
			)
			assert.equal(
				(
					await call(
						'/api/replacements/update',
						'PUT',
						{ id: replacementIds[index], newSubject: '', newTeacher: '' },
						cookie,
					)
				).status,
				200,
			)
			assert.equal(
				(
					await call(
						`/api/replacements?date=2099-01-01&campus=${other.campus}`,
						'DELETE',
						undefined,
						cookie,
					)
				).status,
				403,
			)
			assert.equal(
				(
					await call(
						'/api/week-settings',
						'PUT',
						{ currentWeekType: 'numerator' },
						cookie,
					)
				).status,
				403,
			)
			const logs = await call('/api/audit', 'GET', undefined, cookie)
			assert.equal(logs.status, 403)
			assert.equal(logs.body.logs, undefined)
			const form = new FormData()
			form.append('campus', other.campus)
			form.append('course', '1')
			assert.equal(
				(
					await fetch(base + '/api/upload', {
						method: 'POST',
						headers: { Origin: base, Cookie: cookie },
						body: form,
					})
				).status,
				403,
			)
		}
		console.log(
			'PASS: both dispatchers edit only their campus; forged campus cannot bypass ID checks; cancellations work',
		)
		const adminLogs = await call('/api/audit', 'GET', undefined, sessions.admin)
		assert.equal(adminLogs.status, 200)
		assert.ok(Array.isArray(adminLogs.body.logs))
		for (const id of ids) {
			const row = await db.schedule.findUniqueOrThrow({ where: { id } })
			assert.equal(
				(
					await call(
						'/api/schedule/update',
						'PUT',
						{ ...row, room: 'GLOBAL-ADMIN' },
						sessions.admin,
					)
				).status,
				200,
			)
		}
		const before = await db.schedule.count()
		const form = new FormData()
		form.append('campus', 'SECONDARY')
		form.append('course', '1')
		form.append('file', new Blob(['not a schedule']), 'invalid.xls')
		assert.equal(
			(
				await fetch(base + '/api/upload', {
					method: 'POST',
					headers: { Origin: base, Cookie: sessions.admin },
					body: form,
				})
			).status,
			400,
		)
		assert.equal(await db.schedule.count(), before)
		console.log(
			'PASS: global admin edits both campuses; invalid upload leaves the database intact',
		)
		assert.equal(
			(
				await fetch(base + '/api/schedule/update', {
					method: 'PUT',
					headers: {
						Cookie: sessions.admin,
						Origin: 'https://untrusted.example',
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(original),
				})
			).status,
			403,
		)
		const logs = await db.auditLog.findMany({
			where: { entity: 'schedule', entityId: { in: ids.map(String) } },
		})
		assert.equal(logs.length, 4)
		assert.ok(
			logs.every(
				(log) => (log.details as any).before && (log.details as any).after,
			),
		)
		console.log(
			'PASS: cross-origin writes rejected; successful changes recorded atomically with before/after',
		)
		const oldSettings = await db.weekSettings.findMany()
		try {
			const settings = await call(
				'/api/week-settings',
				'PUT',
				{ currentWeekType: 'denominator' },
				sessions.admin,
			)
			assert.equal(settings.status, 200)
			const first = await call('/api/week-settings')
			const second = await call('/api/week-settings')
			assert.equal(first.body.settings.currentWeekType, 'denominator')
			assert.equal(
				second.body.settings.updatedAt,
				first.body.settings.updatedAt,
			)
			assert.equal(first.body.settings.manualOverride, true)
			console.log(
				'PASS: manual week setting persists; public GET does not write to the database',
			)
		} finally {
			await db.$transaction(async (tx) => {
				await tx.weekSettings.deleteMany()
				if (oldSettings.length)
					await tx.weekSettings.createMany({ data: oldSettings })
			})
		}

		// A mixed-campus/unknown-group DOCX must roll back even rows parsed first.
		async function uploadReplacementFixture(name: string) {
			const form = new FormData()
			form.append('campus', 'SECONDARY')
			form.append(
				'file',
				new Blob([readFileSync(`tests/fixtures/${name}.docx`)]),
				`${name}.docx`,
			)
			return fetch(base + '/api/replacements/upload', {
				method: 'POST',
				headers: { Origin: base, Cookie: sessions.dispatcher2 },
				body: form,
			})
		}
		const replacementWhere = { date: '2099-01-01', groupFull: '9ПО-22к' }
		assert.equal(await db.replacement.count({ where: replacementWhere }), 0)
		assert.equal(
			(await uploadReplacementFixture('replacements-mixed')).status,
			400,
		)
		assert.equal(await db.replacement.count({ where: replacementWhere }), 0)
		const uploaded = await uploadReplacementFixture('replacements-campus2')
		assert.equal(uploaded.status, 200, JSON.stringify(await uploaded.json()))
		const replacement = await db.replacement.findFirstOrThrow({
			where: replacementWhere,
		})
		replacementIds.push(replacement.id)
		assert.equal(replacement.campus, 'SECONDARY')
		assert.equal(replacement.course, 2)
		assert.equal(replacement.newSubject, 'Проверка импорта')
		assert.equal(
			(
				await call(
					'/api/replacements?date=2099-01-01&campus=SECONDARY',
					'DELETE',
					undefined,
					sessions.dispatcher2,
				)
			).status,
			200,
		)
		assert.equal(
			await db.replacement.count({ where: { id: replacementIds[0] } }),
			1,
		)
		console.log(
			'PASS: DOCX import assigns correct campus/course; invalid mixed import rolls back; deletion preserves other campus',
		)
		const scheduleFile = new FormData()
		scheduleFile.append('campus', 'SECONDARY')
		scheduleFile.append('course', '4')
		scheduleFile.append(
			'file',
			new Blob([
				readFileSync(
					'data/schedules/2026-2027-sem1/Rasp_4_kurs_1_sem_26-27_s_7_09.xls',
				),
			]),
			'course4.xls',
		)
		const scheduleUpload = await fetch(base + '/api/upload', {
			method: 'POST',
			headers: { Origin: base, Cookie: sessions.dispatcher2 },
			body: scheduleFile,
		})
		assert.equal(scheduleUpload.status, 200)
		assert.equal((await scheduleUpload.json()).count, 322)
		assert.equal(
			await db.schedule.count({ where: { course: 4, campus: 'SECONDARY' } }),
			322,
		)
		console.log(
			'PASS: authenticated Excel upload imports the selected course successfully',
		)
		for (const cookie of Object.values(sessions)) {
			assert.equal(
				(await call('/api/auth/logout', 'POST', undefined, cookie)).status,
				200,
			)
			assert.equal(
				(await call('/api/auth/session', 'GET', undefined, cookie)).status,
				401,
			)
		}
		console.log('PASS: logout revokes sessions on the server')
		const friday = await call(
			'/api/schedule/student?course=2&group=' +
				encodeURIComponent('9ПО-22к') +
				'&campus=SECONDARY',
		)
		assert.equal(friday.status, 200)
		const entries = friday.body.schedule.filter(
			(s: any) => s.dayOfWeek === 'Пятница',
		)
		assert.ok(
			!entries.some(
				(s: any) => s.timeSlot === '09:00-10:35' && s.weekType !== 'numerator',
			),
		)
		assert.ok(
			!entries.some(
				(s: any) =>
					s.timeSlot === '14:40-16:15' && s.weekType !== 'denominator',
			),
		)
		console.log('PASS: public student API returns corrected Friday timetable')
	} finally {
		await db.replacement.deleteMany({ where: { id: { in: replacementIds } } })
		await db.schedule.deleteMany({ where: { id: { in: ids } } })
		await db.$disconnect()
	}
}
main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
