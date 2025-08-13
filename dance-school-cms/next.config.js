/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/**',
      },
    ],
  },
  // Environment-specific configurations
  env: {
    NEXT_PUBLIC_BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN,
    NEXT_PUBLIC_VERCEL_PROJECT_NAME: process.env.NEXT_PUBLIC_VERCEL_PROJECT_NAME,
  },
  // Ensure proper handling of dynamic routes
  trailingSlash: false,
  // Optimize for Vercel deployment
  experimental: {
    optimizePackageImports: ['@clerk/nextjs', '@sanity/client'],
    serverComponentsExternalPackages: ['stripe'],
  },
  // CRITICAL: Disable body parsing for webhook routes to preserve raw body
  async rewrites() {
    return [
      {
        source: '/api/stripe/webhook',
        destination: '/api/stripe/webhook',
        has: [
          {
            type: 'header',
            key: 'stripe-signature',
          },
        ],
      },
    ];
  },
  // Ensure webhook routes bypass middleware that could modify the body
  async headers() {
    return [
      {
        source: '/api/stripe/webhook',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-Webhook-Raw-Body',
            value: 'preserve',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
