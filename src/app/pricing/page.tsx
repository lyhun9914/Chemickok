import type { Metadata } from "next";
import { PricingTable } from "@/components/PricingTable";

export const metadata: Metadata = {
  title: "요금 안내 | 냥신 점괘",
  description: "냥신 점괘 점괘별 전체 풀이 가격과 냥 충전 상품 안내. 기본 풀이는 무료예요.",
  alternates: { canonical: "/pricing" },
};

export default function Pricing() {
  return <PricingTable />;
}
