import type { MetadataRoute } from "next";
import { IS_TEST } from "@/lib/stage";

/** 홈 화면에 추가했을 때의 앱 정보. 매일 출석 도장을 찍으러 오기 쉽게. 테스트용 사이트는 이름과 아이콘이 따로다. */
export default function manifest(): MetadataRoute.Manifest {
  const icon = IS_TEST ? "test-icon" : "icon";
  return {
    id: "/",
    name: IS_TEST ? "냥신 점괘 테스트" : "냥신 점괘",
    short_name: IS_TEST ? "냥신 테스트" : "냥신 점괘",
    description: IS_TEST ? "냥신 점괘 테스트용 (진짜 결제·회원과 따로)" : "고양이 도사 냥신과 1:1 면담으로 보는 사주 · 궁합 · 연애 팔자",
    start_url: "/",
    display: "standalone",
    background_color: "#090605",
    theme_color: "#090605",
    lang: "ko",
    icons: [
      { src: `/${icon}-192.png`, sizes: "192x192", type: "image/png" },
      { src: `/${icon}-512.png`, sizes: "512x512", type: "image/png" },
      { src: `/${icon}-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
