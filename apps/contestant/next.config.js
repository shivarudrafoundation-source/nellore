/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@srf/ui', '@srf/types', '@srf/validation'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://sivarudra-api.onrender.com',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://sivarudra-api.onrender.com',
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://sivarudra-api.onrender.com';
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendUrl.replace(/\/+$/, '')}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
