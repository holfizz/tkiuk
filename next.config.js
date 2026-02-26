/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		outputFileTracingRoot: require('path').join(__dirname),
	},
}

module.exports = nextConfig
