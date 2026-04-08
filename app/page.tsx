'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Footer from './components/Footer'
import Header from './components/Header'
//fix
export default function Home() {
	const [role, setRole] = useState<'student' | 'teacher' | 'lookup' | null>(
		null,
	)
	const [course, setCourse] = useState('')
	const [selectedGroup, setSelectedGroup] = useState('')
	const [teacherSearch, setTeacherSearch] = useState('')
	const [availableGroups, setAvailableGroups] = useState<string[]>([])
	const [availableTeachers, setAvailableTeachers] = useState<string[]>([])
	const [filteredTeachers, setFilteredTeachers] = useState<string[]>([])
	const router = useRouter()

	useEffect(() => {
		// Проверяем URL параметры
		const urlParams = new URLSearchParams(window.location.search)
		const lookupParam = urlParams.get('lookup')

		// Если есть параметр lookup, показываем форму поиска преподавателя и НЕ редиректим
		if (lookupParam === 'true') {
			setRole('lookup')
			// Загружаем преподавателей
			fetch('/api/teachers')
				.then(res => res.json())
				.then(data => {
					setAvailableTeachers(data.teachers)
					setFilteredTeachers(data.teachers)
				})
			return // Важно: выходим из useEffect, не проверяем localStorage
		}

		// Проверяем localStorage только если нет параметра lookup
		const savedRole = localStorage.getItem('userRole')
		const savedCourse = localStorage.getItem('userCourse')
		const savedGroup = localStorage.getItem('userGroup')
		const savedTeacher = localStorage.getItem('userTeacher')

		// Редиректим только если сохранена роль student или teacher
		if (savedRole === 'student' && savedCourse && savedGroup) {
			router.push(`/schedule/student?course=${savedCourse}&group=${savedGroup}`)
		} else if (savedRole === 'teacher' && savedTeacher) {
			router.push(
				`/schedule/teacher?teacher=${encodeURIComponent(savedTeacher)}`,
			)
		}
	}, [router])

	const handleRoleSelect = async (
		selectedRole: 'student' | 'teacher' | 'lookup',
	) => {
		setRole(selectedRole)

		if (selectedRole === 'teacher' || selectedRole === 'lookup') {
			const res = await fetch('/api/teachers')
			const data = await res.json()
			setAvailableTeachers(data.teachers)
			setFilteredTeachers(data.teachers)
		}
	}

	const handleCourseChange = async (selectedCourse: string) => {
		setCourse(selectedCourse)
		setSelectedGroup('')
		setAvailableGroups([])

		if (selectedCourse) {
			const res = await fetch(`/api/groups?course=${selectedCourse}`)
			const data = await res.json()
			setAvailableGroups(data.groups.sort())
		}
	}

	const handleTeacherSearch = (search: string) => {
		setTeacherSearch(search)
		if (search.trim() === '') {
			setFilteredTeachers(availableTeachers)
		} else {
			const searchLower = search.toLowerCase().trim()
			const filtered = availableTeachers.filter(t => {
				const teacherLower = t.toLowerCase()
				return teacherLower.includes(searchLower)
			})
			setFilteredTeachers(filtered)
		}
	}

	const handleSubmit = () => {
		if (role === 'student' && course && selectedGroup) {
			localStorage.setItem('userRole', 'student')
			localStorage.setItem('userCourse', course)
			localStorage.setItem('userGroup', selectedGroup)
			router.push(`/schedule/student?course=${course}&group=${selectedGroup}`)
		} else if ((role === 'teacher' || role === 'lookup') && teacherSearch) {
			// Проверяем, что преподаватель действительно существует в базе
			if (!availableTeachers.includes(teacherSearch)) {
				return // Не даем перейти, если преподавателя нет в списке
			}
			if (role === 'teacher') {
				localStorage.setItem('userRole', 'teacher')
				localStorage.setItem('userTeacher', teacherSearch)
			}
			router.push(
				`/schedule/teacher?teacher=${encodeURIComponent(teacherSearch)}`,
			)
		}
	}

	const handleReset = () => {
		setRole(null)
		setCourse('')
		setSelectedGroup('')
		setTeacherSearch('')
	}

	return (
		<>
			<Header />

			<div className='page-content'>
				<div className='modern-container'>
					{!role && (
						<>
							<div className='selection-container'>
								<h2 className='section-title'>Кто вы?</h2>
								<div className='role-cards'>
									<div
										className='role-card'
										onClick={() => handleRoleSelect('student')}
									>
										<div className='role-icon'>👨‍🎓</div>
										<h3>Студент</h3>
										<p>Просмотр расписания по группам</p>
									</div>
									<div
										className='role-card'
										onClick={() => handleRoleSelect('teacher')}
									>
										<div className='role-icon'>👨‍🏫</div>
										<h3>Преподаватель</h3>
										<p>Просмотр расписания по преподавателям</p>
									</div>
								</div>
							</div>

							<div
								className='selection-container'
								style={{ marginTop: '20px' }}
							>
								<h3
									style={{
										fontSize: '1.2rem',
										marginBottom: '16px',
										textAlign: 'center',
										color: '#374151',
									}}
								>
									Дополнительно
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
										onClick={() => handleRoleSelect('lookup')}
									>
										Узнать расписание преподавателя
									</button>
									<button
										className='btn-action-secondary'
										onClick={() => router.push('/replacements')}
									>
										Посмотреть замены
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
						</>
					)}

					{role === 'student' && (
						<div className='selection-container'>
							<button className='back-link' onClick={handleReset}>
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
								Назад к выбору роли
							</button>

							<div className='steps-container'>
								<div className={`step-card ${course ? 'completed' : 'active'}`}>
									<div className='step-number'>01</div>
									<h3>Выберите курс</h3>
									<select
										value={course}
										onChange={e => handleCourseChange(e.target.value)}
										className='modern-select'
									>
										<option value=''>Выберите курс</option>
										<option value='1'>1 курс</option>
										<option value='2'>2 курс</option>
										<option value='3'>3 курс</option>
										<option value='4'>4 курс</option>
									</select>
								</div>

								{course && availableGroups.length > 0 && (
									<div
										className={`step-card ${selectedGroup ? 'completed' : 'active'}`}
									>
										<div className='step-number'>02</div>
										<h3>Выберите группу</h3>
										<select
											value={selectedGroup}
											onChange={e => setSelectedGroup(e.target.value)}
											className='modern-select'
										>
											<option value=''>Выберите группу</option>
											{availableGroups.map(g => (
												<option key={g} value={g}>
													{g}
												</option>
											))}
										</select>
									</div>
								)}

								{course && selectedGroup && (
									<div className='step-card active'>
										<div className='step-number'>03</div>
										<h3>Подтвердите выбор</h3>
										<div className='selected-group'>
											Ваша группа: <strong>{selectedGroup}</strong>
										</div>
										<button className='submit-btn' onClick={handleSubmit}>
											Показать расписание
										</button>
									</div>
								)}
							</div>
						</div>
					)}

					{(role === 'teacher' || role === 'lookup') && (
						<div className='selection-container'>
							<button className='back-link' onClick={handleReset}>
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
								Назад к выбору роли
							</button>

							<div className='steps-container'>
								<div className='step-card active'>
									<div className='step-number'>01</div>
									<h3>Найдите преподавателя</h3>
									<input
										type='text'
										value={teacherSearch}
										onChange={e => handleTeacherSearch(e.target.value)}
										placeholder='Введите фамилию'
										className='modern-input'
									/>
								</div>

								{teacherSearch && filteredTeachers.length > 0 && (
									<div className='step-card active'>
										<div className='step-number'>02</div>
										<h3>Выберите из списка</h3>
										<div className='teacher-grid'>
											{filteredTeachers.slice(0, 10).map(t => (
												<button
													key={t}
													className='teacher-card'
													onClick={() => {
														setTeacherSearch(t)
														setFilteredTeachers([t])
													}}
												>
													{t}
												</button>
											))}
										</div>
									</div>
								)}

								{teacherSearch &&
									filteredTeachers.length === 1 &&
									teacherSearch === filteredTeachers[0] && (
										<div className='step-card active'>
											<div className='step-number'>03</div>
											<h3>Подтвердите выбор</h3>
											<div className='selected-group'>
												Преподаватель: <strong>{teacherSearch}</strong>
											</div>
											<button className='submit-btn' onClick={handleSubmit}>
												Показать расписание
											</button>
										</div>
									)}

								{teacherSearch && filteredTeachers.length === 0 && (
									<div className='step-card'>
										<p className='error-text'>
											Преподаватель не найден. Попробуйте другой запрос.
										</p>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			<Footer />
		</>
	)
}
