import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SeoShell } from "@/components/SeoShell";
import { allTti, ttiByName, ttiToday } from "@/engine/tti";

export function generateStaticParams() {
  return allTti().map((t) => ({ animal: t.animal }));
}

const ttiOf = async (params: PageProps<"/tti/[animal]">["params"]) => ttiByName(decodeURIComponent((await params).animal));

export async function generateMetadata({ params }: PageProps<"/tti/[animal]">): Promise<Metadata> {
  const t = await ttiOf(params);
  if (!t) return {};
  return {
    title: `${t.animal}띠 성격·연애·궁합과 오늘의 운세 | 냥신 점괘`,
    description: `${t.animal}띠(${t.years.slice(-4).join("·")}년생) 성격과 연애, 잘 맞는 띠 ${t.best.join("·")}띠, 그리고 오늘의 ${t.animal}띠 운세.`,
    alternates: { canonical: `/tti/${t.animal}` },
  };
}

export default async function TtiPage({ params }: PageProps<"/tti/[animal]">) {
  const t = await ttiOf(params);
  if (!t) notFound();
  return (
    <SeoShell cta={{ href: "/?game=zodiac", label: "🐾 오늘 12띠 운세 전부 보기", sub: "내 사주로 보는 오늘의 운세도 무료다냥" }}>
      <h1 className="font-ritual text-[28px] leading-snug">
        {t.emoji} {t.animal}띠
      </h1>
      <p className="mt-1 text-[13px] text-muted">{t.years.join(" · ")}년생</p>

      <TodayLine animal={t.animal} />
      <section className="mt-3 rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[16px] font-bold">성격</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed">{t.trait}</p>
      </section>
      <section className="mt-3 rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[16px] font-bold">연애</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed">{t.love}</p>
      </section>
      <section className="mt-3 rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[16px] font-bold">일과 재능</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed">{t.work}</p>
      </section>
      <section className="mt-3 rounded-2xl border border-pink/40 bg-pink/5 p-4">
        <h2 className="text-[16px] font-bold">💞 띠 궁합</h2>
        <ul className="mt-2 space-y-1.5 text-[14.5px] leading-relaxed">
          <li>
            삼합(같은 편): <b>{t.best.map((b) => `${b}띠`).join(" · ")}</b>
          </li>
          <li>
            육합(짝꿍): <b>{t.harmony}띠</b>
          </li>
          <li>
            충(부딪침): <b>{t.clash}띠</b> — 부딪치는 만큼 끌리기도 한다냥
          </li>
        </ul>
      </section>
      <p className="mt-6 text-[12.5px] leading-relaxed text-muted">
        띠는 입춘(2월 4일 무렵)을 기준으로 바뀐다냥. 1월이나 2월 초에 태어났다면 앞 해의 띠일 수 있다냥. 띠 궁합은 사주 궁합의 한 조각일 뿐이고, 둘의
        진짜 궁합은 면담으로 풀어 준다냥.
      </p>
      <Link href="/tti" className="mt-4 block text-center text-[13.5px] text-peach underline underline-offset-4">
        12띠 전체 보기
      </Link>
    </SeoShell>
  );
}

/** 오늘의 띠 운세: changes with the day, so it's cached for an hour while the rest of the page stays static. */
async function TodayLine({ animal }: { animal: string }) {
  "use cache";
  cacheLife("hours");
  const today = ttiToday(animal);
  if (!today) return null;
  return (
    <section className="mt-5 rounded-2xl border border-violet/40 bg-violet/5 p-4">
      <h2 className="text-[16px] font-bold">
        🗓️ 오늘의 {animal}띠 운세 · {today.date} {today.ganji}
      </h2>
      <p className="mt-1 text-[26px] font-black text-peach">{today.score}점</p>
      <p className="mt-1 text-[14.5px] leading-relaxed">{today.line}</p>
    </section>
  );
}
