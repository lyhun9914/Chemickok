import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자 | 냥신 점괘",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
