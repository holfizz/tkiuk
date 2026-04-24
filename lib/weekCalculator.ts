/**
 * Вычисляет тип текущей недели (числитель/знаменатель) на основе учебного года
 * Учебный год в России начинается 1 сентября
 */
export function calculateCurrentWeekType(): 'numerator' | 'denominator' {
	const now = new Date()
	const currentYear = now.getFullYear()
	const currentMonth = now.getMonth() + 1 // 1-12

	// Определяем начало учебного года
	// Если сейчас сентябрь-декабрь, то учебный год начался в этом году
	// Если январь-август, то учебный год начался в прошлом году
	const academicYearStart =
		currentMonth >= 9
			? new Date(currentYear, 8, 1) // 1 сентября текущего года
			: new Date(currentYear - 1, 8, 1) // 1 сентября прошлого года

	// Вычисляем количество миллисекунд с начала учебного года
	const diffTime = now.getTime() - academicYearStart.getTime()

	// Переводим в дни
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

	// Вычисляем номер недели (начиная с 1)
	const weekNumber = Math.floor(diffDays / 7) + 1

	// Четные недели - знаменатель, нечетные - числитель
	// Первая неделя (1 сентября) - числитель
	return weekNumber % 2 === 1 ? 'numerator' : 'denominator'
}

/**
 * Получает дату начала текущего учебного года
 */
export function getAcademicYearStart(): Date {
	const now = new Date()
	const currentYear = now.getFullYear()
	const currentMonth = now.getMonth() + 1

	return currentMonth >= 9
		? new Date(currentYear, 8, 1)
		: new Date(currentYear - 1, 8, 1)
}

/**
 * Получает номер текущей учебной недели
 */
export function getCurrentWeekNumber(): number {
	const now = new Date()
	const academicYearStart = getAcademicYearStart()

	const diffTime = now.getTime() - academicYearStart.getTime()
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

	return Math.floor(diffDays / 7) + 1
}
