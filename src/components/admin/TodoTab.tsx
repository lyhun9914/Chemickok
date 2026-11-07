"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_TODOS, daysLeft, isDue, type TodoDef, type TodoDone } from "@/lib/adminTodo";
import { Note, Section, call, ghost } from "./ui";

const EVERY: Record<number, string> = { 1: "매일", 7: "매주", 14: "2주마다", 30: "매달", 90: "석 달마다" };
const day = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" });

/** How many 할 일 are waiting, for the tab badge and the home alert. */
export const dueCount = (done: TodoDone) => ADMIN_TODOS.filter((t) => isDue(t, done[t.id])).length;

/** The 할 일 state, shared by the tab, the badge and the 백업 card. */
export function useTodo() {
  const [done, setDone] = useState<TodoDone | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    () =>
      call<{ done: TodoDone }>("/api/admin/todo")
        .then((r) => setDone(r.done))
        .catch((e: Error) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  const mark = async (id: string, undo = false) => {
    const r = await call<{ done: TodoDone }>("/api/admin/todo", { method: "POST", body: JSON.stringify({ id, undo }) });
    setDone(r.done);
  };
  return { done, error, load, mark };
}

function status(t: TodoDef, last: string | undefined): { text: string; due: boolean } {
  const left = daysLeft(t, last);
  if (left === null) return { text: "아직 한 번도 안 했어요", due: true };
  if (left < 0) return { text: `${-left}일 지났어요`, due: true };
  if (left === 0) return { text: "오늘 할 차례예요", due: true };
  return { text: `${left}일 뒤에 다시`, due: false };
}

/**
 * ✅ 할 일: the recurring chores, waiting ones first. Each says how often, when it was last done, how to do it, and
 * takes you there; 완료 records it for every device. The backup marks itself when the file is downloaded.
 */
export function TodoTab({ go, onCount }: { go: (tab: string) => void; onCount: (n: number) => void }) {
  const { done, error, load, mark } = useTodo();
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    if (done) onCount(dueCount(done));
  }, [done, onCount]);
  if (error) return <Note tone="error">{error}</Note>;
  if (!done) return <p className="py-6 text-center text-muted">불러오는 중…</p>;

  const rows = ADMIN_TODOS.map((t) => ({ t, s: status(t, done[t.id]), left: daysLeft(t, done[t.id]) ?? -999 })).sort((a, b) => a.left - b.left);
  const waiting = rows.filter((r) => r.s.due).length;
  const press = async (id: string, undo = false) => {
    setBusy(id);
    await mark(id, undo).catch(() => null);
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <Note tone={waiting ? "warn" : "info"}>{waiting ? `지금 할 일이 ${waiting}개 있어요. 끝내면 ‘완료’를 눌러 주세요.` : "지금 할 일은 다 끝났어요 🐾 다음 차례가 오면 여기와 홈에 알려 줘요."}</Note>
      <Section title="✅ 할 일" sub="주기적으로 챙길 일이에요. 완료를 누른 날이 기록되고, 다음 차례가 되면 다시 올라와요. 휴대폰 앱과 컴퓨터에서 똑같이 보여요.">
        <ul className="divide-y divide-line">
          {rows.map(({ t, s }) => {
            const last = done[t.id];
            const today = last && daysLeft(t, last) === t.every;
            return (
              <li key={t.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-bold">{t.label}</p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {EVERY[t.every] ?? `${t.every}일마다`} · {last ? `마지막 ${day(last)}` : "기록 없음"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${s.due ? "bg-pink/15 text-pink" : "bg-white/5 text-muted"}`}>{s.text}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{t.how}</p>
                <div className="mt-2 flex gap-2">
                  {t.href ? (
                    <a href={t.href} download onClick={() => setTimeout(load, 2500)} className={ghost}>
                      내려받기
                    </a>
                  ) : t.link ? (
                    <a href={t.link} target="_blank" rel="noreferrer" className={ghost}>
                      메일함 열기 ↗
                    </a>
                  ) : t.tab ? (
                    <button onClick={() => go(t.tab!)} className={ghost}>
                      하러 가기 →
                    </button>
                  ) : null}
                  {today ? (
                    <button onClick={() => press(t.id, true)} disabled={busy === t.id} className={`${ghost} text-muted`}>
                      ✓ 오늘 완료함 · 되돌리기
                    </button>
                  ) : (
                    <button onClick={() => press(t.id)} disabled={busy === t.id} className="btn-primary px-4 py-1.5 text-[13px]">
                      {busy === t.id ? "기록 중…" : "완료"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
