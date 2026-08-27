/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@srf/ui', '@srf/types', '@srf/validation'],
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

