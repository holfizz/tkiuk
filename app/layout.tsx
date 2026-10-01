import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	metadataBase: new URL('https://schedule-aitu.ru'),
	icons: {
		icon: { url: '/logo_circular-cropped.png', type: 'image/png' },
		apple: '/logo_circular-cropped.png',
	},
	title: 'Расписание АИТУ - Академия инженерных технологий и управления',
	description:
		'Актуальное расписание занятий АИТУ — Академии инженерных технологий и управления. Расписание для студентов и преподавателей всех курсов.',
	keywords: [
		'АИТУ',
		'Академия инженерных технологий и управления',
		'расписание АИТУ',
		'расписание занятий',
		'расписание студентов',
		'расписание преподавателей',
		'АИТУ Санкт-Петербург',
		'колледж расписание',
		'академия расписание',
	],
	authors: [{ name: 'АИТУ' }],
	openGraph: {
		title: 'Расписание АИТУ',
		description:
			'Актуальное расписание занятий Академии инженерных технологий и управления',
		type: 'website',
		locale: 'ru_RU',
		siteName: 'Расписание АИТУ',
		images: [{ url: '/logo_circular-cropped.png', alt: 'АИТУ' }],
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
		url: 'https://schedule-aitu.ru',
		description:
			'Расписание занятий Академии инженерных технологий и управления',
		address: {
			'@type': 'PostalAddress',
			addressLocality: 'Санкт-Петербург',
			addressCountry: 'RU',
		},
	}

	return (
		<html lang="ru">
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="theme-color" content="#3b82f6" />
				<link rel="canonical" href="https://schedule-aitu.ru" />

				<link rel="manifest" href="/site.webmanifest" />

				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
			</head>
			<body>{children}</body>
		</html>
	)
}
