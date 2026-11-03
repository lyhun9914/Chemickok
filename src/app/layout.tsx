import type { Metadata, Viewport } from "next";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "냥신 점괘 | 골목 끝 고양이 점집 · 사주 · 궁합 · 연애 팔자",
  description: "고양이 도사 냥신과 1:1 면담으로 보는 사주 점괘. 내 연애 팔자와 찰떡 궁합, 그 사람 속마음, 이번 달 운세까지. 사주 × MBTI × 심리",
  openGraph: {
    title: "냥신 점괘 🕯️ 골목 끝 점집",
    description: "…들어왔으면 문부터 닫아라냥. 촛불 앞 1:1 면담으로 보는 사주 · 궁합 · 연애 팔자",
    images: ["/og.png?v=2"],
    locale: "ko_KR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  // Phones turn numbers and addresses into call / mail links on their own; the 사업자 정보 should stay plain text.
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090605",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" crossOrigin="anonymous" href="https://fonts.googleapis.com/css2?family=Song+Myung&display=swap" />
        {/* Chrome may offer the install (홈 화면에 추가) before the app has drawn: keep it for the install card. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__nyangInstall=e;window.dispatchEvent(new Event("nyang-installable"))});',
          }}
        />
      </head>
      <body className="min-h-full">
        {/* Mobile-first: everything lives in a 480px column centered on desktop. min-h-svh, not dvh: a dynamic height
            changes while the address bar slides during a scroll, and the whole page re-laid out with it. */}
        <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-[480px] flex-col">{children}</div>
      </body>
    </html>
  );
}
