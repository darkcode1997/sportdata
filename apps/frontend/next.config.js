const imageHostnames = `${process.env.IMAGE_HOSTNAMES || 'images.unsplash.com,flagcdn.com'},res.cloudinary.com`
  .split(',')
  .map((hostname) => hostname.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: imageHostnames.map((hostname) => ({ protocol: 'https', hostname })),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
