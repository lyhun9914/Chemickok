import type { MetadataRoute } from "next";

/** 홈 화면에 추가했을 때의 앱 정보. 매일 출석 도장을 찍으러 오기 쉽게. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "냥신 점괘",
    short_name: "냥신 점괘",
    description: "고양이 도사 냥신과 1:1 면담으로 보는 사주 · 궁합 · 연애 팔자",
    start_url: "/",
    display: "standalone",
    background_color: "#090605",
    theme_color: "#090605",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
