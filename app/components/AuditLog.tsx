'use client'
import { useEffect, useState } from 'react'
type Log = {
	id: number
	username: string
	action: string
	entity: string
	campus: string | null
	createdAt: string
	details: unknown
}
const actions: Record<string, string> = {
	LOGIN: 'Вход',
	LOGIN_FAILED: 'Неудачный вход',
	LOGOUT: 'Выход',
	UPDATE: 'Изменение',
	CREATE: 'Создание',
	DELETE: 'Удаление',
	IMPORT: 'Загрузка расписания/замен',
	ACCOUNT_CREATE: 'Создание аккаунта',
}
const entities: Record<string, string> = {
	auth: 'Аккаунт',
	schedule: 'Расписание',
	replacement: 'Замены',
	'week-settings': 'Тип недели',
	user: 'Пользователь',
}
export default function AuditLog() {
	const [logs, setLogs] = useState<Log[]>([])
	const [cursor, setCursor] = useState<number | null>(null)
	const [pending, setPending] = useState(false)
	const [error, setError] = useState('')
	async function load(next?: number) {
		setPending(true)
		setError('')
		try {
			const res = await fetch(`/api/audit${next ? `?cursor=${next}` : ''}`)
			const data = await res.json()
			if (!res.ok) throw new Error(data.error)
			setLogs((prev) => (next ? [...prev, ...data.logs] : data.logs))
			setCursor(data.nextCursor)
		} catch (error) {
			setError(
				error instanceof Error ? error.message : 'Не удалось загрузить журнал',
			)
		} finally {
			setPending(false)
		}
	}
	useEffect(() => {
		load()
	}, [])
	return (
		<section className="selection-container">
			<h2>Журнал действий</h2>
			<p>Входы, выходы и изменения с указанием аккаунта. Время — московское.</p>
			<button className="back-link" disabled={pending} onClick={() => load()}>
				Обновить
			</button>
			{error && <p role="alert">{error}</p>}
			<div style={{ overflowX: 'auto' }}>
				<table className="schedule-table">
					<thead>
						<tr>
							<th>Время</th>
							<th>Аккаунт</th>
							<th>Действие</th>
							<th>Площадка</th>
							<th>Изменения</th>
						</tr>
					</thead>
					<tbody>
						{logs.map((log) => (
							<tr key={log.id}>
								<td>
									{new Date(log.createdAt).toLocaleString('ru-RU', {
										timeZone: 'Europe/Moscow',
									})}
								</td>
								<td>{log.username}</td>
								<td>
									{actions[log.action] || log.action} ·{' '}
									{entities[log.entity] || log.entity}
								</td>
								<td>
									{log.campus === 'MAIN'
										? '1'
										: log.campus === 'SECONDARY'
											? '2'
											: 'Все'}
								</td>
								<td>
									<details>
										<summary>Подробности</summary>
										<pre
											style={{
												maxWidth: 550,
												maxHeight: 350,
												overflow: 'auto',
												whiteSpace: 'pre-wrap',
											}}
										>
											{JSON.stringify(log.details, null, 2)}
										</pre>
									</details>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{!pending && !logs.length && !error && <p>Записей пока нет</p>}
			{cursor && (
				<button
					className="back-link"
					disabled={pending}
					onClick={() => load(cursor)}
				>
					Показать ещё
				</button>
			)}
		</section>
	)
}
