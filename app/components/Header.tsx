'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface HeaderProps {
	title?: string
	subtitle?: string
	showChangeButton?: boolean
	onChangeClick?: () => void
	changeButtonText?: string
}

export default function Header({
	title,
	subtitle,
	showChangeButton,
	onChangeClick,
	changeButtonText,
}: HeaderProps) {
	const router = useRouter()
	const [showModal, setShowModal] = useState(false)

	const handleLogoClick = () => {
		// Проверяем есть ли сохраненные данные пользователя
		const userRole = localStorage.getItem('userRole')
		const userCourse = localStorage.getItem('userCourse')
		const userGroup = localStorage.getItem('userGroup')
		const userTeacher = localStorage.getItem('userTeacher')

		if (userRole || userCourse || userGroup || userTeacher) {
			setShowModal(true)
		} else {
			router.push('/')
		}
	}

	const handleConfirmNavigation = () => {
		// Очищаем все данные пользователя
		localStorage.removeItem('userRole')
		localStorage.removeItem('userCourse')
		localStorage.removeItem('userGroup')
		localStorage.removeItem('userTeacher')
		setShowModal(false)
		router.push('/')
	}

	const handleCancelNavigation = () => {
		setShowModal(false)
	}

	return (
		<>
			<div className='header-wrapper'>
				<div className='header-container'>
					<div
						className='header-content'
						onClick={handleLogoClick}
						style={{
							cursor: 'pointer',
							userSelect: 'none',
							display: 'flex',
							alignItems: 'center',
							gap: '16px',
						}}
					>
						<img
							src='/logo.jpg'
							alt='АИТУ'
							style={{
								width: '64px',
								height: '64px',
								borderRadius: '16px',
								objectFit: 'cover',
							}}
						/>
						<div>
							<h1>{title || 'Расписание АИТУ'}</h1>
							{subtitle && <p>{subtitle}</p>}
						</div>
					</div>
					<div className='header-actions'>
						{showChangeButton && onChangeClick && (
							<button className='btn-header-action' onClick={onChangeClick}>
								<svg
									xmlns='http://www.w3.org/2000/svg'
									width={18}
									height={18}
									viewBox='0 0 24 24'
									style={{ verticalAlign: 'middle', marginRight: '6px' }}
								>
									<rect width='24' height='24' fill='none' />
									<path
										fill='currentColor'
										d='M14.293 2.293a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414-1.414L16.586 8H5a1 1 0 0 1 0-2h11.586l-2.293-2.293a1 1 0 0 1 0-1.414m-4.586 10a1 1 0 0 1 0 1.414L7.414 16H19a1 1 0 1 1 0 2H7.414l2.293 2.293a1 1 0 0 1-1.414 1.414l-4-4a1 1 0 0 1 0-1.414l4-4a1 1 0 0 1 1.414 0'
									/>
								</svg>
								{changeButtonText || 'Сменить'}
							</button>
						)}
						<button
							className='btn-header-admin'
							onClick={() => router.push('/admin/login')}
							title='Вход для администратора'
						>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								width={20}
								height={20}
								viewBox='0 0 24 24'
							>
								<path
									fill='currentColor'
									d='M12 14v2a6 6 0 0 0-6 6H4a8 8 0 0 1 8-8m0-1c-3.315 0-6-2.685-6-6s2.685-6 6-6s6 2.685 6 6s-2.685 6-6 6m0-2c2.21 0 4-1.79 4-4s-1.79-4-4-4s-4 1.79-4 4s1.79 4 4 4m9 6h1v5h-8v-5h1v-1a3 3 0 1 1 6 0zm-2 0v-1a1 1 0 1 0-2 0v1z'
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>

			{/* Модальное окно предупреждения */}
			{showModal && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: 'rgba(0, 0, 0, 0.5)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1000,
					}}
				>
					<div
						style={{
							background: 'white',
							borderRadius: '28px',
							padding: '32px',
							maxWidth: '400px',
							margin: '20px',
							boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
						}}
					>
						<h3
							style={{
								fontSize: '1.4rem',
								fontWeight: 600,
								color: '#1a1a1a',
								marginBottom: '16px',
								textAlign: 'center',
							}}
						>
							Переход на главную страницу
						</h3>
						<p
							style={{
								color: '#6b7280',
								marginBottom: '24px',
								textAlign: 'center',
								lineHeight: 1.6,
							}}
						>
							При переходе на главную страницу вам снова придется выбирать
							группу или преподавателя. Продолжить?
						</p>
						<div
							style={{
								display: 'flex',
								gap: '12px',
								justifyContent: 'center',
							}}
						>
							<button
								onClick={handleCancelNavigation}
								style={{
									padding: '12px 24px',
									background: '#f3f4f6',
									border: 'none',
									borderRadius: '20px',
									color: '#374151',
									fontWeight: 500,
									cursor: 'pointer',
									transition: 'all 0.2s',
								}}
							>
								Отмена
							</button>
							<button
								onClick={handleConfirmNavigation}
								style={{
									padding: '12px 24px',
									background: '#3b82f6',
									border: 'none',
									borderRadius: '20px',
									color: 'white',
									fontWeight: 500,
									cursor: 'pointer',
									transition: 'all 0.2s',
								}}
							>
								Продолжить
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
