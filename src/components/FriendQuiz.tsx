"use client";

import { useEffect, useState } from "react";
import { josa } from "@/lib/josa";
import { QUIZ_BANK, QUIZ_LEN, quizText, type QuizQ } from "@/lib/quizBank";
import { sound } from "@/lib/sound";
import { lifeLine, mergeRows } from "@/lib/when";
import { mineApi, quizApi, type MineQuiz, type QuizResult, type QuizView } from "@/services/apiClient";
import { shareService } from "@/services/shareService";
import { useAppStore } from "@/store/useAppStore";
import { useSavedInfo } from "./InfoGate";
import { Say } from "./Nyang";

const inputCls = "w-full rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-pink/60";
const OWN = "nyang-quiz-own";
/** a quiz this browser made: kept so the maker can come back to its 순위표 (and delete it) without an account */
type OwnQuiz = { id: string; name?: string; at?: string; items?: { q: string; a: number }[]; key?: string };
const PLAYED = (id: string) => `nyang-quiz-played-${id}`;
const store = {
  get<T>(k: string): T | null {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* storage unavailable */
    }
  },
};
/** older entries were plain ids */
const readOwn = (): OwnQuiz[] => (store.get<(OwnQuiz | string)[]>(OWN) ?? []).map((x) => (typeof x === "string" ? { id: x } : x));
const keyOf = (id: string) => readOwn().find((x) => x.id === id)?.key ?? null;
const forget = (ids: string[]) => store.set(OWN, readOwn().filter((o) => !ids.includes(o.id)));
/** the server said the quiz is gone (30일이 지났거나 지워짐), not just a dropped connection */
const isGone = (e: unknown) => e instanceof Error && e.message.includes("없거나");
const linkOf = (id: string) => `${window.location.origin}/quiz/${id}`;
const shuffle = <T,>(a: T[]) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

/** one row of 내 퀴즈 */
type QuizRow = MineQuiz;

/**
 * The quizzes this browser made and still owns, as 내 퀴즈 rows. Opening them logged in joins guest-made ones to the
 * account (the server does that on GET), so read these before the account's list. Gone ones are forgotten.
 */
export function localQuizRows(): Promise<QuizRow[]> {
  return Promise.all(
    readOwn()
      .slice(-20)
      .map((o) =>
        quizApi
          .get(o.id, o.key)
          .then((v): QuizRow | null =>
            v.isOwner ? { id: o.id, owner: v.owner, total: v.total, plays: v.plays, leader: v.ranking[0] ?? null, createdAt: v.createdAt, expiresAt: v.expiresAt } : null,
          )
          .catch((e) => {
            if (isGone(e)) forget([o.id]);
            return null;
          }),
      ),
  ).then((rows) => rows.filter((r): r is QuizRow => Boolean(r)));
}

/** The maker deletes a quiz (by their account or this browser's key). */
export async function deleteQuiz(id: string) {
  await quizApi.remove(id, keyOf(id));
  forget([id]);
}
export const quizLink = (id: string) => linkOf(id);

type View = { at: "make" } | { at: "list" } | { at: "open"; id: string };

/**
 * "나를 얼마나 아냥?": the owner answers QUIZ_LEN questions about themself and sends the link; friends guess, get a score
 * from 냥신 and land on the ranking. The maker opening their quiz (their account, or the key this browser kept) sees
 * its 순위표 and 문제별 결과 instead; 📋 내 퀴즈 lists every quiz they made.
 */
export function FriendQuiz({ quizId }: { quizId?: string | null }) {
  const [view, setView] = useState<View>(quizId ? { at: "open", id: quizId } : { at: "make" });
  const open = (id: string) => setView({ at: "open", id });
  if (view.at === "list") return <QuizList onOpen={open} onMake={() => setView({ at: "make" })} />;
  if (view.at === "open") return <QuizOpen key={view.id} id={view.id} onMake={() => setView({ at: "make" })} onList={() => setView({ at: "list" })} />;
  return <QuizMake onMade={open} onList={() => setView({ at: "list" })} />;
}

