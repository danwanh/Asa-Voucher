/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  async redirects() {
    return [
      { source: "/partner_owner/profile", destination: "/partner/profile", permanent: true },
      { source: "/partner_voucher_staff/profile", destination: "/voucher-staff/profile", permanent: true },
      { source: "/partner_store_staff/profile", destination: "/staff/profile", permanent: true },
      { source: "/admin_content/profile", destination: "/admin/profile", permanent: true },
      { source: "/admin_operations/profile", destination: "/admin/profile", permanent: true },
      { source: "/admin_security/profile", destination: "/admin/profile", permanent: true },
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /(node_modules|\.git|System Volume Information)/,
      }
    }
    return config
  }
};

export default nextConfig;
