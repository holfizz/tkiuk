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

function StudentScheduleContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const course = searchParams.get('course')
	const group = searchParams.get('group')

	const [schedule, setSchedule] = useState<ScheduleItem[]>([])
	const [replacements, setReplacements] = useState<Replacement[]>([])
	const [loading, setLoading] = useState(true)
	const [currentWeekType, setCurrentWeekType] = useState<string>('numerator')

	useEffect(() => {
		if (course && group) {
			loadSchedule()
			loadReplacements()
			loadWeekSettings()
		}
	}, [course, group])

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
		const res = await fetch(`/api/schedule/all?course=${course}`)
		const data = await res.json()
		const filtered = data.schedule.filter(
			(s: ScheduleItem) => s.groupFull === group,
		)
		setSchedule(filtered)
		setLoading(false)
	}

	const loadReplacements = async () => {
		// Загружаем замены для этой группы
		const res = await fetch(`/api/replacements?group=${group}`)
		const data = await res.json()
		setReplacements(data.replacements || [])
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
				// Находим обе версии (числитель и знаменатель)
				const numeratorItem = schedule.find(
					s =>
						s.dayOfWeek === day &&
						s.timeSlot === time &&
						s.weekType === 'numerator',
				)
				const denominatorItem = schedule.find(
					s =>
						s.dayOfWeek === day &&
						s.timeSlot === time &&
						s.weekType === 'denominator',
				)
				const bothItem = schedule.find(
					s =>
						s.dayOfWeek === day && s.timeSlot === time && s.weekType === 'both',
				)

				return {
					pairNumber: index + 1,
					time,
					numeratorItem,
					denominatorItem,
					bothItem,
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

	const getTodayDate = () => {
		const today = new Date()
		const year = today.getFullYear()
		const month = String(today.getMonth() + 1).padStart(2, '0')
		const day = String(today.getDate()).padStart(2, '0')
		return `${year}-${month}-${day}`
	}

	const getReplacement = (pairNumber: number) => {
		const todayDate = getTodayDate()
		return replacements.find(
			r => r.date === todayDate && r.pairNumber === pairNumber,
		)
	}

	const getLunchTime = (courseNum: string) => {
		const lunchTimes: Record<string, string> = {
			'1': '12:20-12:55',
			'2': '12:30-13:05',
			'3': '12:40-13:15',
			'4': '12:50-13:25',
		}
		return lunchTimes[courseNum] || '12:20-12:55'
	}

	const handleReset = () => {
		localStorage.removeItem('userRole')
		localStorage.removeItem('userCourse')
		localStorage.removeItem('userGroup')
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
				title={`Группа ${group}`}
				subtitle={`${course} курс`}
				showChangeButton={true}
				onChangeClick={handleReset}
				changeButtonText='Сменить группу'
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
									background: 'white',
									padding: '16px 24px',
									borderRadius: '28px',
									boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
									marginBottom: '20px',
									textAlign: 'center',
								}}
							>
								<div
									style={{
										fontSize: '0.9rem',
										color: '#6b7280',
										marginBottom: '6px',
									}}
								>
									Текущая неделя
								</div>
								<div
									style={{
										fontSize: '1.3rem',
										fontWeight: 600,
										color:
											currentWeekType === 'numerator' ? '#9333ea' : '#22c55e',
									}}
								>
									{currentWeekType === 'numerator'
										? 'Числитель'
										: 'Знаменатель'}
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
									<span className='pair-time'>
										{getLunchTime(course || '')}
									</span>
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
										? daySchedule.filter(({ pairNumber }) =>
												getReplacement(pairNumber),
											)
										: []

									// Показываем день если есть пары ИЛИ есть замены на сегодня
									const hasClasses = daySchedule.some(
										s =>
											s.numeratorItem !== undefined ||
											s.denominatorItem !== undefined ||
											s.bothItem !== undefined,
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
													(
														{
															pairNumber,
															numeratorItem,
															denominatorItem,
															bothItem,
														},
														index,
													) => {
														// Проверяем есть ли замена на сегодня для этой пары
														const replacement = isToday
															? getReplacement(pairNumber)
															: null

														// Проверяем, есть ли пары после текущей
														const hasClassesAfter = daySchedule
															.slice(index + 1)
															.some(
																s =>
																	s.numeratorItem ||
																	s.denominatorItem ||
																	s.bothItem ||
																	(isToday && getReplacement(s.pairNumber)),
															)

														// Если есть замена - показываем её
														if (replacement) {
															return (
																<div
																	key={pairNumber}
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
																			{replacement.newTeacher}
																		</div>
																		{replacement.room && (
																			<div className='lesson-room'>
																				{replacement.room === 'Дистанционно' ||
																				replacement.room === 'Дист'
																					? '🏠 Дистанционно'
																					: `Каб. ${replacement.room}`}
																			</div>
																		)}
																	</div>
																</div>
															)
														}

														// Если есть пара "both" - показываем одну карточку
														if (bothItem) {
															return (
																<div key={pairNumber} className='lesson-card'>
																	<div className='lesson-number'>
																		{pairNumber}
																	</div>
																	<div className='lesson-content'>
																		<div className='lesson-subject'>
																			{bothItem.subject}
																		</div>
																		{bothItem.teacher && (
																			<div className='lesson-teacher'>
																				{bothItem.teacher}
																			</div>
																		)}
																		{bothItem.room && (
																			<div className='lesson-room'>
																				{bothItem.room === 'Дистанционно' ||
																				bothItem.room === 'Дист'
																					? '🏠 Дистанционно'
																					: `Каб. ${bothItem.room}`}
																			</div>
																		)}
																	</div>
																</div>
															)
														}

														// Если есть различия между числителем и знаменателем
														if (numeratorItem && denominatorItem) {
															const hasDifference =
																numeratorItem.subject !==
																	denominatorItem.subject ||
																numeratorItem.teacher !==
																	denominatorItem.teacher ||
																numeratorItem.room !== denominatorItem.room

															if (hasDifference) {
																return (
																	<div
																		key={pairNumber}
																		className='lesson-card lesson-card-split'
																	>
																		<div className='lesson-number'>
																			{pairNumber}
																		</div>
																		<div className='lesson-content-split'>
																			<div
																				className={`lesson-week numerator-week ${currentWeekType === 'numerator' ? 'current-week' : ''}`}
																			>
																				<div className='week-indicator'>Ч</div>
																				<div className='lesson-subject'>
																					{numeratorItem.subject}
																				</div>
																				{numeratorItem.teacher && (
																					<div className='lesson-teacher'>
																						{numeratorItem.teacher}
																					</div>
																				)}
																				{numeratorItem.room && (
																					<div className='lesson-room'>
																						{numeratorItem.room ===
																							'Дистанционно' ||
																						numeratorItem.room === 'Дист'
																							? '🏠 Дистанционно'
																							: `Каб. ${numeratorItem.room}`}
																					</div>
																				)}
																			</div>
																			<div
																				className={`lesson-week denominator-week ${currentWeekType === 'denominator' ? 'current-week' : ''}`}
																			>
																				<div className='week-indicator'>З</div>
																				<div className='lesson-subject'>
																					{denominatorItem.subject}
																				</div>
																				{denominatorItem.teacher && (
																					<div className='lesson-teacher'>
																						{denominatorItem.teacher}
																					</div>
																				)}
																				{denominatorItem.room && (
																					<div className='lesson-room'>
																						{denominatorItem.room ===
																							'Дистанционно' ||
																						denominatorItem.room === 'Дист'
																							? '🏠 Дистанционно'
																							: `Каб. ${denominatorItem.room}`}
																					</div>
																				)}
																			</div>
																		</div>
																	</div>
																)
															} else {
																// Одинаковые - показываем одну карточку
																return (
																	<div key={pairNumber} className='lesson-card'>
																		<div className='lesson-number'>
																			{pairNumber}
																		</div>
																		<div className='lesson-content'>
																			<div className='lesson-subject'>
																				{numeratorItem.subject}
																			</div>
																			{numeratorItem.teacher && (
																				<div className='lesson-teacher'>
																					{numeratorItem.teacher}
																				</div>
																			)}
																			{numeratorItem.room && (
																				<div className='lesson-room'>
																					{numeratorItem.room ===
																						'Дистанционно' ||
																					numeratorItem.room === 'Дист'
																						? '🏠 Дистанционно'
																						: `Каб. ${numeratorItem.room}`}
																				</div>
																			)}
																		</div>
																	</div>
																)
															}
														}

														// Если есть только числитель
														if (numeratorItem) {
															return (
																<div
																	key={pairNumber}
																	className={`lesson-card ${currentWeekType === 'numerator' ? '' : 'inactive-week'}`}
																>
																	<div className='lesson-number'>
																		{pairNumber}
																	</div>
																	<div className='lesson-content'>
																		<div className='lesson-subject'>
																			{numeratorItem.subject}{' '}
																			<span className='week-badge numerator'>
																				Ч
																			</span>
																		</div>
																		{numeratorItem.teacher && (
																			<div className='lesson-teacher'>
																				{numeratorItem.teacher}
																			</div>
																		)}
																		{numeratorItem.room && (
																			<div className='lesson-room'>
																				{numeratorItem.room ===
																					'Дистанционно' ||
																				numeratorItem.room === 'Дист'
																					? '🏠 Дистанционно'
																					: `Каб. ${numeratorItem.room}`}
																			</div>
																		)}
																	</div>
																</div>
															)
														}

														// Если есть только знаменатель
														if (denominatorItem) {
															return (
																<div
																	key={pairNumber}
																	className={`lesson-card ${currentWeekType === 'denominator' ? '' : 'inactive-week'}`}
																>
																	<div className='lesson-number'>
																		{pairNumber}
																	</div>
																	<div className='lesson-content'>
																		<div className='lesson-subject'>
																			{denominatorItem.subject}{' '}
																			<span className='week-badge denominator'>
																				З
																			</span>
																		</div>
																		{denominatorItem.teacher && (
																			<div className='lesson-teacher'>
																				{denominatorItem.teacher}
																			</div>
																		)}
																		{denominatorItem.room && (
																			<div className='lesson-room'>
																				{denominatorItem.room ===
																					'Дистанционно' ||
																				denominatorItem.room === 'Дист'
																					? '🏠 Дистанционно'
																					: `Каб. ${denominatorItem.room}`}
																			</div>
																		)}
																	</div>
																</div>
															)
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
																			Вам не нужно на эту пару
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
								<button
									className='btn-action-secondary'
									onClick={() => router.push('/?lookup=true')}
								>
									Узнать расписание преподавателя
								</button>
								<a
									href='/replacements'
									className='btn-action-secondary'
									style={{ textDecoration: 'none', textAlign: 'center' }}
								>
									Посмотреть замены
								</a>
								<a
									href='http://www.tcmc.spb.ru/student/spravka'
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

export default function StudentSchedule() {
	return (
		<Suspense fallback={<div className='loading'>Загрузка...</div>}>
			<StudentScheduleContent />
		</Suspense>
	)
}
