"use client";

import { useEffect, useState } from "react";
import { isFortune, productOf } from "@/lib/config";
import { FORTUNE_INTERVIEW } from "@/lib/fortuneQuestions";
import { fill, partnerInterview, selfInterview } from "@/lib/interview";
import type { FortuneMode, Mode, RelationshipStatus } from "@/models/types";

type Funnel = {
  visits: number;
  started: number;
  firstQ: number;
  half: number;
  allQ: number;
  result: number;
  paysheet: number;
  paid: number;
  drop: Record<string, number>;
  products: { product: string; started: number; result: number; paid: number }[];
  statuses: { status: string; started: number; result: number; paid: number }[];
  games: { product: string; started: number }[];
  sources: { source: string; n: number }[];
  devices: { device: string; n: number }[];
  days: { day: string; visits: number; started: number; paid: number }[];
};

const PRODUCTS: (Mode | "")[] = ["", "couple", "solo", "newyear", "saju", "daeun", "reunion", "spouse"];
const STATUS: Record<RelationshipStatus, string> = { crush: "짝사랑·썸", dating: "연애 중", slump: "권태기", breakup: "이별 후" };
const GAME: Record<string, string> = {
  today: "오늘의 운세",
  daily: "오늘의 연애운",
  tarot: "오늘의 타로",
  zodiac: "띠별 운세",
  name: "이름 궁합",
  ilju: "일주 고양이 도감",
  contact: "할까? 말까?",
  exam: "합격 부적",
};
const DEVICE: Record<string, string> = { mobile: "폰 브라우저", pc: "PC", "kakao-app": "카톡 안", "in-app": "인스타·네이버 등 앱 안" };

const productName = (p: string) => (p === "love" ? "상품 고르는 중" : p in GAME ? GAME[p] : (productOf(p as Mode)?.name ?? p));
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** The questions of a product in the order they're asked (궁합: about me, then about them). */
function questionsOf(product: string, status: RelationshipStatus): string[] {
  const qs = isFortune(product as Mode)
    ? FORTUNE_INTERVIEW[product as FortuneMode]
    : product === "couple"
      ? [...selfInterview("couple", status), ...partnerInterview(status)]
      : selfInterview("solo");
  return qs.map((q) => fill(q.short, "그 사람"));
}

/** One horizontal bar: the value as a share of `max`, with its number beside it. */
function Bar({ label, value, max, note, title }: { label: string; value: number; max: number; note?: string; title?: string }) {
  return (
    <li className="grid grid-cols-[7.5rem_1fr] items-center gap-2 py-1 text-[13px]" title={title ?? `${label}: ${value.toLocaleString("ko-KR")}`}>
      <span className="truncate text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="h-3 rounded-r-[4px] bg-peach" style={{ width: `${Math.max(value ? 2 : 0, (value / Math.max(max, 1)) * 100)}%`, maxWidth: "70%" }} />
        <span className="shrink-0 font-semibold">{value.toLocaleString("ko-KR")}</span>
        {note && <span className="shrink-0 text-[11.5px] text-muted">{note}</span>}
      </span>
    </li>
  );
}

