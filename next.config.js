/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SQLite는 서버사이드에서만
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false, path: false };
    }
    return config;
  },
};

module.exports = nextConfig;
