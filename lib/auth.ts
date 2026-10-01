export { hashPassword, verifyPassword } from './passwords'
import { createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Campus, Prisma } from '@prisma/client'
import { prisma } from './prisma'

export const SESSION_COOKIE = 'tkuik_session'
export type Actor = {
	id: number
	username: string
	name: string
	campus: Campus | null
}
export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message)
	}
}
export function apiError(error: unknown) {
	if (error instanceof ApiError)
		return NextResponse.json({ error: error.message }, { status: error.status })
	if (error instanceof SyntaxError)
		return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
	console.error(
		'API operation failed:',
		error instanceof Error ? error.name : 'Unknown error',
	)
	return NextResponse.json(
		{ error: 'Не удалось выполнить операцию' },
		{ status: 500 },
	)
}
export const sessionHash = (token: string) =>
	createHash('sha256').update(token).digest('hex')
export async function currentUser(): Promise<Actor | null> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value
	if (!token) return null
	const session = await prisma.session.findUnique({
		where: { id: sessionHash(token) },
		include: { user: true },
	})
	if (!session || session.expiresAt <= new Date() || !session.user.active)
		return null
	const { id, username, name, campus } = session.user
	return { id, username, name, campus }
}
export function checkOrigin(request: NextRequest) {
	const origin = request.headers.get('origin')
	// Next's internal URL may use 0.0.0.0 inside Docker. The browser targets Host.
	const expected = new URL(request.url)
	expected.host = request.headers.get('host') || expected.host
	if (
		request.headers.get('sec-fetch-site') === 'cross-site' ||
		(origin && origin !== expected.origin)
	) {
		throw new ApiError(403, 'Недопустимый источник запроса')
	}
}
export async function requireUser(request?: NextRequest) {
	if (request) checkOrigin(request)
	const user = await currentUser()
	if (!user) throw new ApiError(401, 'Войдите в аккаунт')
	return user
}
export function requireCampus(user: Actor, campus: Campus | null) {
	if (user.campus && user.campus !== campus)
		throw new ApiError(403, 'Нет доступа к этой площадке')
}
export function parseCampus(value: unknown): Campus {
	if (value !== 'MAIN' && value !== 'SECONDARY')
		throw new ApiError(400, 'Укажите площадку')
	return value
}
export function parseId(value: unknown) {
	const id = Number(value)
	if (!Number.isSafeInteger(id) || id < 1)
		throw new ApiError(400, 'Неверный ID')
	return id
}
export function audit(
	tx: Prisma.TransactionClient,
	user: Actor,
	action: string,
	entity: string,
	details: unknown,
	campus: Campus | null = user.campus,
	entityId?: string,
) {
	return tx.auditLog.create({
		data: {
			userId: user.id,
			username: user.username,
			action,
			entity,
			entityId,
			campus,
			details: JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue,
		},
	})
}
