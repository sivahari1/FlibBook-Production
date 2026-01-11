import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },

  // ✅ Keep native modules out of webpack bundling
  serverExternalPackages: [
    "sharp",
    "pdfjs-dist",
    "@napi-rs/canvas",
    "@napi-rs/canvas-win32-x64-msvc",
    "@napi-rs/canvas-linux-x64-gnu",
    "@napi-rs/canvas-linux-x64-musl",
    "@napi-rs/canvas-darwin-x64",
    "@napi-rs/canvas-darwin-arm64",
  ],

  webpack: (config, { isServer }) => {
    // Do NOT alias "canvas" = false globally; it can break server rendering paths.
    // Only prevent client bundles from trying to include native deps.
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        "@napi-rs/canvas": false,
      };
    }

    // Ensure server build treats @napi-rs/canvas as external (commonjs)
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "@napi-rs/canvas": "commonjs @napi-rs/canvas",
      });
    }

    return config;
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.razorpay.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
