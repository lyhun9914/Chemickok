import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "개인정보처리방침 | 냥신 점괘", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return <LegalPage doc="privacy" />;
}
