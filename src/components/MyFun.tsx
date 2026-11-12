"use client";

import { useCallback, useEffect, useState } from "react";
import { josa } from "@/lib/josa";
import { lifeLine, mergeRows } from "@/lib/when";
import { mineApi, type Mine, type MineQuiz, type MineRoom } from "@/services/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { leaveRoom, localRoomRows, roomLink } from "./ChemRoom";
import { deleteQuiz, localQuizRows, quizLink } from "./FriendQuiz";
import { MiniGameSheet, type MiniGame } from "./MiniGames";

type Ask = { kind: "quiz" | "room"; id: string };

/**
 * 내 점괘함 · 친구랑 논 기록: the 고양이 도감, the quizzes this member made and the 케미표 they made or joined — open the
 * results, copy the link, delete / leave — on any device. Guest-made ones on this browser join the account here too.
 */
export function FunSection() {
  const setScreen = useAppStore((s) => s.setScreen);
  const [m, setM] = useState<Mine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ game: MiniGame; id?: string | null } | null>(null);
  const [note, setNote] = useState<{ id: string; text: string } | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [busy, setBusy] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // this browser's first: opening them logged in joins guest-made ones to the account
      const [lq, lr] = await Promise.all([localQuizRows().catch(() => []), localRoomRows().catch(() => [])]);
      const mine = await mineApi.get();
      setM({ ...mine, quizzes: mergeRows(mine.quizzes, lq), rooms: mergeRows(mine.rooms, lr) });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오지 못했다냥.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const copy = (id: string, url: string) =>
    navigator.clipboard
      ?.writeText(url)
      .then(() => setNote({ id, text: "링크를 복사했다냥 📋" }))
      .catch(() => setNote({ id, text: url }));
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setAskError(null);
    try {
      await fn();
      setAsk(null);
      await load();
    } catch (e) {
      setAskError(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };

  const confirmBox = (text: string, buttons: { label: string; run: () => Promise<unknown>; strong?: boolean }[]) => (
    <div className="mt-2 rounded-xl border border-pink/40 bg-pink/[0.06] p-3 text-center">
      <p className="text-[12.5px] font-semibold leading-relaxed">{text}</p>
      {askError && <p className="mt-1 text-[12px] text-pink">{askError}</p>}
      <div className={`mt-2 grid gap-2 ${buttons.length > 1 ? "grid-cols-3" : "grid-cols-2"}`}>
        <button onClick={() => setAsk(null)} disabled={busy} className="rounded-lg border border-line py-2 text-[12.5px]">
          그냥 둘래
        </button>
        {buttons.map((b) => (
          <button
            key={b.label}
            onClick={() => act(b.run)}
            disabled={busy}
            className={`rounded-lg py-2 text-[12.5px] font-bold ${b.strong ? "bg-pink/80 text-white" : "border border-pink/50"}`}
          >
            {busy ? "…" : b.label}
          </button>
        ))}
      </div>
    </div>
  );

  const actions = (id: string, open: () => void, url: string, end: { label: string; onClick: () => void }) => (
    <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[12.5px]">
      <button onClick={open} className="rounded-lg bg-violet/25 py-2 font-bold">
        결과 보기
      </button>
      <button onClick={() => copy(id, url)} className="rounded-lg border border-line py-2 font-semibold">
        링크 복사
      </button>
      <button onClick={end.onClick} className="rounded-lg border border-line py-2 text-muted">
        {end.label}
      </button>
    </div>
  );

  const quizRow = (q: MineQuiz) => (
    <li key={q.id} className="py-3">
      <button onClick={() => setSheet({ game: "quiz", id: q.id })} className="block w-full text-left">
        <span className="block text-[14px] font-semibold">{q.owner}의 퀴즈</span>
        <span className="mt-0.5 block text-[12.5px] text-ink/85">
          {q.plays ? `🟢 ${q.plays}명 참여 · 1등 ${q.leader?.name} ${q.leader?.score}/${q.total}` : "⏳ 아직 푼 친구 없음"}
        </span>
        <span className="mt-0.5 block text-[12px] text-muted">{lifeLine(q.createdAt, q.expiresAt)}</span>
      </button>
      {actions(q.id, () => setSheet({ game: "quiz", id: q.id }), quizLink(q.id), { label: "지우기", onClick: () => setAsk({ kind: "quiz", id: q.id }) })}
      {note?.id === q.id && <p className="mt-1.5 break-all text-center text-[12px] text-peach">{note.text}</p>}
      {ask?.kind === "quiz" && ask.id === q.id && confirmBox("이 퀴즈를 지울까냥? 순위표도 같이 사라지고 링크도 안 열린다냥.", [{ label: "지우기", strong: true, run: () => deleteQuiz(q.id) }])}
    </li>
  );

  const roomRow = (r: MineRoom) => (
    <li key={r.id} className="py-3">
      <button onClick={() => setSheet({ game: "room", id: r.id })} className="block w-full text-left">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold">{r.title}</span>
          {r.creator && <span className="shrink-0 rounded-sm bg-violet/30 px-1.5 py-0.5 text-[10.5px] font-bold">방장</span>}
        </span>
        <span className="mt-0.5 block break-keep text-[12.5px] text-ink/85">
          {r.count < 2 ? `⏳ ${r.count}명 · 친구 기다리는 중` : `🟢 ${r.count}명${r.best ? ` · 최고의 짝꿍 ${r.best.a} & ${r.best.b} ${r.best.score}점` : ""}`}
        </span>
        <span className="mt-0.5 block text-[12px] text-muted">
          {r.me ? `${josa(r.me, "으로/로")} 들어감 · ` : ""}
          {lifeLine(r.createdAt, r.expiresAt)}
        </span>
      </button>
      {actions(r.id, () => setSheet({ game: "room", id: r.id }), roomLink(r.id), { label: r.creator ? "지우기" : "나 빼기", onClick: () => setAsk({ kind: "room", id: r.id }) })}
      {note?.id === r.id && <p className="mt-1.5 break-all text-center text-[12px] text-peach">{note.text}</p>}
      {ask?.kind === "room" &&
        ask.id === r.id &&
        (r.creator
          ? confirmBox("방장이다냥. 나만 빠지면 방은 남고, 통째로 지우면 모두의 이름 · 생일과 링크가 사라진다냥.", [
              { label: "나만 빠지기", run: () => leaveRoom(r.id) },
              { label: "통째로 지우기", strong: true, run: () => leaveRoom(r.id, true) },
            ])
          : confirmBox("이 케미표에서 나를 뺄까냥? 내 이름과 생일이 바로 지워진다냥.", [{ label: "나 빼기", strong: true, run: () => leaveRoom(r.id) }]))}
    </li>
  );

  const pct = m ? Math.round((m.album.count / m.album.size) * 100) : 0;
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-semibold text-muted">🐾 친구랑 논 기록</h2>
      {error && (
        <p className="mb-2 text-sm text-pink">
          {error}{" "}
          <button onClick={load} className="underline">
            다시
          </button>
        </p>
      )}
      {!m ? (
        !error && <p className="py-6 text-center text-sm text-muted">불러오는 중…</p>
      ) : (
        <div className="space-y-3">
          <button onClick={() => setSheet({ game: "album" })} className="flex w-full items-center gap-3 rounded-2xl border border-violet/40 bg-surface p-4 text-left">
            <span className="text-2xl" aria-hidden>
              🗂️
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-semibold">고양이 도감</span>
                <span className="text-[12.5px] text-muted">
                  {m.album.count} / {m.album.size}
                </span>
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-pink to-peach" style={{ width: `${pct}%` }} />
              </span>
              <span className={`mt-1 block text-[12px] ${m.album.drawnToday || m.album.count >= m.album.size ? "text-muted" : "font-semibold text-peach"}`}>
                {m.album.count >= m.album.size ? "👑 60마리 다 모았다냥" : m.album.drawnToday ? "✅ 오늘 고양이 뽑음 · 내일 또" : "🎴 오늘의 고양이 뽑을 수 있다냥"}
              </span>
            </span>
            <span className="text-peach" aria-hidden>
              ›
            </span>
          </button>

          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold">📋 내가 만든 퀴즈 {m.quizzes.length ? m.quizzes.length : ""}</p>
              <button onClick={() => setSheet({ game: "quiz" })} className="text-[12.5px] font-semibold text-peach">
                + 새로 만들기
              </button>
            </div>
            {m.quizzes.length ? (
              <ul className="mt-1 divide-y divide-line">{m.quizzes.map(quizRow)}</ul>
            ) : (
              <p className="mt-2 text-[13px] leading-relaxed text-muted">아직 만든 퀴즈가 없다냥. 친구들이 나를 얼마나 아는지 시험해 봐라냥 😼</p>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold">💬 내 케미표 {m.rooms.length ? m.rooms.length : ""}</p>
              <button onClick={() => setSheet({ game: "room" })} className="text-[12.5px] font-semibold text-peach">
                + 새로 만들기
              </button>
            </div>
            {m.rooms.length ? (
              <ul className="mt-1 divide-y divide-line">{m.rooms.map(roomRow)}</ul>
            ) : (
              <p className="mt-2 text-[13px] leading-relaxed text-muted">아직 만들거나 들어간 케미표가 없다냥. 단톡방 링크 하나면 우리 방 궁합표가 나온다냥 🐾</p>
            )}
          </div>
          <p className="text-center text-[11.5px] text-muted">퀴즈 · 케미표는 만든 날부터 30일 뒤 저절로 사라진다냥</p>
        </div>
      )}
      <MiniGameSheet
        game={sheet?.game ?? null}
        linkId={sheet?.id ?? null}
        onClose={() => {
          setSheet(null);
          load();
        }}
        onStart={() => setScreen("landing")}
      />
    </section>
  );
}
