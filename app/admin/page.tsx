'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import Header from '../components/Header'

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

export default function AdminUpload() {
	const [uploading, setUploading] = useState(false)
	const [message, setMessage] = useState('')
	const [activeTab, setActiveTab] = useState<'upload' | 'view' | 'teachers'>(
		'view',
	)
	const [schedule, setSchedule] = useState<ScheduleItem[]>([])
	const [loading, setLoading] = useState(false)
	const [filterCourse, setFilterCourse] = useState<string>('1')
	const [isEditing, setIsEditing] = useState(false)
	const [editedSchedule, setEditedSchedule] = useState<ScheduleItem[]>([])
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	const [teachers, setTeachers] = useState<string[]>([])
	const router = useRouter()

	useEffect(() => {
		const auth = localStorage.getItem('adminAuth')
		if (auth !== 'true') {
			router.push('/admin/login')
		} else {
			setIsAuthenticated(true)
		}
	}, [router])

	useEffect(() => {
		if (activeTab === 'view' && isAuthenticated) {
			loadSchedule()
		} else if (activeTab === 'teachers' && isAuthenticated) {
			loadTeachers()
		}
	}, [activeTab, filterCourse, isAuthenticated])

	const loadSchedule = async () => {
		setLoading(true)
		const url = `/api/schedule/all?course=${filterCourse}`

		const res = await fetch(url)
		const data = await res.json()
		setSchedule(data.schedule || [])
		setEditedSchedule(data.schedule || [])
		setLoading(false)
	}

	const loadTeachers = async () => {
		setLoading(true)
		const res = await fetch('/api/teachers')
		const data = await res.json()
		setTeachers(data.teachers || [])
		setLoading(false)
	}

	const handleLogout = () => {
		localStorage.removeItem('adminAuth')
		router.push('/admin/login')
	}

	const handleFileUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
		course: number,
	) => {
		const file = e.target.files?.[0]
		if (!file) return

		setUploading(true)
		setMessage('Загрузка файла...')

		const formData = new FormData()
		formData.append('file', file)
		formData.append('course', course.toString())

		try {
			const res = await fetch('/api/upload', {
				method: 'POST',
				body: formData,
			})

			const data = await res.json()

			if (res.ok) {
				setMessage(
					`Успешно загружено ${data.count} записей для ${course} курса`,
				)
				if (activeTab === 'view') {
					loadSchedule()
				}
			} else {
				setMessage(`Ошибка: ${data.error}`)
			}
		} catch (error) {
			setMessage('Ошибка при загрузке файла')
		} finally {
			setUploading(false)
			e.target.value = ''
		}
	}

	const startEdit = () => {
		setIsEditing(true)
		setEditedSchedule([...schedule])
	}

	const cancelEdit = () => {
		setIsEditing(false)
		setEditedSchedule([...schedule])
	}

	const saveEdit = async () => {
		try {
			setMessage('Сохранение...')

			const updates = editedSchedule.filter(edited => {
				const original = schedule.find(s => s.id === edited.id)
				return (
					original &&
					(original.subject !== edited.subject ||
						original.teacher !== edited.teacher ||
						original.room !== edited.room)
				)
			})

			for (const item of updates) {
				const res = await fetch('/api/schedule/update', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(item),
				})

				if (!res.ok) {
					const error = await res.json()
					throw new Error(error.error || 'Ошибка обновления')
				}
			}

			setMessage(`Обновлено ${updates.length} записей`)
			setIsEditing(false)
			await loadSchedule()
		} catch (error) {
			console.error('Save error:', error)
			setMessage('Ошибка при обновлении: ' + (error as Error).message)
		}
	}

	const updateCell = (id: number, field: keyof ScheduleItem, value: string) => {
		setEditedSchedule(prev =>
			prev.map(item => (item.id === id ? { ...item, [field]: value } : item)),
		)
	}

	const groupedSchedule = () => {
		const groups: string[] = []
		const dataSource = isEditing ? editedSchedule : schedule

		dataSource.forEach(item => {
			if (!groups.includes(item.groupFull)) {
				groups.push(item.groupFull)
			}
		})
		groups.sort()

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

		const grouped: any[] = []

		days.forEach(day => {
			const dayRow: any = { isDay: true, day, groups: {} }
			grouped.push(dayRow)

			timeSlots.forEach(time => {
				const row: any = { isDay: false, day, time, groups: {} }

				groups.forEach(groupName => {
					const item = dataSource.find(
						s =>
							s.dayOfWeek === day &&
							s.timeSlot === time &&
							s.groupFull === groupName,
					)
					row.groups[groupName] = item || null
				})

				if (Object.values(row.groups).some(v => v !== null)) {
					grouped.push(row)
				}
			})
		})

		return { groups, data: grouped }
	}

	const { groups, data } = groupedSchedule()

	const getWeekBadge = (weekType: string) => {
		if (weekType === 'numerator')
			return <span className='week-badge numerator'>Ч</span>
		if (weekType === 'denominator')
			return <span className='week-badge denominator'>З</span>
		return null
	}

	if (!isAuthenticated) {
		return (
			<>
				<Header />
				<div className='page-content'>
					<div className='modern-container'>
						<div className='loading'>Проверка авторизации...</div>
					</div>
				</div>
				<Footer />
			</>
		)
	}

	return (
		<>
			<Header title='Панель администратора' subtitle='Управление расписанием' />

			<div className='page-content'>
				<div className='modern-container'>
					<div className='admin-actions'>
						<button className='back-link' onClick={() => router.push('/')}>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								width={20}
								height={20}
								viewBox='0 0 24 24'
								style={{ verticalAlign: 'middle', marginRight: '6px' }}
							>
								<path
									fill='currentColor'
									d='M11.67 3.87L9.9 2.1L0 12l9.9 9.9l1.77-1.77L3.54 12z'
								></path>
							</svg>
							На главную
						</button>
						<button className='btn-logout' onClick={handleLogout}>
							Выйти
						</button>
					</div>

					<div className='admin-tabs'>
						<button
							className={`admin-tab ${activeTab === 'view' ? 'active' : ''}`}
							onClick={() => setActiveTab('view')}
						>
							Просмотр и редактирование
						</button>
						<button
							className={`admin-tab ${activeTab === 'upload' ? 'active' : ''}`}
							onClick={() => setActiveTab('upload')}
						>
							Загрузка файлов
						</button>
						<button
							className={`admin-tab ${activeTab === 'teachers' ? 'active' : ''}`}
							onClick={() => setActiveTab('teachers')}
						>
							Преподаватели
						</button>
					</div>

					{activeTab === 'upload' && (
						<div className='selection-container'>
							<h2 className='section-title' style={{ fontSize: '1.5rem' }}>
								Загрузить расписание
							</h2>
							<p
								style={{
									textAlign: 'center',
									color: '#6b7280',
									marginBottom: '24px',
								}}
							>
								При загрузке нового файла старое расписание для этого курса
								будет удалено
							</p>

							<div style={{ display: 'grid', gap: '16px' }}>
								{[1, 2, 3, 4].map(course => (
									<div key={course} className='upload-item'>
										<label className='upload-label'>{course} курс</label>
										<input
											id={`file-${course}`}
											type='file'
											accept='.xls,.xlsx'
											onChange={e => handleFileUpload(e, course)}
											disabled={uploading}
											style={{ display: 'none' }}
										/>
										<label
											htmlFor={`file-${course}`}
											className='file-upload-btn'
										>
											Выбрать файл для {course} курса
										</label>
									</div>
								))}
							</div>

							{message && (
								<div
									className={
										message.includes('Успешно')
											? 'success-message'
											: 'error-text'
									}
									style={{ marginTop: '20px' }}
								>
									{message}
								</div>
							)}
						</div>
					)}

					{activeTab === 'view' && (
						<div className='selection-container'>
							<div className='admin-controls'>
								<div
									style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
								>
									<label style={{ color: '#374151', fontWeight: 600 }}>
										Курс:
									</label>
									<select
										value={filterCourse}
										onChange={e => setFilterCourse(e.target.value)}
										className='modern-select'
										style={{ width: 'auto', minWidth: '120px' }}
									>
										<option value='1'>1 курс</option>
										<option value='2'>2 курс</option>
										<option value='3'>3 курс</option>
										<option value='4'>4 курс</option>
									</select>
								</div>

								<div style={{ display: 'flex', gap: '10px' }}>
									{!isEditing ? (
										<button className='btn-edit' onClick={startEdit}>
											✏️ Редактировать
										</button>
									) : (
										<>
											<button className='btn-save' onClick={saveEdit}>
												Сохранить
											</button>
											<button className='btn-cancel' onClick={cancelEdit}>
												Отмена
											</button>
										</>
									)}
								</div>
							</div>

							{loading ? (
								<div className='loading'>Загрузка...</div>
							) : schedule.length === 0 ? (
								<p
									style={{
										textAlign: 'center',
										color: '#6b7280',
										padding: '20px',
									}}
								>
									Расписание не найдено. Загрузите файлы.
								</p>
							) : (
								<div className='admin-table-wrapper'>
									<table className='admin-table'>
										<thead>
											<tr>
												<th className='sticky-col'>Время</th>
												<th style={{ width: '50px' }}></th>
												{groups.map(group => (
													<th key={group}>{group}</th>
												))}
											</tr>
										</thead>
										<tbody>
											{data.map((row, idx) => {
												if (row.isDay) {
													return (
														<tr key={`day-${idx}`} className='day-row'>
															<td colSpan={2 + groups.length}>{row.day}</td>
														</tr>
													)
												}

												return (
													<tr key={`time-${idx}`}>
														<td className='sticky-col time-col'>{row.time}</td>
														<td style={{ width: '50px' }}></td>
														{groups.map(group => {
															const item = row.groups[group]
															return (
																<td key={group} className='schedule-cell'>
																	{item ? (
																		isEditing ? (
																			<div className='edit-cell'>
																				<input
																					className='edit-input'
																					value={
																						editedSchedule.find(
																							s => s.id === item.id,
																						)?.subject || ''
																					}
																					onChange={e =>
																						updateCell(
																							item.id,
																							'subject',
																							e.target.value,
																						)
																					}
																					placeholder='Предмет'
																				/>
																				<input
																					className='edit-input'
																					value={
																						editedSchedule.find(
																							s => s.id === item.id,
																						)?.teacher || ''
																					}
																					onChange={e =>
																						updateCell(
																							item.id,
																							'teacher',
																							e.target.value,
																						)
																					}
																					placeholder='Преподаватель'
																				/>
																				<input
																					className='edit-input'
																					value={
																						editedSchedule.find(
																							s => s.id === item.id,
																						)?.room || ''
																					}
																					onChange={e =>
																						updateCell(
																							item.id,
																							'room',
																							e.target.value,
																						)
																					}
																					placeholder='Кабинет'
																				/>
																			</div>
																		) : (
																			<div className='view-cell'>
																				<div className='cell-subject'>
																					{item.subject}{' '}
																					{getWeekBadge(item.weekType)}
																				</div>
																				<div className='cell-teacher'>
																					{item.teacher}
																				</div>
																				<div className='cell-room'>
																					Каб. {item.room || '-'}
																				</div>
																			</div>
																		)
																	) : (
																		'-'
																	)}
																</td>
															)
														})}
													</tr>
												)
											})}
										</tbody>
									</table>
								</div>
							)}

							{message && (
								<div
									className={
										message.includes('обновлена') ||
										message.includes('обновлено')
											? 'success-message'
											: 'error-text'
									}
									style={{ marginTop: '20px' }}
								>
									{message}
								</div>
							)}
						</div>
					)}

					{activeTab === 'teachers' && (
						<div className='selection-container'>
							<h2 className='section-title' style={{ fontSize: '1.5rem' }}>
								Список преподавателей
							</h2>
							<p
								style={{
									textAlign: 'center',
									color: '#6b7280',
									marginBottom: '24px',
								}}
							>
								Всего преподавателей: {teachers.length}
							</p>

							{loading ? (
								<div className='loading'>Загрузка...</div>
							) : teachers.length === 0 ? (
								<p
									style={{
										textAlign: 'center',
										color: '#6b7280',
										padding: '20px',
									}}
								>
									Преподаватели не найдены. Загрузите файлы расписания.
								</p>
							) : (
								<div className='teacher-grid'>
									{teachers.map(teacher => (
										<div key={teacher} className='teacher-card-admin'>
											{teacher}
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			<Footer />
		</>
	)
}
