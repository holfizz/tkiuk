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
	const [activeTab, setActiveTab] = useState<
		'upload' | 'view' | 'teachers' | 'replacements'
	>('view')
	const [schedule, setSchedule] = useState<ScheduleItem[]>([])
	const [loading, setLoading] = useState(false)
	const [filterCourse, setFilterCourse] = useState<string>('1')
	const [isEditing, setIsEditing] = useState(false)
	const [editedSchedule, setEditedSchedule] = useState<ScheduleItem[]>([])
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	const [teachers, setTeachers] = useState<string[]>([])
	const [replacements, setReplacements] = useState<any[]>([])
	const [replacementMessage, setReplacementMessage] = useState('')
	const [isEditingReplacements, setIsEditingReplacements] = useState(false)
	const [editedReplacements, setEditedReplacements] = useState<any[]>([])
	const [currentWeekType, setCurrentWeekType] = useState<string>('numerator')
	const [todayReplacements, setTodayReplacements] = useState<any[]>([])
	const [viewWeekType, setViewWeekType] = useState<'numerator' | 'denominator'>(
		'numerator',
	)
	const router = useRouter()

	useEffect(() => {
		const auth = localStorage.getItem('adminAuth')
		if (auth !== 'true') {
			router.push('/admin/login')
		} else {
			setIsAuthenticated(true)
			loadWeekSettings()
		}
	}, [router])

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

	const loadTodayReplacements = async () => {
		try {
			const today = new Date().toISOString().split('T')[0]
			const res = await fetch(`/api/replacements?date=${today}`)
			const data = await res.json()
			// Берем только первые 2 замены
			setTodayReplacements((data.replacements || []).slice(0, 2))
		} catch (error) {
			console.error('Error loading today replacements:', error)
		}
	}

	useEffect(() => {
		if (activeTab === 'view' && isAuthenticated) {
			loadSchedule()
			loadTodayReplacements()
		} else if (activeTab === 'teachers' && isAuthenticated) {
			loadTeachers()
		} else if (activeTab === 'replacements' && isAuthenticated) {
			loadReplacements()
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

	const loadReplacements = async () => {
		setLoading(true)
		const res = await fetch('/api/replacements')
		const data = await res.json()
		setReplacements(data.replacements || [])
		setEditedReplacements(data.replacements || [])
		setLoading(false)
	}

	const handleEditReplacements = () => {
		setIsEditingReplacements(true)
		setEditedReplacements([...replacements])
	}

	const handleCancelEditReplacements = () => {
		setIsEditingReplacements(false)
		setEditedReplacements([...replacements])
	}

	const handleSaveReplacements = async () => {
		try {
			// Обновляем все измененные замены
			for (const replacement of editedReplacements) {
				await fetch('/api/replacements/update', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: replacement.id,
						newSubject: replacement.newSubject,
						newTeacher: replacement.newTeacher,
						room: replacement.room,
					}),
				})
			}
			setReplacementMessage('Все замены сохранены')
			setIsEditingReplacements(false)
			loadReplacements()
		} catch (error) {
			setReplacementMessage(`❌ Ошибка: ${error}`)
		} finally {
			setTimeout(() => setReplacementMessage(''), 3000)
		}
	}

	const handleReplacementChange = (
		id: number,
		field: string,
		value: string,
	) => {
		setEditedReplacements(prev =>
			prev.map(r => (r.id === id ? { ...r, [field]: value } : r)),
		)
	}

	const handleReplacementUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0]
		if (!file) return

		setUploading(true)
		setReplacementMessage('Загрузка файла замен...')

		const formData = new FormData()
		formData.append('file', file)

		try {
			const res = await fetch('/api/replacements/upload', {
				method: 'POST',
				body: formData,
			})

			const data = await res.json()

			if (res.ok) {
				setReplacementMessage(data.message || 'Замены успешно загружены')
				loadReplacements()
			} else {
				setReplacementMessage(`Ошибка: ${data.error}`)
			}
		} catch (error) {
			setReplacementMessage(`Ошибка при загрузке: ${error}`)
		} finally {
			setUploading(false)
			setTimeout(() => setReplacementMessage(''), 5000)
		}
	}

	const handleDeleteReplacements = async (date: string) => {
		if (!confirm(`Удалить все замены на ${date}?`)) return

		try {
			const res = await fetch(`/api/replacements?date=${date}`, {
				method: 'DELETE',
			})

			if (res.ok) {
				setReplacementMessage('Замены удалены')
				loadReplacements()
			} else {
				setReplacementMessage('Ошибка при удалении')
			}
		} catch (error) {
			setReplacementMessage(`Ошибка: ${error}`)
		} finally {
			setTimeout(() => setReplacementMessage(''), 3000)
		}
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

			// Разделяем на обновления и создания
			const updates = editedSchedule.filter(edited => {
				if (edited.id < 0) return false // Пропускаем новые записи
				const original = schedule.find(s => s.id === edited.id)
				return (
					original &&
					(original.subject !== edited.subject ||
						original.teacher !== edited.teacher ||
						original.room !== edited.room)
				)
			})

			const creates = editedSchedule.filter(
				edited =>
					edited.id < 0 &&
					edited.subject.trim() !== '' &&
					edited.teacher.trim() !== '',
			)

			let totalChanges = 0

			// Обновляем существующие записи
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
				totalChanges++
			}

			// Создаем новые записи
			for (const item of creates) {
				const { id, createdAt, updatedAt, ...itemData } = item as any
				const res = await fetch('/api/schedule/update', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(itemData),
				})

				if (!res.ok) {
					const error = await res.json()
					throw new Error(error.error || 'Ошибка создания')
				}
				totalChanges++
			}

			setMessage(
				`Обновлено ${updates.length} записей, создано ${creates.length} записей`,
			)
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

	const createNewCell = (
		groupFull: string,
		day: string,
		time: string,
		field: keyof ScheduleItem,
		value: string,
		weekType: 'numerator' | 'denominator',
	) => {
		// Создаем временную запись с отрицательным ID
		const tempId = -Date.now()
		const groupMatch = groupFull.match(/^(\d)/)
		const course = groupMatch ? parseInt(groupMatch[1]) : 1

		const newItem: ScheduleItem = {
			id: tempId,
			course: course >= 9 ? 1 : course,
			group: groupFull.split('-')[0],
			groupFull: groupFull,
			specialty: '',
			dayOfWeek: day,
			timeSlot: time,
			subject: field === 'subject' ? value : '',
			teacher: field === 'teacher' ? value : '',
			room: field === 'room' ? value : '',
			weekType: weekType,
		}

		setEditedSchedule(prev => [...prev, newItem])
	}

	const updateOrCreateCell = (
		id: number | null,
		groupFull: string,
		day: string,
		time: string,
		field: keyof ScheduleItem,
		value: string,
		weekType: 'numerator' | 'denominator',
	) => {
		if (id) {
			updateCell(id, field, value)
		} else {
			// Проверяем, есть ли уже временная запись для этой ячейки и типа недели
			const existing = editedSchedule.find(
				item =>
					item.groupFull === groupFull &&
					item.dayOfWeek === day &&
					item.timeSlot === time &&
					item.weekType === weekType,
			)
			if (existing) {
				updateCell(existing.id, field, value)
			} else {
				createNewCell(groupFull, day, time, field, value, weekType)
			}
		}
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

				// В режиме редактирования показываем все строки, иначе только с данными
				if (isEditing || Object.values(row.groups).some(v => v !== null)) {
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
							className={`admin-tab ${activeTab === 'replacements' ? 'active' : ''}`}
							onClick={() => setActiveTab('replacements')}
						>
							Замены
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
							{todayReplacements.length > 0 && (
								<div
									style={{
										background: '#fef9e7',
										border: '2px solid #fbbf24',
										borderRadius: '20px',
										padding: '16px 20px',
										marginBottom: '20px',
									}}
								>
									<h3
										style={{
											fontSize: '1.1rem',
											color: '#78350f',
											marginBottom: '12px',
											fontWeight: 600,
										}}
									>
										Замены на сегодня
									</h3>
									<div
										style={{
											display: 'flex',
											flexDirection: 'column',
											gap: '8px',
										}}
									>
										{todayReplacements.map(r => (
											<div
												key={r.id}
												style={{
													background: 'white',
													padding: '12px 16px',
													borderRadius: '16px',
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
													flexWrap: 'wrap',
													gap: '8px',
												}}
											>
												<div style={{ flex: '1 1 150px' }}>
													<div
														style={{
															fontSize: '0.85rem',
															fontWeight: 600,
															color: '#1a1a1a',
														}}
													>
														{r.groupFull}
													</div>
													<div
														style={{
															fontSize: '0.75rem',
															color: '#6b7280',
														}}
													>
														Пара {r.pairNumber}
													</div>
												</div>
												<div style={{ flex: '2 1 200px' }}>
													<div
														style={{
															fontSize: '0.85rem',
															fontWeight: 600,
															color: '#1a1a1a',
														}}
													>
														{r.newSubject}
													</div>
													<div
														style={{
															fontSize: '0.75rem',
															color: '#6b7280',
														}}
													>
														{r.newTeacher}
													</div>
												</div>
												<div
													style={{
														fontSize: '0.8rem',
														color: '#9ca3af',
														flex: '0 0 auto',
													}}
												>
													Каб. {r.room || '-'}
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							<div className='admin-legend'>
								<div className='legend-item'>
									<div className='legend-color empty-cell'></div>
									<span>Нет пары</span>
								</div>
								<div className='legend-item'>
									<div className='legend-color numerator-cell'></div>
									<span>Числитель</span>
								</div>
								<div className='legend-item'>
									<div className='legend-color denominator-cell'></div>
									<span>Знаменатель</span>
								</div>
								<div className='legend-item'>
									<div className='legend-color replacement-cell'></div>
									<span>Замена</span>
								</div>
							</div>

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

								<div
									style={{
										display: 'flex',
										gap: '10px',
										alignItems: 'center',
										flexWrap: 'wrap',
									}}
								>
									<div
										style={{
											display: 'flex',
											gap: '6px',
											background: 'white',
											padding: '4px',
											borderRadius: '20px',
											border: '2px solid #e5e7eb',
										}}
									>
										<button
											onClick={() => setViewWeekType('numerator')}
											className={`week-type-btn ${viewWeekType === 'numerator' ? 'active numerator' : ''}`}
										>
											Числитель
										</button>
										<button
											onClick={() => setViewWeekType('denominator')}
											className={`week-type-btn ${viewWeekType === 'denominator' ? 'active denominator' : ''}`}
										>
											Знаменатель
										</button>
									</div>

									{!isEditing ? (
										<button className='btn-edit' onClick={startEdit}>
											Редактировать
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
															const cellKey = `${row.day}-${row.time}-${group}`

															// Находим записи для числителя и знаменателя
															const dataSource = isEditing
																? editedSchedule
																: schedule
															const numeratorItem = dataSource.find(
																s =>
																	s.groupFull === group &&
																	s.dayOfWeek === row.day &&
																	s.timeSlot === row.time &&
																	s.weekType === 'numerator',
															)
															const denominatorItem = dataSource.find(
																s =>
																	s.groupFull === group &&
																	s.dayOfWeek === row.day &&
																	s.timeSlot === row.time &&
																	s.weekType === 'denominator',
															)

															// Выбираем какую неделю показывать
															const displayItem =
																viewWeekType === 'numerator'
																	? numeratorItem
																	: denominatorItem

															// Функция проверки пустой пары
															const isEmptyLesson = (lesson: any) => {
																if (!lesson) return true
																const subject = lesson.subject?.trim() || ''
																return subject === '' || subject === '-'
															}

															// Проверяем, пустая ли ячейка
															const isEmptyCell = isEmptyLesson(displayItem)

															// Проверяем, есть ли различия между числителем и знаменателем
															const hasDifference =
																numeratorItem &&
																denominatorItem &&
																(numeratorItem.subject !==
																	denominatorItem.subject ||
																	numeratorItem.teacher !==
																		denominatorItem.teacher ||
																	numeratorItem.room !== denominatorItem.room)

															// Определяем класс для ячейки
															let cellClass = 'schedule-cell'
															if (isEmptyCell && !isEditing) {
																cellClass += ' empty-schedule-cell'
															} else if (hasDifference) {
																// Только если есть различия - выделяем цветом
																cellClass +=
																	viewWeekType === 'numerator'
																		? ' numerator-cell'
																		: ' denominator-cell'
															}

															return (
																<td key={group} className={cellClass}>
																	{isEditing ? (
																		<div className='edit-cell'>
																			<input
																				className='edit-input'
																				value={displayItem?.subject || ''}
																				onChange={e =>
																					updateOrCreateCell(
																						displayItem?.id || null,
																						group,
																						row.day,
																						row.time,
																						'subject',
																						e.target.value,
																						viewWeekType,
																					)
																				}
																				placeholder='Предмет'
																			/>
																			<input
																				className='edit-input'
																				value={displayItem?.teacher || ''}
																				onChange={e =>
																					updateOrCreateCell(
																						displayItem?.id || null,
																						group,
																						row.day,
																						row.time,
																						'teacher',
																						e.target.value,
																						viewWeekType,
																					)
																				}
																				placeholder='Преподаватель'
																			/>
																			<input
																				className='edit-input'
																				value={displayItem?.room || ''}
																				onChange={e =>
																					updateOrCreateCell(
																						displayItem?.id || null,
																						group,
																						row.day,
																						row.time,
																						'room',
																						e.target.value,
																						viewWeekType,
																					)
																				}
																				placeholder='Кабинет'
																			/>
																		</div>
																	) : displayItem ? (
																		<div className='view-cell'>
																			<div className='cell-subject'>
																				{displayItem.subject}
																			</div>
																			<div className='cell-teacher'>
																				{displayItem.teacher}
																			</div>
																			<div className='cell-room'>
																				Каб. {displayItem.room || '-'}
																			</div>
																		</div>
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

					{activeTab === 'replacements' && (
						<div className='selection-container'>
							<h2 className='section-title' style={{ fontSize: '1.5rem' }}>
								Замены
							</h2>
							<p
								style={{
									textAlign: 'center',
									color: '#6b7280',
									marginBottom: '24px',
								}}
							>
								Загрузите DOCX файл с заменами
							</p>

							<div style={{ marginBottom: '24px' }}>
								<label
									htmlFor='replacement-upload'
									className='file-upload-btn'
									style={{
										display: 'inline-block',
										cursor: uploading ? 'not-allowed' : 'pointer',
										opacity: uploading ? 0.6 : 1,
									}}
								>
									{uploading ? 'Загрузка...' : 'Выбрать файл замен (DOCX)'}
								</label>
								<input
									id='replacement-upload'
									type='file'
									accept='.docx'
									onChange={handleReplacementUpload}
									disabled={uploading}
									style={{ display: 'none' }}
								/>
							</div>

							{replacementMessage && (
								<div
									className={
										replacementMessage.includes('успешно') ||
										replacementMessage.includes('удалены')
											? 'success-message'
											: 'message error'
									}
								>
									{replacementMessage}
								</div>
							)}

							{loading ? (
								<div className='loading'>Загрузка...</div>
							) : replacements.length === 0 ? (
								<p
									style={{
										textAlign: 'center',
										color: '#6b7280',
										padding: '20px',
									}}
								>
									Замены не найдены. Загрузите файл с заменами.
								</p>
							) : (
								<div>
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											marginBottom: '16px',
										}}
									>
										<h3
											style={{
												fontSize: '1.2rem',
												color: '#374151',
											}}
										>
											Загруженные замены
										</h3>
										{!isEditingReplacements ? (
											<button
												className='btn-edit'
												onClick={handleEditReplacements}
											>
												Редактировать
											</button>
										) : (
											<div style={{ display: 'flex', gap: '8px' }}>
												<button
													className='btn-save'
													onClick={handleSaveReplacements}
												>
													Сохранить
												</button>
												<button
													className='btn-cancel'
													onClick={handleCancelEditReplacements}
												>
													Отмена
												</button>
											</div>
										)}
									</div>
									{Object.entries(
										(isEditingReplacements
											? editedReplacements
											: replacements
										).reduce((acc: any, r: any) => {
											if (!acc[r.date]) acc[r.date] = []
											acc[r.date].push(r)
											return acc
										}, {}),
									).map(([date, items]: [string, any]) => (
										<div
											key={date}
											style={{
												marginBottom: '24px',
												background: 'white',
												borderRadius: '20px',
												overflow: 'hidden',
												boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
											}}
										>
											<div
												style={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
													padding: '16px 20px',
													background: '#f9fafb',
													borderBottom: '1px solid #e5e7eb',
												}}
											>
												<h4 style={{ fontSize: '1.1rem', color: '#1a1a1a' }}>
													{new Date(date).toLocaleDateString('ru-RU', {
														day: 'numeric',
														month: 'long',
														year: 'numeric',
													})}
												</h4>
												<button
													className='btn-danger btn-small'
													onClick={() => handleDeleteReplacements(date)}
													disabled={isEditingReplacements}
												>
													Удалить все
												</button>
											</div>
											<div className='admin-table-wrapper'>
												<table className='admin-table'>
													<thead>
														<tr>
															<th>Группа</th>
															<th>Пара</th>
															<th>Дисциплина</th>
															<th>Преподаватель</th>
															<th>Аудитория</th>
														</tr>
													</thead>
													<tbody>
														{items.map((r: any) => (
															<tr key={r.id}>
																<td>{r.groupFull}</td>
																<td>{r.pairNumber}</td>
																<td>
																	{isEditingReplacements ? (
																		<input
																			type='text'
																			value={r.newSubject}
																			onChange={e =>
																				handleReplacementChange(
																					r.id,
																					'newSubject',
																					e.target.value,
																				)
																			}
																			className='edit-input'
																		/>
																	) : (
																		r.newSubject
																	)}
																</td>
																<td>
																	{isEditingReplacements ? (
																		<input
																			type='text'
																			value={r.newTeacher}
																			onChange={e =>
																				handleReplacementChange(
																					r.id,
																					'newTeacher',
																					e.target.value,
																				)
																			}
																			className='edit-input'
																		/>
																	) : (
																		r.newTeacher
																	)}
																</td>
																<td>
																	{isEditingReplacements ? (
																		<input
																			type='text'
																			value={r.room || ''}
																			onChange={e =>
																				handleReplacementChange(
																					r.id,
																					'room',
																					e.target.value,
																				)
																			}
																			className='edit-input'
																		/>
																	) : (
																		r.room || '-'
																	)}
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</div>
									))}
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
