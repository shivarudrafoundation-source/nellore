/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@srf/ui', '@srf/types', '@srf/validation'],
  env: {
    NEXT_PUBLIC_API_URL: 'https://sivarudra-api.onrender.com',
    NEXT_PUBLIC_WS_URL: 'wss://sivarudra-api.onrender.com',
  },
};

module.exports = nextConfig;
