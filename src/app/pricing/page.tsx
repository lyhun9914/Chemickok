import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PricingTable } from "@/components/PricingTable";
import { saleLive } from "@/lib/pricing";
import { getSettings } from "@/services/server/settings";

export const metadata: Metadata = {
  title: "요금 안내 | 냥신 점괘",
  description: "냥신 점괘 점괘별 전체 풀이 가격과 냥 충전 상품 안내. 기본 풀이는 무료예요.",
  alternates: { canonical: "/pricing" },
};

// read per request so the first paint already shows the 관리자's prices, not the code defaults
async function Live() {
  await connection();
  const s = await getSettings();
  return <PricingTable initial={{ pricing: s.pricing, sale: saleLive(s.sale) ? s.sale : null }} />;
}

export default function Pricing() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Live />
    </Suspense>
  );
}
