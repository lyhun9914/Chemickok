"use client";

import { useState } from "react";
import type { FortuneCard, SajuSummary } from "@/models/types";
import { Card, NyangSays, SajuChart, ScoreRing } from "./ReportCards";

/** Plain words for the trade's terms — tap a row in 감정 근거 to see one. */
const GLOSSARY: Record<string, string> = {
  원국: "태어난 해·달·날·시의 네 기둥, 여덟 글자다냥. 모든 풀이의 뿌리다냥.",
  일간: "태어난 날의 천간이다냥. 사주에서 '나' 자신을 뜻한다냥.",
  오행: "목·화·토·금·수 다섯 기운이다냥. 많고 적음으로 기질과 약한 고리를 본다냥.",
  "신강·신약": "내 기운(일간)이 센지 약한지다냥. 세면 덜어 주고, 약하면 채워 주는 기운이 좋다냥.",
  십성: "일간을 기준으로 다른 글자와의 관계를 열 가지로 나눈 거다냥. 돈·일·사람·공부 운이 여기서 나온다냥.",
  용신: "나를 살리는 기운이다냥. 이 기운이 들어오는 해·달이 좋은 때고, 행운의 색·방향도 여기서 정한다냥.",
  신살: "원국에 숨은 별이다냥. 도화(끌림)·역마(이동)·화개(고독·예술)·홍염(숨은 매력)·천을귀인(도움) 같은 것이다냥.",
  대운: "10년마다 바뀌는 큰 운의 흐름이다냥. 대운수는 첫 대운이 시작되는 나이다냥.",
  세운: "그해의 간지가 가져오는 운이다냥. 원국과 어떻게 맞물리는지로 좋고 나쁨을 본다냥.",
  일지와: "새해 지지가 태어난 날의 지지(일지)와 합(合)이면 붙고, 충(沖)이면 흔들린다냥.",
  삼재: "띠마다 12년에 3년씩 드는 조심할 시기다냥. 들삼재·눌삼재·날삼재로 나뉜다냥.",
  "그해 대운": "새해가 올라탄 10년짜리 큰 흐름이다냥.",
  "배우자 자리": "태어난 날의 지지(일지)다냥. 배우자와 결혼 생활을 본다냥.",
  "배우자 별": "남자는 재성, 여자는 관성이 배우자를 뜻하는 별이다냥.",
};

/** The 감정 근거 table: the chart facts in the trade's own terms, on hanji with a seal. */
function BasisCard({ rows, note }: { rows: [string, string][]; note?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="fade-up relative overflow-hidden rounded-2xl hanji p-5 text-[#2b1d16] shadow-[0_12px_40px_-16px_rgba(0,0,0,0.8)]">
      <p className="text-[12px] tracking-[0.35em] text-[#8a5a3a]">鑑 定 根 據</p>
      <p className="font-ritual mt-0.5 text-[17px]">감정 근거</p>
      <dl className="mt-3 divide-y divide-[#2b1d16]/15 border-y border-[#2b1d16]/25 text-[13.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="py-2">
            <div className="grid grid-cols-[5.5rem_1fr] gap-2">
              <dt className="font-semibold text-[#8a5a3a]">
                {GLOSSARY[k] ? (
                  <button onClick={() => setOpen(open === k ? null : k)} className="text-left underline decoration-dotted underline-offset-4" aria-expanded={open === k}>
                    {k} <span className="text-[11px]">ⓘ</span>
                  </button>
                ) : (
                  k
                )}
              </dt>
              <dd className="font-medium leading-snug">{v}</dd>
            </div>
            {open === k && <p className="fade-up mt-1.5 rounded-md bg-[#2b1d16]/[0.07] px-2.5 py-1.5 text-[12.5px] leading-relaxed text-[#5a4130]">{GLOSSARY[k]}</p>}
          </div>
        ))}
      </dl>
      {note && <p className="mt-2 text-[12.5px] text-[#8a5a3a]">※ {note}</p>}
      <p className="mt-2 text-[11.5px] text-[#8a5a3a]">ⓘ 표시된 말을 누르면 뜻을 알려 준다냥.</p>
      <span className="seal absolute right-4 top-4" aria-hidden>
        鑑定
      </span>
    </div>
  );
}

/** 대운 bars: one column per 10 years, the current one lit. */
function TimelineCard({ title, items, unit = "세", icon = "🌊", note = "● 빛나는 칸이 지금 네 대운이다냥" }: Extract<FortuneCard, { kind: "timeline" }>) {
  const gap = items.length > 9 ? "gap-1" : "gap-1.5"; // 12 months need the room
  // Months sit close together (a year's months share its 세운), so their bars use the year's own range to show the shape.
  const lo = Math.min(...items.map((it) => it.score));
  const hi = Math.max(...items.map((it) => it.score));
  const height = (n: number) => (items.length > 9 && hi > lo ? 28 + ((n - lo) / (hi - lo)) * 68 : Math.max(8, n));
  return (
    <Card>
      <p className="text-xs font-semibold text-muted">
        {icon} {title}
      </p>
      <div className={`mt-4 flex h-40 items-end ${gap}`}>
        {items.map((it) => (
          <div key={it.age} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className={`mb-1 text-[11px] font-bold ${it.current ? "text-peach" : "text-muted"}`}>{it.score}</span>
            <div
              className={`bar-rise w-full rounded-t-md ${it.current ? "bg-gradient-to-t from-pink to-peach shadow-[0_0_12px_var(--pink)]" : "bg-white/15"}`}
              style={{ height: `${height(it.score)}%` }}
            />
          </div>
        ))}
      </div>
      <div className={`mt-1.5 flex ${gap}`}>
        {items.map((it) => (
          <div key={it.age} className="min-w-0 flex-1 text-center">
            <p className={`font-serif text-[13px] leading-[1.1] ${it.current ? "text-peach" : "text-ink/80"}`}>
              {it.hanja[0]}
              <br />
              {it.hanja[1]}
            </p>
            <p className={`mt-1 text-[10.5px] leading-tight ${it.current ? "font-bold text-peach" : "text-muted"}`}>
              {it.age.split("~")[0]}
              {unit}
            </p>
          </div>
        ))}
      </div>
      {items.some((it) => it.current) && <p className="mt-3 text-center text-[12px] text-peach">{note}</p>}
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
      <p className="text-[12px] tracking-[0.5em] text-[#8a5a3a]">鑑 定 書</p>
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
