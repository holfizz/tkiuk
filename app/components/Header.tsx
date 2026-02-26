'use client'

import { useRouter } from 'next/navigation'

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

	return (
		<div className='header-wrapper'>
			<div className='header-container'>
				<div className='header-content'>
					<h1>{title || 'Расписание АИТУ'}</h1>
					{subtitle && <p>{subtitle}</p>}
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
	)
}
