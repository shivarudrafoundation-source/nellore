/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@srf/ui', '@srf/types', '@srf/validation'],
  env: {
    NEXT_PUBLIC_API_URL: 'https://sivarudra-api.onrender.com',
    NEXT_PUBLIC_WS_URL: 'wss://sivarudra-api.onrender.com',
    NEXT_PUBLIC_CONTESTANT_URL: 'https://my.shivarudrafoundation.com',
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  },
  async redirects() {
    return [
      {
        source: '/signin',
        destination: '/login',
        permanent: true,
      },
      {
        source: '/sign-in',
        destination: '/login',
        permanent: true,
      },
      {
        source: '/sign-up',
        destination: '/signup',
        permanent: true,
      },
      {
        source: '/contestant-login',
        destination: '/login',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;

