import type { NextConfig } from "next";

// 관리자 화면은 따로 된 주소에서 연다: 손님 앱(주소 전체가 범위)을 설치한 기기에서도 관리자 앱이 따로 설치되게.
// 운영은 nyangsin-admin, 테스트용(dev 미리보기)은 nyangsin-test-admin. 로컬에서는 그대로 /admin.
const ADMIN_HOST =
  process.env.VERCEL_ENV === "production" ? "nyangsin-admin.vercel.app" : process.env.VERCEL_ENV === "preview" ? "nyangsin-test-admin.vercel.app" : null;

const nextConfig: NextConfig = {
  async redirects() {
    if (!ADMIN_HOST) return [];
    return [
      // the admin address opens straight onto the 관리자 화면
      { source: "/", has: [{ type: "host", value: ADMIN_HOST }], destination: "/admin", permanent: false },
      // /admin on any other address of this deployment moves to the admin address
      { source: "/admin", missing: [{ type: "host", value: ADMIN_HOST }], destination: `https://${ADMIN_HOST}/admin`, permanent: false },
    ];
  },
  /* config options here */
  cacheComponents: true,
  poweredByHeader: false,
  // Basic hardening: no MIME sniffing, other sites get only the origin as referrer, camera/mic/location never used.
  // Nothing may frame the site (the 관리자 page included) — except /payment/*, where Toss's window lands.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/((?!payment/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
