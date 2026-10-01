import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
	apiError,
	audit,
	requireUser,
	SESSION_COOKIE,
	sessionHash,
} from '@/lib/auth'
export async function POST(request: NextRequest) {
	try {
		const user = await requireUser(request)
		const token = (await cookies()).get(SESSION_COOKIE)!.value
		await prisma.$transaction(async (tx) => {
			await tx.session.deleteMany({ where: { id: sessionHash(token) } })
			await audit(tx, user, 'LOGOUT', 'auth', {})
		})
		const response = NextResponse.json({ success: true })
		response.cookies.set(SESSION_COOKIE, '', {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 0,
		})
		return response
	} catch (error) {
		return apiError(error)
	}
}
