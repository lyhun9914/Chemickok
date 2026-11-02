// Link previews (KakaoTalk, Instagram, X…) and the sitemap need absolute URLs. Without NEXT_PUBLIC_SITE_URL, a Vercel
// build knows its own production domain; only a local build falls back to localhost.
export const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
