import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title:
		'Расписание АИТУ (ТКУИК) - Академия инженерных технологий и управления',
	description:
		'Актуальное расписание занятий АИТУ (Академия инженерных технологий и управления), бывший ТКУИК (Технический колледж управления и коммерции). Расписание для студентов и преподавателей всех курсов.',
	keywords: [
		'АИТУ',
		'Академия инженерных технологий и управления',
		'ТКУИК',
		'Технический колледж управления и коммерции',
		'расписание АИТУ',
		'расписание ТКУИК',
		'расписание занятий',
		'расписание студентов',
		'расписание преподавателей',
		'АИТУ Санкт-Петербург',
		'ТКУИК СПб',
		'колледж расписание',
		'академия расписание',
	],
	authors: [{ name: 'АИТУ' }],
	openGraph: {
		title: 'Расписание АИТУ (ТКУИК)',
		description:
			'Актуальное расписание занятий Академии инженерных технологий и управления',
		type: 'website',
		locale: 'ru_RU',
		siteName: 'Расписание АИТУ',
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
		},
	},
	alternates: {
		canonical: 'https://schedule-aitu.ru',
	},
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'EducationalOrganization',
		name: 'АИТУ - Академия инженерных технологий и управления',
		alternateName: ['ТКУИК', 'Технический колледж управления и коммерции'],
		url: 'https://schedule-aitu.ru',
		description:
			'Расписание занятий Академии инженерных технологий и управления (бывший ТКУИК)',
		address: {
			'@type': 'PostalAddress',
			addressLocality: 'Санкт-Петербург',
			addressCountry: 'RU',
		},
	}

	return (
		<html lang='ru'>
			<head>
				<meta name='viewport' content='width=device-width, initial-scale=1' />
				<meta name='theme-color' content='#3b82f6' />
				<link rel='canonical' href='https://schedule-aitu.ru' />
				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
			</head>
			<body>{children}</body>
		</html>
	)
}
