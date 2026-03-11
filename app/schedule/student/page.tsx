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

	useEffect(() => {
		if (course && group) {
			loadSchedule()
			loadReplacements()
		}
	}, [course, group])

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
				const item = schedule.find(
					s => s.dayOfWeek === day && s.timeSlot === time,
				)
				return { pairNumber: index + 1, time, item }
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
									const hasClasses = daySchedule.some(s => s.item !== undefined)
									if (!hasClasses) return null
									const isToday = day === getTodayDayName()

									return (
										<div
											key={day}
											className={`day-card ${isToday ? 'today' : ''}`}
										>
											<h3 className='day-title'>{day}</h3>
											<div className='lessons-list'>
												{daySchedule.map(({ pairNumber, item }, index) => {
													// Проверяем, есть ли пары после текущей
													const hasClassesAfter = daySchedule
														.slice(index + 1)
														.some(s => s.item !== undefined)

													// Если пары нет, но есть пары после - показываем плашку
													if (!item && hasClassesAfter) {
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

													// Если пары нет и после тоже нет - не показываем ничего
													if (!item) return null

													// Проверяем есть ли замена на сегодня для этой пары
													const replacement = isToday
														? getReplacement(pairNumber)
														: null

													// Показываем пару (обычную или замену)
													return (
														<div
															key={pairNumber}
															className={`lesson-card ${replacement ? 'replacement-card' : ''}`}
														>
															<div className='lesson-number'>{pairNumber}</div>
															<div className='lesson-content'>
																{replacement ? (
																	<>
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
																	</>
																) : (
																	<>
																		<div className='lesson-subject'>
																			{item.subject}{' '}
																			{getWeekBadge(item.weekType)}
																		</div>
																		{item.teacher && (
																			<div className='lesson-teacher'>
																				{item.teacher}
																			</div>
																		)}
																		{item.room && (
																			<div className='lesson-room'>
																				{item.room === 'Дистанционно' ||
																				item.room === 'Дист'
																					? '🏠 Дистанционно'
																					: `Каб. ${item.room}`}
																			</div>
																		)}
																	</>
																)}
															</div>
														</div>
													)
												})}
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
