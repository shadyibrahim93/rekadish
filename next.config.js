// next.config.js
/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  sassOptions: {
    sourceMap: true,
    includePaths: [path.join(__dirname, 'scss')]
  },

  images: {
    // Cloudflare does not support the default Next.js Image Optimization API.
    // We set unoptimized: true to serve images as-is (saving bandwidth & processing).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hhdwpdvczefdyuynppjk.supabase.co'
      }
    ]
  },

  // 👇 THIS FIXES THE "NO CSS" ISSUE
  async headers() {
    return [
      {
        // Apply these headers to all routes (the HTML pages)
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            // max-age=0, must-revalidate: Browser must check with server before using cached HTML.
            // s-maxage=1, stale-while-revalidate=59: CDNs (like Cloudflare) can cache briefly.
            value:
              'public, max-age=0, s-maxage=1, stale-while-revalidate=59, must-revalidate'
          }
        ]
      },
      {
        // Allow static assets (CSS, JS, Images) to cache forever (they have unique hashes)
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
    // Only enable ads.txt redirect in PRODUCTION
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/ads.txt',
          destination: 'https://srv.adstxtmanager.com/19390/rekadish.com'
        }
      ];
    }

    // No rewrite in dev
    return [];
  }
};

// 🔥 MUST USE COMMONJS EXPORT FOR FIREBASE SSR (AND OPENNEXT)
module.exports = nextConfig;
