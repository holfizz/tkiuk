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

function TeacherScheduleContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const teacher = searchParams.get('teacher')

	const [schedule, setSchedule] = useState<ScheduleItem[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (teacher) {
			loadSchedule()
		}
	}, [teacher])

	const loadSchedule = async () => {
		setLoading(true)
		const res = await fetch(
			`/api/schedule/teacher?teacher=${encodeURIComponent(teacher || '')}`,
		)
		const data = await res.json()
		setSchedule(data.schedule || [])
		setLoading(false)
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
				const items = schedule.filter(
					s => s.dayOfWeek === day && s.timeSlot === time,
				)
				return { pairNumber: index + 1, time, items }
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
									const hasClasses = daySchedule.some(s => s.items.length > 0)
									if (!hasClasses) return null
									const isToday = day === getTodayDayName()

									return (
										<div
											key={day}
											className={`day-card ${isToday ? 'today' : ''}`}
										>
											<h3 className='day-title'>{day}</h3>
											<div className='lessons-list'>
												{daySchedule.map(({ pairNumber, items }) => {
													if (items.length === 0) return null

													return items.map((item, idx) => (
														<div
															key={`${pairNumber}-${idx}`}
															className='lesson-card'
														>
															<div className='lesson-number'>{pairNumber}</div>
															<div className='lesson-content'>
																<div className='lesson-subject'>
																	{item.subject} {getWeekBadge(item.weekType)}
																</div>
																<div className='lesson-teacher'>
																	{item.groupFull}
																</div>
																{item.room && (
																	<div className='lesson-room'>
																		Каб. {item.room}
																	</div>
																)}
															</div>
														</div>
													))
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
								<a
									href='http://www.tcmc.spb.ru/student/spravka'
									target='_blank'
									rel='noopener noreferrer'
									className='btn-action-secondary'
									style={{ textDecoration: 'none', textAlign: 'center' }}
								>
									📄 Заказать справку
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