/** 이용 흐름: where people come from, how far they get, and which question they stop at. */
export function FunnelPanel() {
  const [days, setDays] = useState(7);
  const [product, setProduct] = useState<Mode | "">("");
  const [status, setStatus] = useState<RelationshipStatus | "">("");
  const [data, setData] = useState<Funnel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const q = new URLSearchParams({ days: String(days), ...(product ? { product } : {}), ...(product === "couple" && status ? { status } : {}) });
    fetch(`/api/admin/funnel?${q}`, { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? "불러오지 못했어요");
        if (live) setData(b.funnel);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [days, product, status]);

  const btn = (on: boolean) => `rounded-xl border px-3 py-1.5 text-[13px] font-semibold ${on ? "border-peach text-peach" : "border-line text-muted"}`;
  const select = "rounded-xl border border-line bg-black/30 px-2 py-1.5 text-[13px] outline-none";

  const steps: [string, number, string][] = data
    ? [
        ["면담 시작", data.started, "첫 화면에서 상품을 눌러 면담에 들어온 수"],
        ["첫 질문 답함", data.firstQ, "이름·생일 같은 기본 정보를 넘기고 첫 질문에 답한 수"],
        ["질문 절반", data.half, "질문을 절반 넘게 답한 수"],
        ["질문 끝까지", data.allQ, "마지막 질문까지 답한 수"],
        ["결과 확인", data.result, "무료 결과 화면을 본 수"],
        ["결제창 열람", data.paysheet, "전체 풀이 결제창을 연 수"],
        ["결제 완료", data.paid, "전체 풀이를 연 수 (토스 결제·냥 사용)"],
      ]
    : [];
  // the step that loses the biggest share of the people who reached the one before it
  const worst = steps.slice(1).reduce((w, s, i) => {
    const prev = steps[i][1];
    const lost = prev ? 1 - s[1] / prev : 0;
    return prev >= 3 && lost > w.lost ? { i: i + 1, lost } : w;
  }, { i: -1, lost: 0 });

  const st = (status || "dating") as RelationshipStatus;
  const qs = product ? questionsOf(product, st) : [];
  const drops = data
    ? Object.entries(data.drop)
        .map(([k, n]) => ({ at: Number(k), n }))
        .filter((d) => d.n > 0)
        .sort((a, b) => b.n - a.n)
        .slice(0, 6)
    : [];
  const dropLabel = (at: number) =>
    at === 0 ? "기본 정보 입력 중 (첫 질문 전)" : at >= qs.length ? "질문 다 하고 결과 보기 전" : `${at + 1}번째 질문: ${qs[at] ?? ""}`;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-[16px] font-bold">📈 이용 흐름</h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">사람들이 어디서 와서, 어디까지 하고, 어디서 그만두는지예요. 이름·생일·답 같은 개인 정보는 모으지 않아요.</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {[1, 7, 30].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={btn(days === d)}>
            {d === 1 ? "오늘" : `${d}일`}
          </button>
        ))}
        <select value={product} onChange={(e) => setProduct(e.target.value as Mode | "")} className={select} aria-label="상품">
          {PRODUCTS.map((p) => (
            <option key={p} value={p}>
              {p ? productName(p) : "전체 상품"}
            </option>
          ))}
        </select>
        {product === "couple" && (
          <select value={status} onChange={(e) => setStatus(e.target.value as RelationshipStatus | "")} className={select} aria-label="상황">
            <option value="">모든 상황</option>
            {(Object.keys(STATUS) as RelationshipStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS[s]}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="mt-3 text-[13px] text-pink">{error}</p>}
      {!data ? (
        <p className="py-6 text-center text-[13px] text-muted">불러오는 중…</p>
      ) : (
        <div className="mt-4 space-y-5">
          <div>
            <p className="text-[13px]">
              방문 <b>{data.visits.toLocaleString("ko-KR")}</b> · 그중 면담 시작 <b>{pct(data.started, data.visits)}%</b> · 시작한 사람 중 결제{" "}
              <b>{pct(data.paid, data.started)}%</b>
            </p>
            <ul className="mt-2">
              {steps.map(([label, n, title], i) => (
                <Bar
                  key={label}
                  label={label}
                  value={n}
                  max={steps[0][1]}
                  title={title}
                  note={i === 0 ? undefined : `이전의 ${pct(n, steps[i - 1][1])}%${i === worst.i ? " ← 여기서 제일 많이 떠나요" : ""}`}
                />
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-bold">질문별 이탈 (결과까지 안 간 면담이 멈춘 곳)</p>
            {!product ? (
              <p className="mt-1 text-[12.5px] text-muted">위에서 상품을 고르면 몇 번째 질문에서 그만두는지 보여요.</p>
            ) : drops.length === 0 ? (
              <p className="mt-1 text-[12.5px] text-muted">아직 중간에 멈춘 면담이 없어요.</p>
            ) : (
              <ul className="mt-1 space-y-1.5">
                {drops.map((d) => (
                  <li key={d.at} className="text-[13px]" title={`${d.n}명이 여기서 멈췄어요`}>
                    <div className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">{dropLabel(d.at)}</span>
                      <span className="shrink-0 font-semibold">{d.n}명</span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-r-[4px] bg-peach/80" style={{ width: `${(d.n / drops[0].n) * 100}%` }} />
                  </li>
                ))}
              </ul>
            )}
            {product === "couple" && !status && <p className="mt-1 text-[11.5px] text-muted">궁합은 상황마다 질문이 달라요. 상황을 고르면 질문 이름이 정확해져요 (지금은 연애 중 기준).</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[13px] font-bold">상품별</p>
              <ul className="mt-1 text-[13px]">
                {data.products.map((p) => (
                  <li key={p.product} className="flex justify-between gap-2 py-0.5" title={`결과 ${p.result} · 결제 ${p.paid}`}>
                    <span className="truncate">{productName(p.product)}</span>
                    <span className="shrink-0 text-muted">
                      시작 {p.started} · 결과 {p.result} · 결제 <b className="text-ink">{p.paid}</b> ({pct(p.paid, p.started)}%)
                    </span>
                  </li>
                ))}
                {data.products.length === 0 && <li className="text-muted">아직 없어요.</li>}
              </ul>
            </div>
            <div>
              <p className="text-[13px] font-bold">궁합 상황별</p>
              <ul className="mt-1 text-[13px]">
                {data.statuses.map((s) => (
                  <li key={s.status} className="flex justify-between gap-2 py-0.5">
                    <span>{STATUS[s.status as RelationshipStatus] ?? s.status}</span>
                    <span className="shrink-0 text-muted">
                      시작 {s.started} · 결과 {s.result} · 결제 <b className="text-ink">{s.paid}</b>
                    </span>
                  </li>
                ))}
                {data.statuses.length === 0 && <li className="text-muted">아직 없어요.</li>}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[13px] font-bold">어디서 왔나</p>
              <ul className="mt-1">
                {data.sources.map((s) => (
                  <Bar key={s.source} label={s.source} value={s.n} max={data.sources[0]?.n ?? 1} note={`${pct(s.n, data.visits)}%`} />
                ))}
                {data.sources.length === 0 && <li className="text-[13px] text-muted">아직 없어요.</li>}
              </ul>
              <p className="mt-2 text-[12px] text-muted">
                {data.devices.map((d) => `${DEVICE[d.device] ?? d.device} ${pct(d.n, data.visits)}%`).join(" · ")}
              </p>
            </div>
            <div>
              <p className="text-[13px] font-bold">미니게임</p>
              <ul className="mt-1">
                {data.games.map((g) => (
                  <Bar key={g.product} label={GAME[g.product.slice(5)] ?? g.product} value={g.started} max={data.games[0]?.started ?? 1} />
                ))}
                {data.games.length === 0 && <li className="text-[13px] text-muted">아직 없어요.</li>}
              </ul>
            </div>
          </div>

          {data.days.length > 1 && (
            <div>
              <p className="text-[13px] font-bold">날짜별</p>
              {(
                [
                  ["방문", "visits"],
                  ["면담 시작", "started"],
                  ["결제", "paid"],
                ] as const
              ).map(([label, key]) => {
                const max = Math.max(1, ...data.days.map((d) => d[key]));
                return (
                  <div key={key} className="mt-2 grid grid-cols-[4.5rem_1fr] items-end gap-2">
                    <span className="text-[12px] text-muted">{label}</span>
                    <div className="flex h-10 items-end gap-[2px]">
                      {data.days.map((d) => (
                        <span
                          key={d.day}
                          title={`${d.day.slice(5).replace("-", "/")} ${label} ${d[key]}`}
                          className="flex-1 rounded-t-[3px] bg-peach/85"
                          style={{ height: `${Math.max(d[key] ? 6 : 2, (d[key] / max) * 100)}%`, opacity: d[key] ? 1 : 0.25 }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="mt-1 flex justify-between pl-[5rem] text-[11px] text-muted">
                <span>{data.days[0].day.slice(5).replace("-", "/")}</span>
                <span>{data.days[data.days.length - 1].day.slice(5).replace("-", "/")}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
