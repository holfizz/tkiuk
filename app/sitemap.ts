import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: 'https://schedule-aitu.ru',
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 1,
		},
		{
			url: 'https://schedule-aitu.ru/schedule/student',
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 0.8,
		},
		{
			url: 'https://schedule-aitu.ru/schedule/teacher',
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 0.8,
		},
	]
}
