import { existsSync } from 'node:fs'
if (existsSync('.env')) process.loadEnvFile('.env')
export function requireLocalDatabase() {
	const url = new URL(process.env.DATABASE_URL || '')
	if (
		!['localhost', '127.0.0.1', 'db'].includes(url.hostname) ||
		!['/tkuik_dev', '/tkuik_test'].includes(url.pathname)
	) {
		throw new Error(
			'Эта команда работает только с локальной базой tkuik_dev/tkuik_test. Продовая база не изменена.',
		)
	}
}
