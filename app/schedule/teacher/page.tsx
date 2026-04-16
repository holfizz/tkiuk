'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Footer from '../../components/Footer'
import Header from '../../components/Header'

interface ScheduleItem {
	id: number
	course: number
	group: string
	groupFull: string
	specialty: string
	dayOfWeek: string
	timeSlot: string
	subject: string
	teacher: string
	room?: string
	weekType: string
}

interface Replacement {
	id: number
	date: string
	course: number
	groupFull: string
	pairNumber: number
	newSubject: string
	newTeacher: string
	room?: string
}

function TeacherScheduleContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const teacher = searchParams.get('teacher')

	const [schedule, setSchedule] = useState<ScheduleItem[]>([])
	const [replacements, setReplacements] = useState<Replacement[]>([])
	const [loading, setLoading] = useState(true)
	const [currentWeekType, setCurrentWeekType] = useState<string>('numerator')

	useEffect(() => {
		if (teacher) {
			loadSchedule()
			loadReplacements()
			loadWeekSettings()
		}
	}, [teacher])

	const loadWeekSettings = async () => {
		try {
			const res = await fetch('/api/week-settings')
			const data = await res.json()
			if (data.settings) {
				setCurrentWeekType(data.settings.currentWeekType)
			}
		} catch (error) {
			console.error('Error loading week settings:', error)
		}
	}

	const loadSchedule = async () => {
		setLoading(true)
		const res = await fetch(
			`/api/schedule/teacher?teacher=${encodeURIComponent(teacher || '')}`,
		)
		const data = await res.json()
		setSchedule(data.schedule || [])
		setLoading(false)
	}

	const loadReplacements = async () => {
		// Загружаем замены где этот преподаватель назначен
		const res = await fetch(`/api/replacements`)
		const data = await res.json()
		// Фильтруем только замены для этого преподавателя
		const filtered = (data.replacements || []).filter(
			(r: Replacement) => r.newTeacher === teacher,
		)
		setReplacements(filtered)
	}

	const getTodayDate = () => {
		const today = new Date()
		const year = today.getFullYear()
		const month = String(today.getMonth() + 1).padStart(2, '0')
		const day = String(today.getDate()).padStart(2, '0')
		return `${year}-${month}-${day}`
	}

	const getReplacement = (groupFull: string, pairNumber: number) => {
		const todayDate = getTodayDate()
		return replacements.find(
			r =>
				r.date === todayDate &&
				r.groupFull === groupFull &&
				r.pairNumber === pairNumber,
		)
	}

	const groupedByDay = () => {
		const days = [
			'Понедельник',
			'Вторник',
			'Среда',
			'Четверг',
			'Пятница',
			'Суббота',
		]
		const timeSlots = [
			'09:00-10:35',
			'10:45-12:20',
			'12:55-14:30',
			'14:40-16:15',
		]

		return days.map(day => {
			const daySchedule = timeSlots.map((time, index) => {
				// Находим все пары для этого времени
				const numeratorItems = schedule.filter(
					s =>
						s.dayOfWeek === day &&
						s.timeSlot === time &&
						s.weekType === 'numerator',
				)
				const denominatorItems = schedule.filter(
					s =>
						s.dayOfWeek === day &&
						s.timeSlot === time &&
						s.weekType === 'denominator',
				)
				const bothItems = schedule.filter(
					s =>
						s.dayOfWeek === day && s.timeSlot === time && s.weekType === 'both',
				)

				return {
					pairNumber: index + 1,
					time,
					numeratorItems,
					denominatorItems,
					bothItems,
				}
			})
			return { day, schedule: daySchedule }
		})
	}

	const getTodayDayName = () => {
		const days = [
			'Воскресенье',
			'Понедельник',
			'Вторник',
			'Среда',
			'Четверг',
			'Пятница',
			'Суббота',
		]
		return days[new Date().getDay()]
	}

	const handleReset = () => {
		localStorage.removeItem('userRole')
		localStorage.removeItem('userTeacher')
		router.push('/')
	}

	const getWeekBadge = (weekType: string) => {
		if (weekType === 'numerator')
			return <span className='week-badge numerator'>Ч</span>
		if (weekType === 'denominator')
			return <span className='week-badge denominator'>З</span>
		return null
	}

	if (loading) {
		return (
			<>
				<Header />
				<div className='page-content'>
					<div className='modern-container'>
						<div className='loading'>Загрузка расписания...</div>
					</div>
				</div>
				<Footer />
			</>
		)
	}

	return (
		<>
			<Header
				title={teacher || 'Преподаватель'}
				subtitle='Расписание занятий'
				showChangeButton={true}
				onChangeClick={handleReset}
				changeButtonText='Сменить преподавателя'
			/>

			<div className='page-content'>
				<div className='modern-container'>
					{schedule.length === 0 ? (
						<div className='selection-container'>
							<p style={{ textAlign: 'center', color: '#6b7280' }}>
								Расписание не найдено
							</p>
						</div>
					) : (
						<>
							<div
								style={{
									background:
										'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
									padding: '20px 28px',
									borderRadius: '28px',
									boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
									marginBottom: '24px',
									textAlign: 'center',
									border: '3px solid rgba(255, 255, 255, 0.2)',
									position: 'relative',
									overflow: 'hidden',
								}}
							>
								{/* Animated background effect */}
								<div
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										background:
											currentWeekType === 'numerator'
												? 'linear-gradient(45deg, rgba(147, 51, 234, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)'
												: 'linear-gradient(45deg, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
										animation: 'pulse 2s ease-in-out infinite alternate',
									}}
								/>
								<div
									style={{
										position: 'relative',
										zIndex: 1,
									}}
								>
									<div
										style={{
											fontSize: '1rem',
											color: 'rgba(255, 255, 255, 0.9)',
											marginBottom: '8px',
											fontWeight: 500,
											textTransform: 'uppercase',
											letterSpacing: '1px',
										}}
									>
										📅 Текущая неделя
									</div>
									<div
										style={{
											fontSize: '1.8rem',
											fontWeight: 700,
											color: 'white',
											textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											gap: '12px',
										}}
										className='week-indicator-mobile'
									>
										<span
											style={{
												display: 'inline-flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: '48px',
												height: '48px',
												borderRadius: '50%',
												background:
													currentWeekType === 'numerator'
														? '#9333ea'
														: '#22c55e',
												color: 'white',
												fontSize: '1.2rem',
												fontWeight: 900,
												boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
											}}
										>
											{currentWeekType === 'numerator' ? 'Ч' : 'З'}
										</span>
										{currentWeekType === 'numerator'
											? 'Числитель'
											: 'Знаменатель'}
									</div>
								</div>
							</div>

							<div className='time-legend'>
								<div className='time-item'>
									<span className='pair-num'>1 пара</span>
									<span className='pair-time'>09:00-10:35</span>
								</div>
								<div className='time-item'>
									<span className='pair-num'>2 пара</span>
									<span className='pair-time'>10:45-12:20</span>
								</div>
								<div className='time-item lunch-item'>
									<span className='pair-num'>🎉 Обед</span>
									<span className='pair-time'>12:20-12:55</span>
								</div>
								<div className='time-item'>
									<span className='pair-num'>3 пара</span>
									<span className='pair-time'>12:55-14:30</span>
								</div>
								<div className='time-item'>
									<span className='pair-num'>4 пара</span>
									<span className='pair-time'>14:40-16:15</span>
								</div>
							</div>

							<div className='schedule-grid'>
								{groupedByDay().map(({ day, schedule: daySchedule }) => {
									const isToday = day === getTodayDayName()

									// Проверяем есть ли замены на сегодня для этого дня
									const todayReplacements = isToday
										? daySchedule.filter(
												({
													pairNumber,
													numeratorItems,
													denominatorItems,
													bothItems,
												}) => {
													const allItems = [
														...numeratorItems,
														...denominatorItems,
														...bothItems,
													]
													return allItems.some(item =>
														getReplacement(item.groupFull, pairNumber),
													)
												},
											)
										: []

									// Показываем день если есть пары ИЛИ есть замены на сегодня
									const hasClasses = daySchedule.some(
										s =>
											s.numeratorItems.length > 0 ||
											s.denominatorItems.length > 0 ||
											s.bothItems.length > 0,
									)
									const hasReplacements = todayReplacements.length > 0

									if (!hasClasses && !hasReplacements) return null

									return (
										<div
											key={day}
											className={`day-card ${isToday ? 'today' : ''}`}
										>
											<h3 className='day-title'>{day}</h3>
											<div className='lessons-list'>
												{daySchedule.map(
													({
														pairNumber,
														numeratorItems,
														denominatorItems,
														bothItems,
													}) => {
														// Проверяем есть ли замены на сегодня для этой пары
														const allItems = [
															...numeratorItems,
															...denominatorItems,
															...bothItems,
														]

														const replacements = isToday
															? allItems
																	.map(item =>
																		getReplacement(item.groupFull, pairNumber),
																	)
																	.filter(Boolean)
															: []

														// Проверяем, есть ли пары после текущей
														const hasClassesAfter = daySchedule
															.slice(
																daySchedule.findIndex(
																	s => s.pairNumber === pairNumber,
																) + 1,
															)
															.some(
																s =>
																	s.numeratorItems.length > 0 ||
																	s.denominatorItems.length > 0 ||
																	s.bothItems.length > 0,
															)

														// Если есть замены - показываем их
														if (replacements.length > 0) {
															return replacements
																.map((replacement, idx) => {
																	if (!replacement) return null
																	return (
																		<div
																			key={`${pairNumber}-replacement-${idx}`}
																			className='lesson-card replacement-card'
																		>
																			<div className='lesson-number'>
																				{pairNumber}
																			</div>
																			<div className='lesson-content'>
																				<div className='replacement-badge'>
																					<svg
																						xmlns='http://www.w3.org/2000/svg'
																						width='14'
																						height='14'
																						viewBox='0 0 24 24'
																						style={{ flexShrink: 0 }}
																					>
																						<path
																							fill='currentColor'
																							d='M14.293 2.293a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414-1.414L16.586 8H5a1 1 0 0 1 0-2h11.586l-2.293-2.293a1 1 0 0 1 0-1.414m-4.586 10a1 1 0 0 1 0 1.414L7.414 16H19a1 1 0 1 1 0 2H7.414l2.293 2.293a1 1 0 0 1-1.414 1.414l-4-4a1 1 0 0 1 0-1.414l4-4a1 1 0 0 1 1.414 0'
																						></path>
																					</svg>
																					ЗАМЕНА
																				</div>
																				<div className='lesson-subject'>
																					{replacement.newSubject}
																				</div>
																				<div className='lesson-teacher'>
																					{replacement.groupFull}
																				</div>
																				{replacement.room && (
																					<div className='lesson-room'>
																						{replacement.room ===
																							'Дистанционно' ||
																						replacement.room === 'Дист'
																							? '🏠 Дистанционно'
																							: `Каб. ${replacement.room}`}
																					</div>
																				)}
																			</div>
																		</div>
																	)
																})
																.filter(Boolean)
														}

														// Если есть пары "both" - показываем их отдельно, группируя одинаковые
														if (bothItems.length > 0) {
															// Группируем одинаковые пары
															const groupedItems = bothItems.reduce(
																(acc: any[], item) => {
																	const existing = acc.find(
																		grouped =>
																			grouped.subject === item.subject &&
																			grouped.teacher === item.teacher &&
																			grouped.room === item.room,
																	)
																	if (existing) {
																		existing.groups.push(item.groupFull)
																	} else {
																		acc.push({
																			...item,
																			groups: [item.groupFull],
																		})
																	}
																	return acc
																},
																[],
															)

															return groupedItems.map((item, idx) => (
																<div
																	key={`${pairNumber}-both-${idx}`}
																	className='lesson-card'
																>
																	<div className='lesson-number'>
																		{pairNumber}
																	</div>
																	<div className='lesson-content'>
																		<div className='lesson-subject'>
																			{item.subject}
																		</div>
																		<div className='lesson-teacher'>
																			{item.groups.join(', ')}
																		</div>
																		{item.room && (
																			<div className='lesson-room'>
																				{item.room === 'Дистанционно' ||
																				item.room === 'Дист'
																					? '🏠 Дистанционно'
																					: `Каб. ${item.room}`}
																			</div>
																		)}
																	</div>
																</div>
															))
														}

														// Если есть различия между числителем и знаменателем - показываем только текущую неделю
														if (
															numeratorItems.length > 0 &&
															denominatorItems.length > 0
														) {
															const currentWeekItems =
																currentWeekType === 'numerator'
																	? numeratorItems
																	: denominatorItems
															const otherWeekItems =
																currentWeekType === 'numerator'
																	? denominatorItems
																	: numeratorItems

															const hasDifference =
																numeratorItems.some(
																	numItem =>
																		!denominatorItems.some(
																			denItem =>
																				numItem.subject === denItem.subject &&
																				numItem.groupFull ===
																					denItem.groupFull &&
																				numItem.room === denItem.room,
																		),
																) ||
																denominatorItems.some(
																	denItem =>
																		!numeratorItems.some(
																			numItem =>
																				denItem.subject === numItem.subject &&
																				denItem.groupFull ===
																					numItem.groupFull &&
																				denItem.room === numItem.room,
																		),
																)

															if (hasDifference) {
																// Показываем только текущую неделю с цветовым подчеркиванием
																if (currentWeekItems.length > 0) {
																	// Группируем одинаковые пары
																	const groupedItems = currentWeekItems.reduce(
																		(acc: any[], item) => {
																			const existing = acc.find(
																				grouped =>
																					grouped.subject === item.subject &&
																					grouped.teacher === item.teacher &&
																					grouped.room === item.room,
																			)
																			if (existing) {
																				existing.groups.push(item.groupFull)
																			} else {
																				acc.push({
																					...item,
																					groups: [item.groupFull],
																				})
																			}
																			return acc
																		},
																		[],
																	)

																	return groupedItems.map((item, idx) => (
																		<div
																			key={`${pairNumber}-current-${idx}`}
																			className={`lesson-card ${currentWeekType === 'numerator' ? 'numerator-highlight' : 'denominator-highlight'}`}
																		>
																			<div className='lesson-number'>
																				{pairNumber}
																			</div>
																			<div className='lesson-content'>
																				<div className='lesson-subject'>
																					{item.subject}{' '}
																					<span
																						className={`week-badge ${currentWeekType === 'numerator' ? 'numerator' : 'denominator'}`}
																					>
																						{currentWeekType === 'numerator'
																							? 'Ч'
																							: 'З'}
																					</span>
																				</div>
																				<div className='lesson-teacher'>
																					{item.groups.join(', ')}
																				</div>
																				{item.room && (
																					<div className='lesson-room'>
																						{item.room === 'Дистанционно' ||
																						item.room === 'Дист'
																							? '🏠 Дистанционно'
																							: `Каб. ${item.room}`}
																					</div>
																				)}
																			</div>
																		</div>
																	))
																}
																// Если нет пар на текущую неделю, показываем другую неделю неактивной
																return otherWeekItems.map((item, idx) => (
																	<div
																		key={`${pairNumber}-other-${idx}`}
																		className='lesson-card inactive-week'
																	>
																		<div className='lesson-number'>
																			{pairNumber}
																		</div>
																		<div className='lesson-content'>
																			<div className='lesson-subject'>
																				{item.subject}{' '}
																				<span
																					className={`week-badge ${currentWeekType === 'numerator' ? 'denominator' : 'numerator'}`}
																				>
																					{currentWeekType === 'numerator'
																						? 'З'
																						: 'Ч'}
																				</span>
																			</div>
																			<div className='lesson-teacher'>
																				{item.groupFull}
																			</div>
																			{item.room && (
																				<div className='lesson-room'>
																					{item.room === 'Дистанционно' ||
																					item.room === 'Дист'
																						? '🏠 Дистанционно'
																						: `Каб. ${item.room}`}
																				</div>
																			)}
																		</div>
																	</div>
																))
															} else {
																// Одинаковые - показываем как обычные пары, группируя их
																const groupedItems = numeratorItems.reduce(
																	(acc: any[], item) => {
																		const existing = acc.find(
																			grouped =>
																				grouped.subject === item.subject &&
																				grouped.teacher === item.teacher &&
																				grouped.room === item.room,
																		)
																		if (existing) {
																			existing.groups.push(item.groupFull)
																		} else {
																			acc.push({
																				...item,
																				groups: [item.groupFull],
																			})
																		}
																		return acc
																	},
																	[],
																)

																return groupedItems.map((item, idx) => (
																	<div
																		key={`${pairNumber}-same-${idx}`}
																		className='lesson-card'
																	>
																		<div className='lesson-number'>
																			{pairNumber}
																		</div>
																		<div className='lesson-content'>
																			<div className='lesson-subject'>
																				{item.subject}
																			</div>
																			<div className='lesson-teacher'>
																				{item.groups.join(', ')}
																			</div>
																			{item.room && (
																				<div className='lesson-room'>
																					{item.room === 'Дистанционно' ||
																					item.room === 'Дист'
																						? '🏠 Дистанционно'
																						: `Каб. ${item.room}`}
																				</div>
																			)}
																		</div>
																	</div>
																))
															}
														}

														// Если есть только числитель
														if (numeratorItems.length > 0) {
															// Группируем одинаковые пары
															const groupedItems = numeratorItems.reduce(
																(acc: any[], item) => {
																	const existing = acc.find(
																		grouped =>
																			grouped.subject === item.subject &&
																			grouped.teacher === item.teacher &&
																			grouped.room === item.room,
																	)
																	if (existing) {
																		existing.groups.push(item.groupFull)
																	} else {
																		acc.push({
																			...item,
																			groups: [item.groupFull],
																		})
																	}
																	return acc
																},
																[],
															)

															return groupedItems.map((item, idx) => (
																<div
																	key={`${pairNumber}-num-${idx}`}
																	className={`lesson-card ${currentWeekType === 'numerator' ? 'numerator-highlight' : 'inactive-week'}`}
																>
																	<div className='lesson-number'>
																		{pairNumber}
																	</div>
																	<div className='lesson-content'>
																		<div className='lesson-subject'>
																			{item.subject}{' '}
																			<span className='week-badge numerator'>
																				Ч
																			</span>
																		</div>
																		<div className='lesson-teacher'>
																			{item.groups.join(', ')}
																		</div>
																		{item.room && (
																			<div className='lesson-room'>
																				{item.room === 'Дистанционно' ||
																				item.room === 'Дист'
																					? '🏠 Дистанционно'
																					: `Каб. ${item.room}`}
																			</div>
																		)}
																	</div>
																</div>
															))
														}

														// Если есть только знаменатель
														if (denominatorItems.length > 0) {
															// Группируем одинаковые пары
															const groupedItems = denominatorItems.reduce(
																(acc: any[], item) => {
																	const existing = acc.find(
																		grouped =>
																			grouped.subject === item.subject &&
																			grouped.teacher === item.teacher &&
																			grouped.room === item.room,
																	)
																	if (existing) {
																		existing.groups.push(item.groupFull)
																	} else {
																		acc.push({
																			...item,
																			groups: [item.groupFull],
																		})
																	}
																	return acc
																},
																[],
															)

															return groupedItems.map((item, idx) => (
																<div
																	key={`${pairNumber}-den-${idx}`}
																	className={`lesson-card ${currentWeekType === 'denominator' ? 'denominator-highlight' : 'inactive-week'}`}
																>
																	<div className='lesson-number'>
																		{pairNumber}
																	</div>
																	<div className='lesson-content'>
																		<div className='lesson-subject'>
																			{item.subject}{' '}
																			<span className='week-badge denominator'>
																				З
																			</span>
																		</div>
																		<div className='lesson-teacher'>
																			{item.groups.join(', ')}
																		</div>
																		{item.room && (
																			<div className='lesson-room'>
																				{item.room === 'Дистанционно' ||
																				item.room === 'Дист'
																					? '🏠 Дистанционно'
																					: `Каб. ${item.room}`}
																			</div>
																		)}
																	</div>
																</div>
															))
														}

														// Если пары нет, но есть пары после - показываем плашку
														if (hasClassesAfter) {
															return (
																<div
																	key={pairNumber}
																	className='lesson-card lunch-card'
																>
																	<div className='lesson-number'>🎉</div>
																	<div className='lesson-content'>
																		<div
																			className='lesson-subject'
																			style={{ color: '#f59e0b' }}
																		>
																			Свободное время
																		</div>
																		<div className='lesson-room'>
																			{pairNumber} пара: окно
																		</div>
																	</div>
																</div>
															)
														}

														// Если пары нет вообще - не показываем ничего
														return null
													},
												)}
											</div>
										</div>
									)
								})}
							</div>
						</>
					)}
				</div>

				{schedule.length > 0 && (
					<div className='modern-container' style={{ marginTop: '20px' }}>
						<div className='selection-container'>
							<h3
								style={{
									fontSize: '1.1rem',
									marginBottom: '16px',
									textAlign: 'center',
									color: '#374151',
								}}
							>
								Полезные ссылки
							</h3>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: '12px',
								}}
							>
								<a
									href='https://sites.google.com/tcmc.spb.ru/zakazspravokit'
									target='_blank'
									rel='noopener noreferrer'
									className='btn-action-secondary'
									style={{ textDecoration: 'none', textAlign: 'center' }}
								>
									Заказать справку
								</a>
							</div>
						</div>
					</div>
				)}
			</div>

			<Footer />
		</>
	)
}

export default function TeacherSchedule() {
	return (
		<Suspense fallback={<div className='loading'>Загрузка...</div>}>
			<TeacherScheduleContent />
		</Suspense>
	)
}
