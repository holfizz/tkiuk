const DAY = 86_400_000
function moscowDate(date: Date) {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Europe/Moscow',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(date)
	const get = (type: string) =>
		Number(parts.find((p) => p.type === type)!.value)
	return new Date(Date.UTC(get('year'), get('month') - 1, get('day')))
}
function monday(date: Date) {
	return date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY
}
export function getAcademicYearStart(date = new Date()): Date {
	const day = moscowDate(date)
	return new Date(
		Date.UTC(day.getUTCFullYear() - (day.getUTCMonth() < 8 ? 1 : 0), 8, 1),
	)
}
export function getCurrentWeekNumber(date = new Date()): number {
	return (
		Math.floor(
			(monday(moscowDate(date)) - monday(getAcademicYearStart(date))) /
				(7 * DAY),
		) + 1
	)
}
export function calculateCurrentWeekType(
	date = new Date(),
	settings?: {
		currentWeekType: string
		startDate: string | null
		manualOverride?: boolean
	} | null,
): 'numerator' | 'denominator' {
	if (
		settings?.manualOverride &&
		settings.startDate &&
		!Number.isNaN(Date.parse(settings.startDate)) &&
		['numerator', 'denominator'].includes(settings.currentWeekType)
	) {
		const weeks = Math.floor(
			(monday(moscowDate(date)) -
				monday(new Date(`${settings.startDate}T00:00:00Z`))) /
				(7 * DAY),
		)
		const initial = settings.currentWeekType === 'numerator'
		return (weeks % 2 === 0 ? initial : !initial) ? 'numerator' : 'denominator'
	}
	return getCurrentWeekNumber(date) % 2 === 1 ? 'numerator' : 'denominator'
}
export function moscowDayString(date = new Date()) {
	return moscowDate(date).toISOString().slice(0, 10)
}
