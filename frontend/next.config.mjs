/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/D:\\System Volume Information/**',
          '**/System Volume Information/**'
        ]
      }
    }
    return config
  }
};

export default nextConfig;
