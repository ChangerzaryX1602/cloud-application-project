/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/ui/v2/login',
  assetPrefix: '/ui/v2/login',
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
