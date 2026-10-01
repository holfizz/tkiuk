import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
	ApiError,
	apiError,
	audit,
	checkOrigin,
	SESSION_COOKIE,
	sessionHash,
	verifyPassword,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
	try {
		checkOrigin(request)
		const { username, password } = await request.json()
		if (
			typeof username !== 'string' ||
			typeof password !== 'string' ||
			username.length > 100 ||
			password.length > 256
		)
			throw new ApiError(400, 'Проверьте логин и пароль')
		const user = await prisma.user.findUnique({
			where: { username: username.trim().toLowerCase() },
		})
		if (user?.lockedUntil && user.lockedUntil > new Date())
			throw new ApiError(429, 'Слишком много попыток. Повторите через 15 минут')
		// Perform a password derivation even for an unknown account.
		const valid = await verifyPassword(
			password,
			user?.passwordHash ??
				`00000000000000000000000000000000:${'00'.repeat(64)}`,
		)
		if (!user || !user.active || !valid) {
			if (user)
				await prisma.$transaction(async (tx) => {
					const failed = await tx.user.update({
						where: { id: user.id },
						data: { failedLogins: { increment: 1 } },
					})
					if (failed.failedLogins >= 5)
						await tx.user.update({
							where: { id: user.id },
							data: {
								lockedUntil: new Date(Date.now() + 15 * 60_000),
								failedLogins: 0,
							},
						})
					await audit(tx, user, 'LOGIN_FAILED', 'auth', {})
				})
			throw new ApiError(401, 'Неверный логин или пароль')
		}
		const token = randomBytes(32).toString('hex')
		const expiresAt = new Date(Date.now() + 8 * 60 * 60_000)
		await prisma.$transaction(async (tx) => {
			await tx.user.update({
				where: { id: user.id },
				data: { failedLogins: 0, lockedUntil: null },
			})
			await tx.session.deleteMany({
				where: { userId: user.id, expiresAt: { lte: new Date() } },
			})
			await tx.session.create({
				data: { id: sessionHash(token), userId: user.id, expiresAt },
			})
			await audit(tx, user, 'LOGIN', 'auth', {})
		})
		const response = NextResponse.json({
			user: {
				id: user.id,
				username: user.username,
				name: user.name,
				campus: user.campus,
			},
		})
		response.cookies.set(SESSION_COOKIE, token, {
			httpOnly: true,
			sameSite: 'lax',
			secure: request.nextUrl.protocol === 'https:',
			path: '/',
			expires: expiresAt,
		})
		return response
	} catch (error) {
		return apiError(error)
	}
}
