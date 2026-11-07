"use client";

import Link from "next/link";
import { BUSINESS, PRODUCTS, WELCOME_COINS, nyang, won } from "@/lib/config";
import { sellPacks, useLive } from "@/lib/liveSettings";
import { MODES } from "@/lib/pricing";
import { Nyang } from "./Nyang";

/** 요금 안내: what each reading costs and what the 냥 packs cost, from the live prices (관리자 화면에서 바꾼 값). */
export function PricingTable() {
  const live = useLive();
  const packs = sellPacks(live);
  const direct = (coins: number) => live.pricing.packs.find((p) => p.coins === coins)?.price ?? coins * Math.round(live.pricing.packs[0].price / live.pricing.packs[0].coins);
  const cell = "px-3 py-2.5";
  return (
    <main className="flex-1 px-5 pb-12 pt-5">
      <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-bold text-peach">
        <Nyang mood="smug" size={30} /> 냥신 점괘
      </Link>
      <h1 className="mt-6 text-[24px] font-bold">요금 안내</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        모든 점괘는 <b className="text-ink">기본 풀이가 무료</b>예요. 전체 풀이(감정서)를 열 때만 복채를 내요. 회원은 충전한 <b className="text-ink">냥</b>으로, 비회원은 그 점괘 한
        건을 바로 결제해 열 수 있어요. 가격은 모두 부가세 포함이에요.
      </p>

      <h2 className="mt-7 text-[16px] font-bold">📜 점괘별 전체 풀이</h2>
      <table className="mt-2 w-full overflow-hidden rounded-2xl border border-line text-[14px]">
        <thead className="bg-surface text-[12.5px] text-muted">
          <tr>
            <th className={`${cell} text-left font-medium`}>상품</th>
            <th className={`${cell} text-right font-medium`}>회원 (냥)</th>
            <th className={`${cell} text-right font-medium`}>비회원 바로 결제</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {MODES.map((m) => (
            <tr key={m}>
              <td className={cell}>
                {PRODUCTS[m].emoji} {PRODUCTS[m].name}
              </td>
              <td className={`${cell} text-right font-semibold text-peach`}>{nyang(live.pricing.costs[m])}</td>
              <td className={`${cell} text-right`}>{won(direct(live.pricing.costs[m]))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-7 text-[16px] font-bold">🪙 냥 충전 (회원)</h2>
      {live.sale && (
        <p className="mt-2 rounded-xl border border-pink/40 bg-pink/10 px-3 py-2 text-[13px] text-pink">🎉 지금 {live.sale.label || "충전 세일"} 중이에요. 아래는 세일 가격이에요.</p>
      )}
      <table className="mt-2 w-full overflow-hidden rounded-2xl border border-line text-[14px]">
        <thead className="bg-surface text-[12.5px] text-muted">
          <tr>
            <th className={`${cell} text-left font-medium`}>충전 상품</th>
            <th className={`${cell} text-right font-medium`}>가격</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {packs.map((p) => (
            <tr key={p.id}>
              <td className={cell}>
                {nyang(p.coins)}
                {p.bonus > 0 && <span className="ml-1 text-pink">+{p.bonus}냥</span>}
              </td>
              <td className={`${cell} text-right font-semibold`}>
                {p.price < p.basePrice && <span className="mr-1.5 text-[12px] font-normal text-muted line-through">{won(p.basePrice)}</span>}
                {won(p.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="mt-6 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-muted">
        <li>카카오·네이버·구글로 처음 가입하면 {nyang(WELCOME_COINS)}을 선물로 드려요.</li>
        <li>결제 수단: 토스페이, 카카오페이, 네이버페이, 신용·체크카드 (토스페이먼츠 결제창)</li>
        <li>제공 방법: 결제가 끝나면 그 자리에서 화면으로 바로 열려요. 실물 배송은 없어요. 회원이 연 감정서는 내 점괘함에서 언제든 다시 볼 수 있어요.</li>
        <li>
          열람한 감정서는 디지털 콘텐츠라 환불되지 않아요. 충전한 냥은 7일 안에 쓰지 않은 만큼만 청약철회할 수 있고, 7일이 지나면 남은 유료 냥에서 수수료 10%를 빼고 환불돼요. 무료·보너스·선물 냥은 환불되지 않아요. 자세한 내용은{" "}
          <Link href="/terms" className="text-ink underline underline-offset-2">
            이용약관
          </Link>
          을 확인해 주세요.
        </li>
        <li>냥의 유효기간은 충전일로부터 5년이에요.</li>
        <li>
          문의: {BUSINESS.email} · {BUSINESS.phone}
        </li>
      </ul>

      <Link href="/" className="btn-primary mt-8 block w-full py-4 text-center text-[16px]">
        🕯️ 무료로 점괘 보러 가기
      </Link>
    </main>
  );
}
