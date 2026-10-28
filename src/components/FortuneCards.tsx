import type { FortuneCard, SajuSummary } from "@/models/types";
import { Card, NyangSays, SajuChart, ScoreRing } from "./ReportCards";

/** The 감정 근거 table: the chart facts in the trade's own terms, on hanji with a seal. */
function BasisCard({ rows, note }: { rows: [string, string][]; note?: string }) {
  return (
    <div className="fade-up relative overflow-hidden rounded-2xl hanji p-5 text-[#2b1d16] shadow-[0_12px_40px_-16px_rgba(0,0,0,0.8)]">
      <p className="text-[11px] tracking-[0.35em] text-[#8a5a3a]">鑑 定 根 據</p>
      <p className="font-ritual mt-0.5 text-[17px]">감정 근거</p>
      <dl className="mt-3 divide-y divide-[#2b1d16]/15 border-y border-[#2b1d16]/25 text-[13.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[5.5rem_1fr] gap-2 py-2">
            <dt className="font-semibold text-[#8a5a3a]">{k}</dt>
            <dd className="font-medium leading-snug">{v}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-2 text-[11.5px] text-[#8a5a3a]">※ {note}</p>}
      <span className="seal absolute right-4 top-4" aria-hidden>
        鑑定
      </span>
    </div>
  );
}

/** 대운 bars: one column per 10 years, the current one lit. */
function TimelineCard({ title, items }: Extract<FortuneCard, { kind: "timeline" }>) {
  return (
    <Card>
      <p className="text-xs font-semibold text-muted">🌊 {title}</p>
      <div className="mt-4 flex h-40 items-end gap-1.5">
        {items.map((it) => (
          <div key={it.age} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className={`mb-1 text-[10px] font-bold ${it.current ? "text-peach" : "text-muted"}`}>{it.score}</span>
            <div
              className={`bar-rise w-full rounded-t-md ${it.current ? "bg-gradient-to-t from-pink to-peach shadow-[0_0_12px_var(--pink)]" : "bg-white/15"}`}
              style={{ height: `${Math.max(8, it.score)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {items.map((it) => (
          <div key={it.age} className="min-w-0 flex-1 text-center">
            <p className={`font-serif text-[13px] leading-[1.1] ${it.current ? "text-peach" : "text-ink/80"}`}>
              {it.hanja[0]}
              <br />
              {it.hanja[1]}
            </p>
            <p className={`mt-1 text-[9.5px] leading-tight ${it.current ? "font-bold text-peach" : "text-muted"}`}>{it.age.split("~")[0]}세</p>
          </div>
        ))}
      </div>
      {items.some((it) => it.current) && <p className="mt-3 text-center text-[11px] text-peach">● 빛나는 칸이 지금 네 대운이다냥</p>}
    </Card>
  );
}

export function FortuneCardView({ card, saju, name }: { card: FortuneCard; saju: SajuSummary | null; name: string }) {
  switch (card.kind) {
    case "chart":
      return saju ? (
        <Card>
          <p className="mb-3 text-xs font-semibold text-muted">🀄 {name}의 사주 원국</p>
          <SajuChart saju={saju} />
        </Card>
      ) : null;
    case "basis":
      return <BasisCard rows={card.rows} note={card.note} />;
    case "text":
      return (
        <Card className="border-pink/30">
          <p className="text-xs font-semibold text-pink">
            {card.icon} {card.title}
          </p>
          <div className="mt-3">
            <NyangSays text={card.body} />
          </div>
        </Card>
      );
    case "score":
      return (
        <Card className="text-center">
          <ScoreRing score={card.score} label={card.label} unit={card.label.includes("온도") ? "°" : card.label.includes("가능성") ? "%" : "점"} />
          <p className="font-ritual mt-4 text-[20px] leading-snug">
            <span className="text-gradient">{card.headline}</span>
          </p>
          {card.body && (
            <div className="mt-4 text-left">
              <NyangSays text={card.body} />
            </div>
          )}
        </Card>
      );
    case "timeline":
      return <TimelineCard {...card} />;
    case "keywords":
      return (
        <Card className="border-violet/40">
          <p className="text-xs font-semibold text-violet">🔑 {card.title}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {card.items.map((k, i) => (
              <span
                key={k}
                className="chip-pop rounded-full border border-peach/50 bg-peach/10 px-3.5 py-1.5 text-[15px] font-bold text-peach"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {k}
              </span>
            ))}
          </div>
          {card.body && (
            <div className="mt-4">
              <NyangSays text={card.body} />
            </div>
          )}
        </Card>
      );
  }
}

/** Head of the paid 감정서: what was read, when, how. */
export function DocumentHead({ title, saju, no }: { title: string; saju: SajuSummary | null; no: string }) {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  const rows: [string, string][] = [
    ["감정 번호", `第 ${no} 號`],
    ["감정 일자", `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`],
    ...(saju ? ([["원국", saju.pillars.map((p) => p.hanja).join(" ")]] as [string, string][]) : []),
    ["감정 방식", "만세력 · 절입(節入) 기준 월주 · 십성·용신·신살·대운 종합"],
  ];
  return (
    <div className="fade-up relative overflow-hidden rounded-2xl hanji p-5 text-[#2b1d16]">
      <p className="text-[11px] tracking-[0.5em] text-[#8a5a3a]">鑑 定 書</p>
      <p className="font-ritual mt-1 pr-16 text-[21px] leading-snug">{title}</p>
      <dl className="mt-3 space-y-1 text-[12.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="w-16 shrink-0 font-semibold text-[#8a5a3a]">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <span className="seal absolute right-4 top-4" aria-hidden>
        猫神
        <br />
        鑑定
      </span>
    </div>
  );
}
