import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "연애 케미 & 속마음 리포트 | 사주 × 연애 심리 궁합",
  description: "내 상대방의 진짜 속마음과 우리의 연애 폭탄 유형 진단. 990원으로 알아보는 사주 × 연애 심리 & 멘탈 케미 분석",
  openGraph: {
    title: "연애 케미 & 속마음 리포트 💘",
    description: "내 상대방의 진짜 속마음과 우리의 연애 폭탄 유형 진단",
    images: ["/og.png"],
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e0a1a",
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
      </head>
      <body className="min-h-full">
        {/* Mobile-first: everything lives in a 480px column centered on desktop */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">{children}</div>
      </body>
    </html>
  );
}
