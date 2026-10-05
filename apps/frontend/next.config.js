const imageHostnames = (process.env.IMAGE_HOSTNAMES || 'images.unsplash.com,flagcdn.com')
  .split(',')
  .map((hostname) => hostname.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Backup imports are streamed through the /api rewrite. This must be
    // slightly larger than the 2 GiB file limit to allow multipart overhead.
    proxyClientMaxBodySize: '2050mb',
  },
  images: {
    remotePatterns: imageHostnames.map((hostname) => ({ protocol: 'https', hostname })),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
