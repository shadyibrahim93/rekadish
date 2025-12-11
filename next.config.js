/** @type {import('next').NextConfig} */
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  sassOptions: {
    sourceMap: true,
    includePaths: [path.join(__dirname, 'scss')]
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hhdwpdvczefdyuynppjk.supabase.co'
      }
    ]
  },

  async headers() {
    // In dev, let Next.js control caching so HMR works properly
    if (!isProd) {
      return [];
    }

    return [
      {
        // HTML routes
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value:
              'public, max-age=0, s-maxage=1, stale-while-revalidate=59, must-revalidate'
          }
        ]
      },
      {
        // Static assets (JS, CSS, images)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },

  async rewrites() {
    if (isProd) {
      return [
        {
          source: '/ads.txt',
          destination: 'https://srv.adstxtmanager.com/19390/rekadish.com'
        }
      ];
    }

    return [];
  }
};

// 🔥 MUST USE COMMONJS EXPORT
module.exports = nextConfig;
