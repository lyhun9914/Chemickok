import type { Metadata } from "next";
import Link from "next/link";
import { SeoShell } from "@/components/SeoShell";
import { allIlju } from "@/engine/ilju";

export const metadata: Metadata = {
  title: "60일주 고양이 도감 · 일주별 성격과 연애 | 냥신 점괘",
  description: "갑자일주부터 계해일주까지, 60일주를 고양이로 풀었다냥. 일주별 성격, 연애 스타일, 기 센 순위, 찰떡궁합 일주까지.",
  alternates: { canonical: "/ilju" },
};

export default function IljuIndex() {
  const list = allIlju();
  return (
    <SeoShell cta={{ href: "/?game=ilju", label: "🐈 내 일주 고양이 찾기 (무료)", sub: "생일만 넣으면 60마리 중 네 고양이를 찾아 준다냥" }}>
      <h1 className="font-ritual text-[26px] leading-snug">60일주 고양이 도감</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        사주의 일주(日柱)는 태어난 날의 기둥이다냥. 나 자신을 가장 잘 보여 주는 자리라, 친구끼리 제일 많이 비교하는 것도 일주다냥. 60일주를 고양이
        한 마리씩으로 풀었다냥.
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-2.5">
        {list.map((c) => (
          <li key={c.ganji}>
            <Link href={`/ilju/${c.ganji}`} className="block rounded-2xl border border-line bg-surface p-3 active:scale-[0.98]">
              <span className="text-[12px] text-muted">
                No.{c.no} · {c.hanja}
              </span>
              <span className="mt-0.5 block text-[15px] font-bold">
                {c.icon} {c.ganji}일주
              </span>
              <span className="mt-0.5 block text-[12.5px] text-peach">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </SeoShell>
  );
}
