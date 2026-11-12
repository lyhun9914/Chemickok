"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PRODUCTS } from "@/lib/config";
import { ADOPT_MAX, KIND_LABEL, RATINGS, RATING_LABEL, STATUS, SUGGEST_MAX, type FeedbackKind, type FeedbackStatus, type Rating } from "@/lib/feedback";
import type { Mode } from "@/models/types";
import { Note, PROVIDER, Section, call, ghost, input, small, useConfirm, when } from "./ui";

type Item = {
  id: number;
  kind: FeedbackKind;
  rating: Rating | null;
  tags: string[];
  body: string;
  mode: string | null;
  page: string | null;
  device: string | null;
  status: FeedbackStatus;
  memo: string;
  reply: string;
  adoptedAt: string | null;
  reward: number;
  createdAt: string;
  userId: string;
  nickname: string;
  provider: string;
};
type Data = { items: Item[]; adoptReward: number; mail: boolean };
type Filter = "todo" | "all" | "idea" | "sad" | "bug" | "praise" | "comments";

const PAGE: Record<string, string> = { home: "홈", result: "점괘 결과", my: "내 점괘함" };
const modeName = (m: string | null) => (m ? (PRODUCTS[m as Mode]?.name ?? m) : "");
const STATUS_ORDER: FeedbackStatus[] = ["new", "seen", "planned", "done", "closed"];
const pct = (n: number, all: number) => (all ? `${Math.round((n / all) * 100)}%` : "-");
/** what the 관리자 still has to look at */
export const isTodo = (i: Pick<Item, "kind" | "status">) => i.kind !== "rating" && (i.status === "new" || i.status === "seen");

