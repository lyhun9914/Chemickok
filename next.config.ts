import type { NextConfig } from "next";

// 관리자 화면은 따로 된 주소에서 연다: 손님 앱(주소 전체가 범위)을 설치한 기기에서도 관리자 앱이 따로 설치되게.
// 운영은 nyangsin-admin, 테스트용(dev 미리보기)은 nyangsin-test-admin. 로컬에서는 그대로 /admin.
const ADMIN_HOST =
  process.env.VERCEL_ENV === "production" ? "nyangsin-admin.vercel.app" : process.env.VERCEL_ENV === "preview" ? "nyangsin-test-admin.vercel.app" : null;

// 예전 이름(chemickok)의 주소. 같은 사이트가 뜨지만 주소창과 공유 링크에 옛 이름이 남지 않게 냥신 주소로 넘긴다.
// 로그인·결제는 모두 nyangsin 주소에서 일어나므로 넘겨도 깨지는 것이 없다.
const OLD_HOSTS = ["chemickok.vercel.app"];
const MAIN_HOST = "nyangsin.vercel.app";

const nextConfig: NextConfig = {
  // Link-preview crawlers that read <head> only get the metadata before the page (not streamed after it). Next's
  // default list, plus KakaoTalk's scraper (퀴즈 · 케미표 links are mostly shared in 카톡) and Telegram.
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|kakaotalk-scrap|TelegramBot/i,
  async redirects() {
    if (!ADMIN_HOST) return [];
    return [
      // the old name's address → the same page on the 냥신 address (permanent, so search engines move it over too)
      ...(process.env.VERCEL_ENV === "production"
        ? OLD_HOSTS.map((value) => ({ source: "/:path*", has: [{ type: "host" as const, value }], destination: `https://${MAIN_HOST}/:path*`, permanent: true }))
        : []),
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
