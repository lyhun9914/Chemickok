import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "이용약관 | 냥신 점괘", alternates: { canonical: "/terms" } };

export default function Terms() {
  return <LegalPage doc="terms" />;
}
