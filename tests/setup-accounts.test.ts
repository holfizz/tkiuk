import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

test('production account setup requires an explicit production database URL', () => {
	const directory = mkdtempSync(join(tmpdir(), 'tkiuk-accounts-'))
	try {
		writeFileSync(
			join(directory, '.env'),
			'DATABASE_URL=postgresql://user:secret@db.prisma.io/postgres?sslmode=require\n',
		)
		const env = { ...process.env }
		delete env.DATABASE_URL
		const run = (args: string[], databaseUrl?: string) => {
			const childEnv = { ...env }
			if (databaseUrl) childEnv.DATABASE_URL = databaseUrl
			return spawnSync(
				resolve('node_modules/.bin/tsx'),
				[resolve('scripts/setup-accounts.ts'), ...args],
				{ cwd: directory, env: childEnv, encoding: 'utf8' },
			)
		}

		const fromEnvFile = run(['--production', '--apply'])
		assert.equal(fromEnvFile.status, 1)
		assert.match(fromEnvFile.stderr, /передайте DATABASE_URL через переменную окружения/)

		const localDatabase = run(
			['--production', '--apply'],
			'postgresql://user:secret@127.0.0.1:55432/tkuik_dev?sslmode=require',
		)
		assert.equal(localDatabase.status, 1)
		assert.match(localDatabase.stderr, /Для production нужен --production --apply/)

		const missingApply = run(
			['--production'],
			'postgresql://user:secret@db.prisma.io/postgres?sslmode=require',
		)
		assert.equal(missingApply.status, 1)
		assert.match(missingApply.stderr, /Для production нужен --production --apply/)
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
})