/** Loads the quiz once and shows the maker's 결과 or the friend's quiz. */
function QuizOpen({ id, onMake, onList }: { id: string; onMake: () => void; onList: () => void }) {
  const [v, setV] = useState<QuizView | null>(null);
  const [gone, setGone] = useState<string | null>(null);
  useEffect(() => {
    quizApi
      .get(id, keyOf(id))
      .then(setV)
      .catch((e) => {
        if (isGone(e)) forget([id]);
        setGone(e instanceof Error ? e.message : "퀴즈를 열 수 없다냥.");
      });
  }, [id]);
  if (gone)
    return (
      <div className="space-y-4">
        <Say mood="wow">{gone}</Say>
        <button onClick={onMake} className="btn-primary w-full py-4">
          새 퀴즈 만들기
        </button>
        <button onClick={onList} className="w-full py-1 text-[13px] text-muted underline underline-offset-4">
          📋 내 퀴즈 보기
        </button>
      </div>
    );
  if (!v) return <p className="animate-pulse py-10 text-center text-[14px] text-muted">퀴즈 펼치는 중…</p>;
  return v.isOwner ? <QuizOwner id={id} v={v} onNew={onMake} onList={onList} /> : <QuizPlay id={id} first={v} onMake={onMake} />;
}

function shareQuiz(id: string, owner: string, note: (s: string) => void) {
  const url = linkOf(id);
  return shareService
    .shareKakao({
      title: `🐾 ${josa(owner, "을/를")} 얼마나 아냥?`,
      description: `${QUIZ_LEN}문제 다 맞히면 찐친 인정이다냥. 순위표도 있다냥!`,
      url,
      buttons: [{ title: "퀴즈 풀기", url }],
    })
    .then((o) => o === "copied" && note("링크를 복사했다냥. 친구한테 보내라냥 📋"));
}