/** 점괘 평가 by product: how many, the 😻 · 😺 · 😿 split and the reasons picked most. */
function RatingSummary({ items, days }: { items: Item[]; days: number }) {
  const rated = items.filter((i) => i.kind === "rating");
  const rows = useMemo(() => {
    const by = new Map<string, Item[]>();
    for (const r of rated) by.set(r.mode ?? "?", [...(by.get(r.mode ?? "?") ?? []), r]);
    return [...by.entries()]
      .map(([mode, list]) => {
        const tags = new Map<string, number>();
        for (const r of list) for (const t of r.tags) tags.set(t, (tags.get(t) ?? 0) + 1);
        return {
          mode,
          n: list.length,
          counts: RATINGS.map((x) => list.filter((r) => r.rating === x.id).length),
          tags: [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
        };
      })
      .sort((a, b) => b.n - a.n);
  }, [rated]);
  return (
    <Section title="⭐ 점괘 평가" sub={`유료 점괘 결과 맨 아래 '이 점괘 어땠냥?'에서 고른 것 · 최근 ${days}일`}>
      {!rows.length ? (
        <p className="py-2 text-center text-[13px] text-muted">아직 평가가 없어요.</p>
      ) : (
        <ul className="space-y-2">
          {[
            { mode: "전체", n: rated.length, counts: RATINGS.map((x) => rated.filter((r) => r.rating === x.id).length), tags: [] as [string, number][] },
            ...rows,
          ].map((r) => (
            <li key={r.mode} className="rounded-xl bg-black/25 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-bold">{r.mode === "전체" ? "전체" : modeName(r.mode)}</span>
                <span className="text-[12px] text-muted">{r.n}명</span>
              </div>
              <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-white/10">
                {r.counts.map((c, k) => (
                  <span key={k} style={{ width: pct(c, r.n) === "-" ? "0%" : pct(c, r.n) }} className={["bg-peach", "bg-violet", "bg-pink"][k]} />
                ))}
              </div>
              <p className="mt-1 text-[12.5px]">
                {RATINGS.map((x, k) => `${x.emoji} ${pct(r.counts[k], r.n)}`).join("  ·  ")}
              </p>
              {r.tags.length > 0 && <p className="mt-0.5 text-[12px] text-muted">많이 고른 이유: {r.tags.map(([t, c]) => `${t} ${c}`).join(", ")}</p>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** 채택 선물: how many 냥 a 채택된 건의 earns (0 = none). */
function RewardSetting({ value, onSaved }: { value: number; onSaved: (n: number) => void }) {
  const [v, setV] = useState(String(value));
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setV(String(value)), [value]);
  const save = async () => {
    setBusy(true);
    setNote(null);
    try {
      const r = await call<{ feedback: { adoptReward: number } }>("/api/admin/settings", { method: "POST", body: JSON.stringify({ key: "feedback", value: { adoptReward: Number(v) } }) });
      onSaved(r.feedback.adoptReward);
      setNote({ tone: "ok", text: `저장했어요. 이제 채택하면 ${r.feedback.adoptReward}냥을 선물해요.` });
    } catch (e) {
      setNote({ tone: "error", text: (e as Error).message });
    }
    setBusy(false);
  };
  return (
    <Section title="🎁 채택 선물" sub={`의견을 채택하면 그 회원에게 주는 냥이에요 (0~${ADOPT_MAX}냥, 0이면 선물 없이 채택만). 손님 화면의 '채택되면 n냥 선물' 문구도 같이 바뀌어요.`}>
      <div className="flex items-center gap-2">
        <input type="number" min={0} max={ADOPT_MAX} value={v} onChange={(e) => setV(e.target.value)} className={`${input} w-24`} aria-label="채택 선물 냥" />
        <span className="text-[14px]">냥</span>
        <button onClick={save} disabled={busy || v === String(value)} className="btn-primary ml-auto px-5 py-2.5 text-[14px]">
          저장
        </button>
      </div>
      {note && (
        <div className="mt-2">
          <Note tone={note.tone}>{note.text}</Note>
        </div>
      )}
    </Section>
  );
}

function FeedbackItem({ it, reward, onChanged, onOpenUser }: { it: Item; reward: number; onChanged: (patch: Partial<Item>) => void; onOpenUser?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(it.status);
  const [memo, setMemo] = useState(it.memo);
  const [reply, setReply] = useState(it.reply);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [ask, dialog] = useConfirm();
  const rating = it.kind === "rating";
  const adoptable = (it.kind === "idea" || it.kind === "sad" || it.kind === "bug") && !it.adoptedAt;
  const dirty = status !== it.status || memo !== it.memo || reply !== it.reply;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    // opening a new one = 확인함 (the member sees "냥신이 읽었다냥")
    if (next && !rating && it.status === "new") {
      await call("/api/admin/feedback", { method: "PATCH", body: JSON.stringify({ id: it.id, status: "seen" }) }).catch(() => null);
      setStatus("seen");
      onChanged({ status: "seen" });
    }
  };
  const save = async () => {
    setBusy(true);
    setNote(null);
    try {
      await call("/api/admin/feedback", { method: "PATCH", body: JSON.stringify({ id: it.id, memo, ...(rating ? {} : { status, reply }) }) });
      onChanged({ status, memo, reply });
      setNote({ tone: "ok", text: !rating && (reply !== it.reply || ["planned", "done", "closed"].includes(status)) && (reply || status !== it.status) ? "저장했어요. 회원의 내 점괘함에 알림(빨간 점)이 떠요." : "저장했어요." });
    } catch (e) {
      setNote({ tone: "error", text: (e as Error).message });
    }
    setBusy(false);
  };
  const adopt = async () => {
    const ok = await ask({
      title: "이 의견을 채택할까요?",
      rows: [
        ["회원", it.nickname],
        ["의견", it.body.length > 40 ? `${it.body.slice(0, 40)}…` : it.body],
        ["채택 선물", reward > 0 ? `${reward}냥` : "없음 (0냥 설정)"],
      ],
      message: "채택하면 회원의 내 점괘함에 '🎁 채택' 소식이 뜨고, 아직 '새 의견 · 확인함'이면 '반영 예정'으로 바뀌어요. 선물은 한 번만 들어가요.",
      confirm: reward > 0 ? `채택하고 ${reward}냥 선물` : "채택하기",
    });
    if (!ok) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await call<{ reward: number }>("/api/admin/feedback", { method: "POST", body: JSON.stringify({ id: it.id, action: "adopt" }) });
      const nextStatus = status === "new" || status === "seen" ? "planned" : status;
      setStatus(nextStatus);
      onChanged({ adoptedAt: new Date().toISOString(), reward: r.reward, status: nextStatus });
      setNote({ tone: "ok", text: r.reward ? `채택했어요. ${it.nickname}님 복주머니에 ${r.reward}냥을 넣었어요.` : "채택했어요." });
    } catch (e) {
      setNote({ tone: "error", text: (e as Error).message });
    }
    setBusy(false);
  };

  return (
    <li className="py-3">
      <button onClick={toggle} className="w-full text-left">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11.5px] font-bold">{rating && it.rating ? RATING_LABEL[it.rating] : KIND_LABEL[it.kind]}</span>
          {!rating && (
            <span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-bold ${it.status === "new" ? "bg-pink text-white" : "bg-white/5 text-muted"}`}>{STATUS[it.status].admin}</span>
          )}
          {it.adoptedAt && <span className="rounded-md bg-peach/20 px-1.5 py-0.5 text-[11.5px] font-bold text-peach">🎁 채택{it.reward ? ` ${it.reward}냥` : ""}</span>}
          {it.reply && <span className="rounded-md bg-violet/25 px-1.5 py-0.5 text-[11.5px]">답장함</span>}
        </span>
        <span className={`mt-1.5 block whitespace-pre-wrap break-words text-[14px] leading-relaxed ${open ? "" : "line-clamp-2"}`}>
          {it.body || (rating ? (it.tags.length ? it.tags.join(", ") : "(이유·한마디 없음)") : "")}
        </span>
        {rating && it.body && it.tags.length > 0 && <span className="mt-0.5 block text-[12px] text-muted">고른 이유: {it.tags.join(", ")}</span>}
        <span className="mt-1 block text-[12px] text-muted">
          {it.nickname}
          {it.provider ? ` (${PROVIDER[it.provider] ?? it.provider})` : ""} · {when(it.createdAt)}
          {it.mode ? ` · ${modeName(it.mode)}` : ""}
          {it.page ? ` · ${PAGE[it.page] ?? it.page}에서` : ""}
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-2.5 rounded-xl bg-black/25 p-3">
          {it.device && <p className="text-[12px] text-muted">기기: {it.device}</p>}
          {!rating && (
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-muted">상태</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as FeedbackStatus)} className={small}>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS[s].admin} — 회원에게: {STATUS[s].member}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!rating && (
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-muted">냥신의 답장 (회원의 내 점괘함에 보여요)</span>
              <textarea value={reply} onChange={(e) => setReply(e.target.value.slice(0, SUGGEST_MAX))} rows={3} placeholder="예: 좋은 의견 고맙다냥! 다음 달에 넣어 보겠다냥 🐾" className={`${small} resize-none`} />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-[12.5px] text-muted">관리자 메모 (나만 보여요)</span>
            <input value={memo} onChange={(e) => setMemo(e.target.value.slice(0, 500))} placeholder="예: 12월 업데이트 때 반영" className={small} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={save} disabled={busy || !dirty} className="btn-primary px-5 py-2 text-[13.5px]">
              저장
            </button>
            {adoptable && (
              <button onClick={adopt} disabled={busy} className="rounded-xl border border-peach/60 px-3 py-2 text-[13.5px] font-semibold text-peach disabled:opacity-50">
                🎁 채택하고 {reward > 0 ? `${reward}냥 선물` : "알리기"}
              </button>
            )}
            {onOpenUser && (
              <button onClick={() => onOpenUser(it.userId)} className={ghost}>
                👥 회원 보기
              </button>
            )}
          </div>
          {it.adoptedAt && <p className="text-[12.5px] text-peach">🎁 {when(it.adoptedAt)}에 채택{it.reward ? ` · ${it.reward}냥 선물함` : ""}</p>}
          {note && <Note tone={note.tone}>{note.text}</Note>}
        </div>
      )}
      {dialog}
    </li>
  );
}

/** 📮 의견: 건의함 (상태 · 답장 · 메모 · 채택 선물) and 점괘 평가, newest first. */
export function FeedbackTab({ onCount, onOpenUser }: { onCount?: (n: number) => void; onOpenUser?: (id: string) => void }) {
  const [days, setDays] = useState(60);
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState<Filter>("todo");
  const [error, setError] = useState<string | null>(null);
  /** worked on in this visit: stays in its list (e.g. 할 일 after 채택 → 반영 예정) until the list is left */
  const [touched, setTouched] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      const d = await call<Data>(`/api/admin/feedback?days=${days}`);
      setData(d);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [days]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (data) onCount?.(data.items.filter((i) => i.kind !== "rating" && i.status === "new").length);
  }, [data, onCount]);

  if (error) return <Note tone="error">{error}</Note>;
  if (!data) return <p className="py-6 text-center text-muted">불러오는 중…</p>;
  const ideas = data.items.filter((i) => i.kind !== "rating");
  const comments = data.items.filter((i) => i.kind === "rating" && (i.body || i.tags.length));
  const FILTERS: [Filter, string, Item[]][] = [
    ["todo", "할 일", ideas.filter((i) => isTodo(i) || touched.has(i.id))],
    ["all", "건의 전체", ideas],
    ["idea", "💡", ideas.filter((i) => i.kind === "idea")],
    ["sad", "😿", ideas.filter((i) => i.kind === "sad")],
    ["bug", "🐞", ideas.filter((i) => i.kind === "bug")],
    ["praise", "💌", ideas.filter((i) => i.kind === "praise")],
    ["comments", "⭐ 평가 이유·한마디", comments],
  ];
  const list = FILTERS.find(([k]) => k === filter)![2];
  const patch = (id: number, p: Partial<Item>) => {
    setTouched((t) => (t.has(id) ? t : new Set(t).add(id)));
    setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === id ? { ...x, ...p } : x)) } : d));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[18px] font-bold">📮 의견</h1>
        <div className="flex gap-1.5">
          {[30, 60, 180].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`rounded-xl border px-3 py-1.5 text-[13px] font-semibold ${days === d ? "border-peach text-peach" : "border-line text-muted"}`}>
              {d}일
            </button>
          ))}
        </div>
      </div>
      <Note>
        회원이 홈 화면 맨 아래 · 점괘 결과 · 내 점괘함의 &lsquo;📮 냥신 건의함&rsquo;으로 보낸 의견이에요. 열어 보면 &lsquo;확인함&rsquo;으로 바뀌고, 답장을 쓰거나 &lsquo;반영 예정 · 반영됨 · 보류&rsquo;로 바꾸면 회원에게 알림이 가요.
        {data.mail ? " 🐞 오류 신고는 관리자 메일로도 바로 와요." : ""}
      </Note>

      <Section title="📮 건의함" sub={`최근 ${days}일 · 건의 ${ideas.length}건`}>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {FILTERS.map(([k, label, l]) => (
            <button
              key={k}
              onClick={() => {
                setFilter(k);
                setTouched(new Set());
              }}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${filter === k ? "border-peach bg-peach/15 text-peach" : "border-line text-muted"}`}
            >
              {label} {l.length}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-muted">{filter === "todo" ? "볼 의견이 없어요 🐾" : "없어요."}</p>
        ) : (
          <ul className="mt-1 divide-y divide-line">
            {list.map((it) => (
              <FeedbackItem key={it.id} it={it} reward={data.adoptReward} onChanged={(p) => patch(it.id, p)} onOpenUser={onOpenUser} />
            ))}
          </ul>
        )}
      </Section>

      <RewardSetting value={data.adoptReward} onSaved={(n) => setData((d) => (d ? { ...d, adoptReward: n } : d))} />
      <RatingSummary items={data.items} days={days} />
    </div>
  );
}
