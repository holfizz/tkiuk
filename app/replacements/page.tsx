'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import Header from '../components/Header'

interface Replacement {
	id: number
	date: string
	course: number
	groupFull: string
	pairNumber: number
	originalSubject?: string
	originalTeacher?: string
	newSubject: string
	newTeacher: string
	room?: string
}

export default function ReplacementsPage() {
	const router = useRouter()
	const [replacements, setReplacements] = useState<Replacement[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		loadReplacements()
	}, [])

	const loadReplacements = async () => {
		setLoading(true)
		const res = await fetch('/api/replacements')
		const data = await res.json()

		// Фильтруем только замены на сегодня и будущие даты
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const filtered = (data.replacements || []).filter((r: Replacement) => {
			const repDate = new Date(r.date)
			repDate.setHours(0, 0, 0, 0)
			return repDate >= today
		})

		// Сортируем по дате
		filtered.sort((a: Replacement, b: Replacement) => {
			return new Date(a.date).getTime() - new Date(b.date).getTime()
		})

		setReplacements(filtered)
		setLoading(false)
	}

	const groupByDate = () => {
		const grouped: Record<string, Replacement[]> = {}
		replacements.forEach(r => {
			if (!grouped[r.date]) {
				grouped[r.date] = []
			}
			grouped[r.date].push(r)
		})
		return grouped
	}

	const getDayOfWeek = (dateStr: string) => {
		const days = [
			'воскресенье',
			'понедельник',
			'вторник',
			'среда',
			'четверг',
			'пятница',
			'суббота',
		]
		const date = new Date(dateStr)
		return days[date.getDay()]
	}

	const isToday = (dateStr: string) => {
		const today = new Date()
		const date = new Date(dateStr)
		return (
			today.getFullYear() === date.getFullYear() &&
			today.getMonth() === date.getMonth() &&
			today.getDate() === date.getDate()
		)
	}

	if (loading) {
		return (
			<>
				<Header />
				<div className='page-content'>
					<div className='modern-container'>
						<div className='loading'>Загрузка замен...</div>
					</div>
				</div>
				<Footer />
			</>
		)
	}

	const groupedReplacements = groupByDate()

	return (
		<>
			<Header title='Замены' subtitle='Актуальные замены занятий' />

			<div className='page-content'>
				<div className='modern-container'>
					<div className='selection-container'>
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

						{Object.keys(groupedReplacements).length === 0 ? (
							<p
								style={{
									textAlign: 'center',
									color: '#6b7280',
									padding: '40px 20px',
									fontSize: '1.1rem',
								}}
							>
								Нет актуальных замен
							</p>
						) : (
							<div style={{ marginTop: '20px' }}>
								{Object.entries(groupedReplacements).map(([date, items]) => (
									<div
										key={date}
										style={{
											marginBottom: '32px',
											background: isToday(date) ? '#fef3c7' : 'white',
											borderRadius: '28px',
											overflow: 'hidden',
											boxShadow: isToday(date)
												? '0 4px 12px rgba(245, 158, 11, 0.2)'
												: '0 2px 8px rgba(0, 0, 0, 0.04)',
											border: isToday(date) ? '2px solid #fbbf24' : 'none',
										}}
									>
										<div
											style={{
												padding: '20px 24px',
												background: isToday(date)
													? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
													: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
												color: 'white',
											}}
										>
											<h3
												style={{
													fontSize: '1.4rem',
													fontWeight: 400,
													margin: 0,
													letterSpacing: '0.5px',
												}}
											>
												{new Date(date).toLocaleDateString('ru-RU', {
													day: 'numeric',
													month: 'long',
													year: 'numeric',
												})}
												{' — '}
												{getDayOfWeek(date)}
												{isToday(date) && ' (СЕГОДНЯ)'}
											</h3>
										</div>

										<div style={{ padding: '20px 24px' }}>
											<div className='admin-table-wrapper'>
												<table className='admin-table'>
													<thead>
														<tr>
															<th>Группа</th>
															<th>Пара</th>
															<th
																style={{
																	background: '#fee2e2',
																	color: '#991b1b',
																}}
															>
																Было
															</th>
															<th
																style={{
																	background: '#dcfce7',
																	color: '#166534',
																}}
															>
																Стало
															</th>
															<th>Аудитория</th>
														</tr>
													</thead>
													<tbody>
														{items
															.sort((a, b) => a.pairNumber - b.pairNumber)
															.map(r => (
																<tr key={r.id}>
																	<td style={{ fontWeight: 600 }}>
																		{r.groupFull}
																	</td>
																	<td
																		style={{
																			fontWeight: 700,
																			color: '#3b82f6',
																			textAlign: 'center',
																		}}
																	>
																		{r.pairNumber}
																	</td>
																	<td
																		style={{
																			background: '#fef2f2',
																			color: '#991b1b',
																		}}
																	>
																		<div
																			style={{
																				fontSize: '0.9rem',
																				fontWeight: 500,
																				marginBottom: '4px',
																			}}
																		>
																			{r.originalSubject || '—'}
																		</div>
																		<div
																			style={{
																				fontSize: '0.8rem',
																				opacity: 0.8,
																			}}
																		>
																			{r.originalTeacher || '—'}
																		</div>
																	</td>
																	<td
																		style={{
																			background: '#f0fdf4',
																			color: '#166534',
																		}}
																	>
																		<div
																			style={{
																				fontSize: '0.9rem',
																				fontWeight: 600,
																				marginBottom: '4px',
																			}}
																		>
																			{r.newSubject}
																		</div>
																		<div
																			style={{
																				fontSize: '0.8rem',
																				opacity: 0.8,
																			}}
																		>
																			{r.newTeacher}
																		</div>
																	</td>
																	<td style={{ textAlign: 'center' }}>
																		{r.room
																			? r.room === 'Дистанционно' ||
																				r.room === 'Дист'
																				? '🏠 Дист'
																				: r.room
																			: '—'}
																	</td>
																</tr>
															))}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			<Footer />
		</>
	)
}
