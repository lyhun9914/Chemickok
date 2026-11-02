import type { Metadata } from "next";
import Link from "next/link";
import { SeoShell } from "@/components/SeoShell";
import { allTti } from "@/engine/tti";

export const metadata: Metadata = {
  title: "12띠 성격과 궁합 · 띠별 오늘의 운세 | 냥신 점괘",
  description: "쥐띠부터 돼지띠까지 12띠의 성격, 연애, 일, 잘 맞는 띠와 부딪치는 띠, 그리고 띠별 오늘의 운세를 냥신이 풀었다냥.",
  alternates: { canonical: "/tti" },
};

export default function TtiIndex() {
  const list = allTti();
  return (
    <SeoShell cta={{ href: "/?game=zodiac", label: "🐾 오늘 12띠 운세 한 번에 보기", sub: "매일 바뀌는 띠별 일진, 무료다냥" }}>
      <h1 className="font-ritual text-[26px] leading-snug">12띠 성격과 궁합</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        띠는 태어난 해의 지지다냥. 사람들 앞에서의 나, 사회 속 얼굴을 보여 준다냥. 띠마다 잘 맞는 띠와 부딪치는 띠도 정해져 있다냥.
      </p>
      <ul className="mt-6 grid grid-cols-3 gap-2.5">
        {list.map((t) => (
          <li key={t.animal}>
            <Link href={`/tti/${t.animal}`} className="block rounded-2xl border border-line bg-surface p-3 text-center active:scale-[0.98]">
              <span className="block text-3xl">{t.emoji}</span>
              <span className="mt-1 block text-[15px] font-bold">{t.animal}띠</span>
              <span className="mt-0.5 block text-[11.5px] text-muted">{t.years.slice(-3).map((y) => `${String(y).slice(2)}년`).join(" ")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </SeoShell>
  );
}
