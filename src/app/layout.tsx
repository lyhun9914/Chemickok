import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "냥신 점괘 | 고양이 도사의 사주 · 궁합 · 연애 점괘",
  description: "고양이 도사 냥신과 1:1 면담으로 보는 사주 점괘. 내 연애 팔자와 찰떡 궁합, 그 사람 속마음, 이번 달 운세까지. 사주 × MBTI × 심리",
  openGraph: {
    title: "냥신 점괘 🐾",
    description: "흥, 또 고민이냥? 고양이 도사 냥신이 1:1 면담으로 봐주는 사주 점괘",
    images: ["/og.png"],
    locale: "ko_KR",
    type: "website",
  },
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
      </head>
      <body className="min-h-full">
        {/* Mobile-first: everything lives in a 480px column centered on desktop */}
        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">{children}</div>
      </body>
    </html>
  );
}
