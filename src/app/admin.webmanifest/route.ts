import { IS_TEST } from "@/lib/stage";

/**
 * GET /admin.webmanifest — the 관리자 app: its own id and scope (/admin), so it installs beside the customer app.
 * On the 테스트용 site it is "냥신 관리자 테스트" with the blue test icon.
 */
export function GET() {
  const icon = IS_TEST ? "test-admin-icon" : "admin-icon";
  return Response.json(
    {
      id: "/admin",
      name: IS_TEST ? "냥신 점괘 관리자 테스트" : "냥신 점괘 관리자",
      short_name: IS_TEST ? "관리자 테스트" : "냥신 관리자",
      description: "냥신 점괘 운영 도구: 매출, 결제·환불, 회원, 가격, 공지, 오류",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      background_color: "#090605",
      theme_color: "#090605",
      lang: "ko",
      icons: [
        { src: `/${icon}-192.png`, sizes: "192x192", type: "image/png" },
        { src: `/${icon}-512.png`, sizes: "512x512", type: "image/png" },
        { src: `/${icon}-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "content-type": "application/manifest+json; charset=utf-8" } },
  );
}
