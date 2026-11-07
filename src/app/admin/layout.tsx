import type { Metadata } from "next";

// Its own app on the home screen / desktop: a separate manifest (id and scope /admin) and icon, so it installs
// beside the customer app instead of replacing it.
export const metadata: Metadata = {
  title: "관리자 | 냥신 점괘",
  robots: { index: false, follow: false },
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "냥신 관리자", statusBarStyle: "black-translucent" },
  icons: { apple: "/admin-apple-icon.png" },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
