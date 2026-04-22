/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    const proxyTarget = process.env.API_PROXY_TARGET;

    if (!proxyTarget) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${proxyTarget.replace(/\/$/, "")}/api/:path*`,
      },
      {
        source: "/images/:path*",
        destination: `${proxyTarget.replace(/\/$/, "")}/images/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
