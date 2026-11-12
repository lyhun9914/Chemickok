"use client";

import { useEffect, useState } from "react";
import { josa } from "@/lib/josa";
import { QUIZ_BANK, QUIZ_LEN, quizText, type QuizQ } from "@/lib/quizBank";
import { sound } from "@/lib/sound";
import { quizApi, type QuizResult, type QuizView } from "@/services/apiClient";
import { shareService } from "@/services/shareService";
import { useAppStore } from "@/store/useAppStore";
import { useSavedInfo } from "./InfoGate";
import { Say } from "./Nyang";

const inputCls = "w-full rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-pink/60";
const OWN = "nyang-quiz-own";
/** a quiz this browser made: kept so the maker can come back to its 순위표 (and see their own answers) */
type OwnQuiz = { id: string; name?: string; at?: string; items?: { q: string; a: number }[] };
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
const ownOf = (id: string) => readOwn().find((x) => x.id === id) ?? null;
const linkOf = (id: string) => `${window.location.origin}/quiz/${id}`;
const shuffle = <T,>(a: T[]) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

/**
 * "나를 얼마나 아냥?": the owner answers QUIZ_LEN questions about themself and sends the link; friends guess, get a score
 * from 냥신 and land on the ranking. The owner opening their own link sees the ranking instead of the quiz.
 */
export function FriendQuiz({ quizId }: { quizId?: string | null }) {
  const [id, setId] = useState<string | null>(quizId ?? null);
  const [making, setMaking] = useState(!quizId);
  if (making || !id)
    return (
      <QuizMake
        onMade={(x) => {
          setId(x);
          setMaking(false);
        }}
      />
    );
  const own = Boolean(ownOf(id));
  return own ? <QuizOwner id={id} onNew={() => setMaking(true)} /> : <QuizPlay id={id} onMake={() => setMaking(true)} />;
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

function QuizMake({ onMade }: { onMade: (id: string) => void }) {
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
      store.set(OWN, [...readOwn(), { id: r.id, name: name.trim(), at: new Date().toISOString(), items }].slice(-20));
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
        <button onClick={start} disabled={!name.trim()} className="btn-primary w-full py-4">
          문제 고르러 가기 →
        </button>
        <MyQuizzes onOpen={onMade} />
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

function QuizOwner({ id, onNew }: { id: string; onNew: () => void }) {
  const [v, setV] = useState<QuizView | null>(null);
  const [gone, setGone] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    quizApi.get(id).then(setV).catch((e) => setGone(e instanceof Error ? e.message : "퀴즈를 열 수 없다냥."));
    shareService.prepareKakao().catch(() => null);
  }, [id]);
  if (gone)
    return (
      <div className="space-y-4">
        <Say mood="wow">{gone}</Say>
        <button onClick={onNew} className="btn-primary w-full py-4">
          새 퀴즈 만들기
        </button>
      </div>
    );
  if (!v) return <p className="animate-pulse py-10 text-center text-[14px] text-muted">순위표 펼치는 중…</p>;
  const link = linkOf(id);
  const mine = ownOf(id);
  return (
    <div className="space-y-4">
      <Say mood="happy">
        {v.plays ? `${v.owner}의 퀴즈다냥. 지금까지 ${v.plays}명이 풀었다냥. 친구들한테 더 보내라냥!` : `퀴즈 완성이다냥! 이제 친구들한테 보내라냥. 푼 친구는 아래 순위표에 바로 뜬다냥 📨`}
      </Say>
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
            const a = mine?.items?.[k]?.a;
            return (
              <li key={k} className="text-[13.5px] leading-snug">
                <span className="font-semibold">
                  Q{k + 1}. {q.q}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-muted">
                  {a !== undefined ? `내 답: ${q.options[a]} · ` : ""}
                  {v.plays ? `맞힌 친구 ${v.correct[k]}/${v.plays}명` : "아직 푼 친구 없음"}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="text-center text-[12px] text-muted">퀴즈는 만든 날부터 30일 뒤 사라진다냥</p>
      <button onClick={onNew} className="w-full py-1 text-[13px] text-muted underline underline-offset-4">
        퀴즈 새로 만들기
      </button>
    </div>
  );
}

function QuizPlay({ id, onMake }: { id: string; onMake: () => void }) {
  const saved = useSavedInfo();
  const [v, setV] = useState<QuizView | null>(null);
  const [gone, setGone] = useState<string | null>(null);
  const [name, setName] = useState(saved?.name ?? "");
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(() => store.get<QuizResult>(PLAYED(id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    quizApi.get(id).then(setV).catch((e) => setGone(e instanceof Error ? e.message : "퀴즈를 열 수 없다냥."));
  }, [id]);

  const pick = async (a: number) => {
    if (!v || busy) return;
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

  if (gone)
    return (
      <div className="space-y-4">
        <Say mood="wow">{gone}</Say>
        <button onClick={onMake} className="btn-primary w-full py-4">
          내 퀴즈 만들기
        </button>
      </div>
    );
  if (!v) return <p className="animate-pulse py-10 text-center text-[14px] text-muted">퀴즈 펼치는 중…</p>;

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

/** 내가 만든 퀴즈: the quizzes this browser made, with how many friends played and who leads. */
function MyQuizzes({ onOpen }: { onOpen: (id: string) => void }) {
  const [rows, setRows] = useState<{ id: string; v: QuizView }[] | null>(null);
  useEffect(() => {
    const own = readOwn().slice(-5).reverse();
    if (!own.length) return setRows([]);
    Promise.all(own.map((o) => quizApi.get(o.id).then((v) => ({ id: o.id, v })).catch(() => null))).then((all) => {
      const live = all.filter((x): x is { id: string; v: QuizView } => Boolean(x));
      // forget quizzes that are gone (30일이 지났거나 지워짐)
      const keep = new Set(live.map((x) => x.id));
      const rest = readOwn().filter((o) => keep.has(o.id) || !own.some((x) => x.id === o.id));
      store.set(OWN, rest);
      setRows(live);
    });
  }, []);
  if (!rows?.length) return null;
  return (
    <div className="rounded-2xl border border-violet/35 bg-white/[0.03] p-4">
      <p className="text-[14px] font-bold">📋 내가 만든 퀴즈 · 결과 보기</p>
      <ul className="mt-1 divide-y divide-line">
        {rows.map(({ id, v }) => (
          <li key={id}>
            <button onClick={() => onOpen(id)} className="flex w-full items-center gap-3 py-2.5 text-left">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold">{v.owner}의 퀴즈</span>
                <span className="block text-[12.5px] text-muted">
                  {v.plays ? `${v.plays}명이 풀었다냥 · 1등 ${v.ranking[0].name} ${v.ranking[0].score}/${v.total}` : "아직 푼 친구 없음"}
                </span>
              </span>
              <span className="text-peach" aria-hidden>
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
