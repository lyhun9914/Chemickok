import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SeoShell } from "@/components/SeoShell";
import { allIlju, iljuByName } from "@/engine/ilju";

export function generateStaticParams() {
  return allIlju().map((c) => ({ ganji: c.ganji }));
}

const cardOf = async (params: PageProps<"/ilju/[ganji]">["params"]) => iljuByName(decodeURIComponent((await params).ganji));

export async function generateMetadata({ params }: PageProps<"/ilju/[ganji]">): Promise<Metadata> {
  const c = await cardOf(params);
  if (!c) return {};
  return {
    title: `${c.ganji}일주(${c.hanja}) 성격과 연애 · ${c.name} | 냥신 점괘`,
    description: `${c.ganji}일주는 '${c.name}'이다냥. ${c.trait.slice(0, 60)}… 연애 스타일, 기 센 순위 ${c.rank}위, 찰떡궁합 일주까지.`,
    alternates: { canonical: `/ilju/${c.ganji}` },
  };
}

export default async function IljuPage({ params }: PageProps<"/ilju/[ganji]">) {
  const c = await cardOf(params);
  if (!c) notFound();
  return (
    <SeoShell cta={{ href: "/?game=ilju", label: `🐈 나도 ${c.ganji}일주일까? 확인하기`, sub: "생일만 넣으면 무료로 알려 준다냥 · 연애 궁합은 면담으로" }}>
      <p className="text-[13px] text-muted">
        60일주 도감 No.{c.no} · {c.hanja}
      </p>
      <h1 className="font-ritual mt-1 text-[28px] leading-snug">
        {c.icon} {c.ganji}일주 · {c.name}
      </h1>
      <p className="mt-2 flex flex-wrap gap-1.5">
        {c.keys.map((k) => (
          <span key={k} className="rounded-full border border-peach/40 px-2.5 py-0.5 text-[12.5px] text-peach">
            #{k}
          </span>
        ))}
      </p>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[16px] font-bold">성격</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed">{c.trait}</p>
        {c.labelLine && <p className="mt-2 text-[14px] leading-relaxed text-peach">{c.labelLine}</p>}
      </section>
      <section className="mt-3 rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[16px] font-bold">연애 스타일</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed">{c.love}</p>
      </section>
      <section className="mt-3 rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[16px] font-bold">기 센 순위 {c.rank}위 / 60</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed">{c.rankLine}</p>
        {c.labels.length > 0 && <p className="mt-2 text-[13px] text-muted">특수 일주: {c.labels.join(" · ")}</p>}
      </section>
      <section className="mt-3 rounded-2xl border border-pink/40 bg-pink/5 p-4">
        <h2 className="text-[16px] font-bold">💞 찰떡궁합 일주</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed">
          천간이 합하고 지지가 육합을 이루는{" "}
          <Link href={`/ilju/${c.match.ganji}`} className="font-bold text-peach underline underline-offset-4">
            {c.match.ganji}일주 · {c.match.name}
          </Link>
          이랑 기운이 제일 잘 맞는다냥.
        </p>
      </section>
      <p className="mt-6 text-[12.5px] leading-relaxed text-muted">
        일주는 사주 여덟 글자 중 두 글자다냥. 같은 일주라도 나머지 기둥과 대운에 따라 사람마다 다르게 나온다냥. 내 사주 전체는 면담으로 풀어 준다냥.
      </p>
      <Link href="/ilju" className="mt-4 block text-center text-[13.5px] text-peach underline underline-offset-4">
        60일주 도감 전체 보기
      </Link>
    </SeoShell>
  );
}
