'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Footer from '../../components/Footer'
import Header from '../../components/Header'

export default function AdminLogin() {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const router = useRouter()

	const handleLogin = (e: React.FormEvent) => {
		e.preventDefault()

		if (username === 'admin' && password === 'admin') {
			localStorage.setItem('adminAuth', 'true')
			router.push('/admin')
		} else {
			setError('Неверный логин или пароль')
		}
	}

	return (
		<>
			<Header />

			<div className='page-content'>
				<div className='modern-container'>
					<div
						className='selection-container'
						style={{ maxWidth: '500px', margin: '0 auto' }}
					>
						<h2 className='section-title'>Вход в панель администратора</h2>
						<p
							style={{
								textAlign: 'center',
								color: '#6b7280',
								marginBottom: '24px',
								fontSize: '0.95rem',
							}}
						>
							Войти может только администратор. У всех остальных нет доступа.
						</p>

						<form onSubmit={handleLogin}>
							<div style={{ marginBottom: '16px' }}>
								<label
									style={{
										display: 'block',
										marginBottom: '8px',
										color: '#374151',
										fontWeight: 500,
									}}
								>
									Логин
								</label>
								<input
									type='text'
									value={username}
									onChange={e => setUsername(e.target.value)}
									placeholder='Введите логин'
									autoComplete='username'
									className='modern-input'
								/>
							</div>

							<div style={{ marginBottom: '20px' }}>
								<label
									style={{
										display: 'block',
										marginBottom: '8px',
										color: '#374151',
										fontWeight: 500,
									}}
								>
									Пароль
								</label>
								<input
									type='password'
									value={password}
									onChange={e => setPassword(e.target.value)}
									placeholder='Введите пароль'
									autoComplete='current-password'
									className='modern-input'
								/>
							</div>

							{error && (
								<div className='error-text' style={{ marginBottom: '20px' }}>
									{error}
								</div>
							)}

							<button type='submit' className='submit-btn'>
								Войти
							</button>

							<button
								type='button'
								className='back-link'
								style={{
									width: '100%',
									marginTop: '12px',
									textAlign: 'center',
								}}
								onClick={() => router.push('/')}
							>
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
						</form>
					</div>
				</div>
			</div>

			<Footer />
		</>
	)
}
