// Combine subgroups for the read-only student card without losing teachers/rooms.
export function combineLessons<
	T extends { subject: string; teacher: string; room?: string | null },
>(items: T[]): T | undefined {
	if (!items.length) return undefined
	const unique = (values: (string | null | undefined)[]) =>
		[...new Set(values.filter(Boolean))].join(', ')
	return {
		...items[0],
		subject: unique(items.map((i) => i.subject)),
		teacher: unique(items.map((i) => i.teacher)),
		room: unique(items.map((i) => i.room)),
	}
}
