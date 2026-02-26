import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
	// Получаем преподавателей из отдельной таблицы
	const teachers = await prisma.teacher.findMany({
		orderBy: { name: 'asc' },
	})

	const teacherNames = teachers
		.map(t => t.name)
		.filter(name => name && name.trim())

	return NextResponse.json({ teachers: teacherNames })
}
