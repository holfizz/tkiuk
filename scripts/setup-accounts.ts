import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { randomBytes, randomInt } from 'node:crypto'
import { PrismaClient, Campus } from '@prisma/client'
import { hashPassword } from '../lib/passwords'
import { requireLocalDatabase } from './local-env'

async function main() {
	const production = process.argv.includes('--production')
	if (production) {
		const url = new URL(process.env.DATABASE_URL || '')
		if (
			!process.argv.includes('--apply') ||
			url.hostname !== 'db.prisma.io' ||
			url.pathname !== '/postgres' ||
			url.searchParams.get('sslmode') !== 'require'
		) {
			throw new Error(
				'Для production нужен --production --apply и явно переданный DATABASE_URL Prisma Postgres с SSL.',
			)
		}
	} else {
		requireLocalDatabase()
	}
	const db = new PrismaClient()
	const accounts: { username: string; name: string; campus: Campus | null }[] =
		[
			{ username: 'dispatcher1', name: 'Диспетчер 1 площадки', campus: 'MAIN' },
			{
				username: 'dispatcher2',
				name: 'Диспетчер 2 площадки',
				campus: 'SECONDARY',
			},
			{ username: 'admin', name: 'Главный администратор', campus: null },
		]
	let credentialFile: string | undefined
	try {
		const existing = await db.user.findMany({
			where: { username: { in: accounts.map((a) => a.username) } },
		})
		for (const account of existing) {
			if (
				account.campus !==
				accounts.find((a) => a.username === account.username)!.campus
			) {
				throw new Error(
					`Аккаунт ${account.username} уже существует с другими правами. Изменений нет.`,
				)
			}
			console.log(`${account.username}: уже существует, пароль сохранён`)
		}
		const pending = accounts.filter(
			(a) => !existing.some((user) => user.username === a.username),
		)
		if (!pending.length) return
		const created = await Promise.all(
			pending.map(async (account) => {
				// 192 random bits plus all four character classes, shuffled cryptographically.
				const chars = [
					...randomBytes(24).toString('base64url'),
					'A',
					'a',
					'7',
					'!',
				]
				for (let i = chars.length - 1; i > 0; i--) {
					const j = randomInt(i + 1)
					;[chars[i], chars[j]] = [chars[j], chars[i]]
				}
				const password = chars.join('')
				return {
					...account,
					password,
					passwordHash: await hashPassword(password),
				}
			}),
		)
		mkdirSync('.local', { recursive: true, mode: 0o700 })
		credentialFile = `.local/${production ? 'production-' : ''}accounts-${Date.now()}.json`
		// Save credentials before committing, so a disk failure cannot strand new accounts.
		writeFileSync(
			credentialFile,
			JSON.stringify(
				created.map(({ passwordHash, ...account }) => account),
				null,
				2,
			) + '\n',
			{ mode: 0o600, flag: 'wx' },
		)
		try {
			await db.$transaction(
				async (tx) => {
					await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261002)`
					for (const { password, ...account } of created) {
						const user = await tx.user.create({ data: account })
						await tx.auditLog.create({
							data: {
								username: production ? 'setup-production' : 'setup-local',
								action: 'ACCOUNT_CREATE',
								entity: 'user',
								entityId: String(user.id),
								campus: account.campus,
								details: {
									username: account.username,
									name: account.name,
									environment: production ? 'production' : 'local',
								},
							},
						})
					}
				},
				{ timeout: 30_000 },
			)
		} catch (error) {
			unlinkSync(credentialFile)
			throw error
		}
		console.log(
			`Созданы ${created.length} аккаунта (${production ? 'production' : 'local'}). Пароли: ${credentialFile}`,
		)
	} finally {
		await db.$disconnect()
	}
}
main().catch((error) => {
	console.error(
		error instanceof Error
			? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[REDACTED]')
			: 'Не удалось создать аккаунты',
	)
	process.exitCode = 1
})
