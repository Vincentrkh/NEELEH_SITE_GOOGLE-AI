import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  outputFileTracingExcludes: {
    "*": [
      "./db/**",
      "./public/uploads/**",
      "./backups/**",
      "./.env*",
      "./.git/**",
      "./.playwright-cli/**",
      "./download/**",
      "./.next-blue/**",
    ],
  },
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // URLهای دارای اسلش انتهایی (مثل /dashboard/) مستقیم رندر می‌شوند —
  // gateway پیش‌نمایش space-z.ai به /dashboard اسلش اضافه می‌کند و بدون این
  // تنظیم، حلقه ریدایرکت ۳۰۱↔۳۰۸ بین gateway و Next.js ایجاد می‌شود.
  trailingSlash: true,
  // اجازه دسترسی به منابع توسعه از دامنه‌های پیش‌نمایش AI Studio، Cloud Run و localhost
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "**.run.app",
    "**.google.com",
    "**.space-z.ai",
  ],
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline';",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