function QuizMake({ onMade, onList }: { onMade: (id: string) => void; onList: () => void }) {
  const saved = useSavedInfo();
  const session = useAppStore((s) => s.input.me);
  const [name, setName] = useState(saved?.name ?? session.name ?? "");
  const [started, setStarted] = useState(false);
  const [qs, setQs] = useState<QuizQ[]>([]);
  const [spare, setSpare] = useState<QuizQ[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = () => {
    const all = shuffle(QUIZ_BANK);
    setQs(all.slice(0, QUIZ_LEN));
    setSpare(all.slice(QUIZ_LEN));
    setAnswers([]);
    setStarted(true);
  };
  const i = answers.length;
  const swap = () => {
    if (!spare.length) return;
    setQs((q) => q.map((x, k) => (k === i ? spare[0] : x)));
    setSpare((s) => [...s.slice(1), qs[i]]);
  };
  const pick = async (a: number) => {
    sound().play("tap");
    const next = [...answers, a];
    setAnswers(next);
    if (next.length < QUIZ_LEN) return;
    setBusy(true);
    setError(null);
    try {
      const r = await quizApi.create(name.trim(), qs.map((q, k) => ({ q: q.id, a: next[k] })));
      const items = qs.map((q, k) => ({ q: q.id, a: next[k] }));
      store.set(OWN, [...readOwn(), { id: r.id, name: name.trim(), at: new Date().toISOString(), items, key: r.key }].slice(-20));
      sound().play("stamp");
      onMade(r.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
      setAnswers(next.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  if (!started)
    return (
      <div className="space-y-4">
        <Say mood="smug">친구들이 너를 얼마나 아는지 시험해 보자냥. {QUIZ_LEN}문제에 네 답을 고르면, 친구들이 맞히는 퀴즈가 된다냥 😼</Say>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-muted">친구들이 아는 이름 (별명 OK)</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 10))} placeholder="예: 지민" className={inputCls} />
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button onClick={start} disabled={!name.trim()} className="btn-primary py-4">
            문제 고르러 가기 →
          </button>
          <button onClick={onList} className="rounded-2xl border border-violet/45 bg-white/[0.04] px-4 text-[14px] font-semibold">
            📋 내 퀴즈 보기
          </button>
        </div>
        <p className="text-center text-[12px] text-muted">만든 퀴즈의 순위표 · 문제별 결과는 📋 내 퀴즈에서 언제든 다시 본다냥</p>
      </div>
    );
  const q = qs[Math.min(i, QUIZ_LEN - 1)];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>
          {Math.min(i + 1, QUIZ_LEN)} / {QUIZ_LEN} · 네 진짜 답을 골라라냥
        </span>
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full bg-peach transition-all" style={{ width: `${(i / QUIZ_LEN) * 100}%` }} />
        </span>
      </div>
      <p className="text-[18px] font-bold leading-snug">{quizText(q.q, name.trim())}</p>
      <div className="grid gap-2">
        {q.options.map((o, k) => (
          <button key={k} onClick={() => pick(k)} disabled={busy} className="rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-left text-[15px] transition active:scale-[0.98] disabled:opacity-50">
            {o}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-pink">{error}</p>}
      <div className="flex justify-between text-[13px] text-muted">
        <button onClick={() => setAnswers((a) => a.slice(0, -1))} disabled={!i || busy} className="underline underline-offset-4 disabled:opacity-30">
          ← 이전 문제
        </button>
        <button onClick={swap} disabled={busy || !spare.length} className="underline underline-offset-4">
          🔄 다른 문제로
        </button>
      </div>
      {busy && <p className="animate-pulse text-center text-[13px] text-peach">퀴즈 만드는 중…</p>}
    </div>
  );
}

function Ranking({ v, me }: { v: QuizView; me?: string }) {
  if (!v.ranking.length) return <p className="text-center text-[13px] text-muted">아직 푼 친구가 없다냥. 링크를 보내라냥 📨</p>;
  return (
    <ol className="divide-y divide-line">
      {v.ranking.map((r, k) => (
        <li key={k} className={`flex items-center gap-3 py-2.5 ${r.name === me ? "text-peach" : ""}`}>
          <span className="w-7 text-center text-[14px] font-extrabold">{k < 3 ? ["🥇", "🥈", "🥉"][k] : k + 1}</span>
          <span className="min-w-0 flex-1 truncate text-[14.5px]">{r.name}</span>
          <span className="text-[14px] font-bold">
            {r.score}/{v.total}
          </span>
        </li>
      ))}
    </ol>
  );
}

function QuizOwner({ id, v, onNew, onList }: { id: string; v: QuizView; onNew: () => void; onList: () => void }) {
  const [note, setNote] = useState<string | null>(null);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    shareService.prepareKakao().catch(() => null);
  }, []);
  const link = linkOf(id);
  const mine = v.myAnswers ?? readOwn().find((x) => x.id === id)?.items?.map((x) => x.a);
  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteQuiz(id);
      onList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <button onClick={onList} className="text-[13px] text-muted">
        ← 내 퀴즈 목록
      </button>
      <Say mood="happy">
        {v.plays ? `${v.owner}의 퀴즈다냥. 지금까지 ${v.plays}명이 풀었다냥. 친구들한테 더 보내라냥!` : `퀴즈 완성이다냥! 이제 친구들한테 보내라냥. 푼 친구는 아래 순위표에 바로 뜬다냥 📨`}
      </Say>
      <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-[12.5px]">
        <span className="font-semibold">{v.plays ? `🟢 ${v.plays}명 참여` : "⏳ 친구 기다리는 중"}</span>
        <span className="text-muted">{lifeLine(v.createdAt, v.expiresAt)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => shareQuiz(id, v.owner, setNote)} className="rounded-xl bg-[#FEE500] py-3 text-[14px] font-bold text-[#191600]">
          카카오톡으로 보내기
        </button>
        <button
          onClick={() =>
            navigator.clipboard
              ?.writeText(link)
              .then(() => setNote("링크를 복사했다냥 📋"))
              .catch(() => setNote(link))
          }
          className="rounded-xl border border-line py-3 text-[14px] font-semibold"
        >
          링크 복사
        </button>
      </div>
      {note && <p className="fade-up break-all text-center text-xs text-peach">{note}</p>}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="mb-1 text-[14px] font-bold">🏆 순위표</p>
        <Ranking v={v} />
      </div>
      {v.hardest && (
        <div className="rounded-2xl border border-violet/35 bg-white/[0.03] p-4 text-[13.5px] leading-relaxed">
          <p className="font-bold">🤔 친구들이 제일 많이 틀린 문제</p>
          <p className="mt-1">
            Q{v.hardest.index + 1}. {v.hardest.q} <span className="text-muted">({v.hardest.missed}명이 틀림)</span>
          </p>
        </div>
      )}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="mb-2 text-[14px] font-bold">📝 문제별 결과</p>
        <ol className="space-y-2">
          {v.questions.map((q, k) => {
            const a = mine?.[k];
            return (
              <li key={k} className="text-[13.5px] leading-snug">
                <span className="font-semibold">
                  Q{k + 1}. {q.q}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-muted">
                  {a !== undefined && q.options[a] ? `내 답: ${q.options[a]} · ` : ""}
                  {v.plays ? `맞힌 친구 ${v.correct[k]}/${v.plays}명` : "아직 푼 친구 없음"}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <button onClick={onNew} className="w-full rounded-xl border border-line py-3 text-[14px] font-semibold">
        퀴즈 새로 만들기
      </button>
      {ask ? (
        <div className="rounded-2xl border border-pink/40 bg-pink/[0.06] p-4 text-center">
          <p className="text-[13.5px] font-semibold">이 퀴즈를 지울까냥? 순위표도 같이 사라지고, 링크도 더는 안 열린다냥.</p>
          {error && <p className="mt-1 text-[12.5px] text-pink">{error}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setAsk(false)} disabled={busy} className="rounded-xl border border-line py-2.5 text-[13.5px]">
              그냥 둘래
            </button>
            <button onClick={remove} disabled={busy} className="rounded-xl bg-pink/80 py-2.5 text-[13.5px] font-bold text-white">
              {busy ? "지우는 중…" : "지우기"}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAsk(true)} className="w-full py-1 text-[12.5px] text-muted underline underline-offset-4">
          🗑️ 이 퀴즈 지우기
        </button>
      )}
      <p className="text-center text-[12px] text-muted">퀴즈는 만든 날부터 30일 뒤 저절로 사라진다냥</p>
    </div>
  );
}

function QuizPlay({ id, first, onMake }: { id: string; first: QuizView; onMake: () => void }) {
  const saved = useSavedInfo();
  const [v, setV] = useState<QuizView>(first);
  const [name, setName] = useState(saved?.name ?? "");
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(() => store.get<QuizResult>(PLAYED(id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pick = async (a: number) => {
    if (busy) return;
    sound().play("tap");
    const next = [...answers, a];
    setAnswers(next);
    if (next.length < v.total) return;
    setBusy(true);
    setError(null);
    try {
      const r = await quizApi.play(id, name.trim(), next);
      store.set(PLAYED(id), r);
      sound().play(r.mine.score === r.total ? "stamp" : "reveal");
      setResult(r);
      setV(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
      setAnswers([]);
      setStarted(false);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const m = result.mine;
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-peach/40 bg-white/[0.03] p-5 text-center">
          <p className="text-[13px] text-muted">{josa(m.name, "이/가")} 아는 {v.owner}</p>
          <p className="mt-1 text-[44px] font-black leading-none text-peach">
            {m.score}
            <span className="text-[22px] text-muted">/{result.total}</span>
          </p>
          <p className="mt-2 text-[15px] font-bold">{m.verdict}</p>
        </div>
        <ol className="space-y-2">
          {result.questions.map((q, k) => (
            <li key={k} className="rounded-xl border border-line bg-surface px-3 py-2.5 text-[13.5px]">
              <span className="font-semibold">
                {m.right[k] ? "✅" : "❌"} {q.q}
              </span>
              <span className="mt-0.5 block text-muted">
                정답: {q.options[m.answers[k]]}
                {!m.right[k] && m.picked && <> · 내 답: {q.options[m.picked[k]]}</>}
              </span>
            </li>
          ))}
        </ol>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-1 text-[14px] font-bold">🏆 순위표</p>
          <Ranking v={v} me={m.name} />
        </div>
        <button onClick={onMake} className="btn-primary w-full py-4">
          나도 퀴즈 만들어서 친구들 시험하기 →
        </button>
      </div>
    );
  }

  if (!started)
    return (
      <div className="space-y-4">
        <Say mood="smug">{`${josa(v.owner, "이/가")} 낸 퀴즈다냥. ${v.total}문제, ${josa(v.owner, "을/를")} 얼마나 아는지 보자냥 😼`}</Say>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-muted">내 이름 (순위표에 나온다냥)</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 10))} placeholder="예: 민수" className={inputCls} />
        </label>
        {error && <p className="text-sm text-pink">{error}</p>}
        <button onClick={() => setStarted(true)} disabled={!name.trim()} className="btn-primary w-full py-4">
          퀴즈 풀기 →
        </button>
        {v.ranking.length > 0 && <p className="text-center text-[12.5px] text-muted">지금까지 {v.plays}명이 풀었다냥 · 1등은 {v.ranking[0].name} ({v.ranking[0].score}/{v.total})</p>}
      </div>
    );

  const i = Math.min(answers.length, v.total - 1);
  const q = v.questions[i];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>
          {i + 1} / {v.total}
        </span>
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full bg-peach transition-all" style={{ width: `${(answers.length / v.total) * 100}%` }} />
        </span>
      </div>
      <p className="text-[18px] font-bold leading-snug">{q.q}</p>
      <div className="grid gap-2">
        {q.options.map((o, k) => (
          <button key={k} onClick={() => pick(k)} disabled={busy} className="rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-left text-[15px] transition active:scale-[0.98] disabled:opacity-50">
            {o}
          </button>
        ))}
      </div>
      {busy && <p className="animate-pulse text-center text-[13px] text-peach">채점하는 중…</p>}
    </div>
  );
}

/**
 * 📋 내 퀴즈: every quiz this person made — the ones on their account (any device) and the ones this browser keeps —
 * with how many friends played, who leads and how long it has left.
 */
function QuizList({ onOpen, onMake }: { onOpen: (id: string) => void; onMake: () => void }) {
  const me = useAppStore((s) => s.me);
  const [rows, setRows] = useState<QuizRow[] | null>(null);
  useEffect(() => {
    let off = false;
    localQuizRows()
      .then(async (local) => {
        const acct = me ? await mineApi.get().then((m) => m.quizzes).catch(() => []) : [];
        if (!off) setRows(mergeRows(acct, local));
      })
      .catch(() => !off && setRows([]));
    return () => {
      off = true;
    };
  }, [me]);
  return (
    <div className="space-y-4">
      <button onClick={onMake} className="text-[13px] text-muted">
        ← 퀴즈 만들기
      </button>
      <p className="text-[16px] font-bold">📋 내가 만든 퀴즈</p>
      {!rows ? (
        <p className="animate-pulse py-8 text-center text-[14px] text-muted">퀴즈 찾는 중…</p>
      ) : rows.length ? (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <button onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left active:scale-[0.99]">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold">{r.owner}의 퀴즈</span>
                  <span className="mt-0.5 block text-[12.5px] text-ink/85">
                    {r.plays ? `🟢 ${r.plays}명 참여 · 1등 ${r.leader?.name} ${r.leader?.score}/${r.total}` : "⏳ 아직 푼 친구 없음"}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted">{lifeLine(r.createdAt, r.expiresAt)}</span>
                </span>
                <span className="shrink-0 text-[12.5px] font-semibold text-peach">결과 보기 ›</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-5 text-center">
          <p className="text-[14px]">아직 만든 퀴즈가 없다냥 🐾</p>
          <button onClick={onMake} className="btn-primary w-full py-3.5">
            첫 퀴즈 만들기
          </button>
        </div>
      )}
      <p className="text-center text-[12px] text-muted">
        {me ? "로그인한 계정으로 만든 퀴즈는 다른 기기에서도 여기 뜬다냥" : "로그인하면 만든 퀴즈가 계정에 저장돼서 다른 기기에서도 본다냥"}
      </p>
    </div>
  );
}
