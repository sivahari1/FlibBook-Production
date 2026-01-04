import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };
    return config;
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  serverExternalPackages: ["sharp", "canvas"],

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.razorpay.com",

      // ✅ REQUIRED FOR PDF IFRAME
      "frame-src 'self' https://*.supabase.co https://api.razorpay.com",
      "child-src 'self' https://*.supabase.co https://api.razorpay.com",

      "worker-src 'self' blob:",
      "object-src 'none'",

      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
