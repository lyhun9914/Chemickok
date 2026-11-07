import type { Metadata } from "next";
import { IS_TEST } from "@/lib/stage";

// Its own app on the home screen / desktop: a separate manifest (id and scope /admin) and icon, so it installs
// beside the customer app instead of replacing it. The 테스트용 site's one is named and badged as a test.
export const metadata: Metadata = {
  title: IS_TEST ? "🧪 관리자 테스트 | 냥신 점괘" : "관리자 | 냥신 점괘",
  robots: { index: false, follow: false },
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: IS_TEST ? "관리자 테스트" : "냥신 관리자", statusBarStyle: "black-translucent" },
  icons: { apple: IS_TEST ? "/test-admin-apple-icon.png" : "/admin-apple-icon.png" },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
