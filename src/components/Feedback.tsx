"use client";

import { useCallback, useEffect, useState } from "react";
import { COMMENT_MAX, KIND_LABEL, RATINGS, STATUS, SUGGEST_KINDS, SUGGEST_MAX, SUGGEST_MIN, TAGS_MAX, type Rating, type SuggestKind } from "@/lib/feedback";
import { useLive } from "@/lib/liveSettings";
import { sound } from "@/lib/sound";
import { md } from "@/lib/when";
import type { Mode } from "@/models/types";
import { feedbackApi, type MyRating, type MySuggestion } from "@/services/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { BottomSheet } from "./BottomSheet";
import { LoginSheet } from "./LoginSheet";
import { Say } from "./Nyang";

const inputCls = "w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-pink/60";

/** 내 점괘함 → 📮 내 건의함 (scrolls down to it once the page is drawn) */
export function openMySuggestions() {
  useAppStore.getState().setScreen("my");
  setTimeout(() => document.getElementById("my-suggestions")?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
}

// ───────────── 점괘 평가 (유료 점괘 결과 맨 아래) ─────────────

/**
 * "이 점괘 어땠냥?": one tap saves the 평가; then, if they like, why (up to 3 chips) and a line for 냥신. One per
 * reading (changing it overwrites); members only — a paid reading always has one.
 */
export function RatingCard({ mode }: { mode: Mode }) {
  const me = useAppStore((s) => s.me);
  const readingId = useAppStore((s) => s.readingId);
  const inputHash = useAppStore((s) => s.inputHash);
  const ref = readingId ? `r:${readingId}` : inputHash && inputHash !== "saved" ? `h:${inputHash}` : null;
  const [step, setStep] = useState<"load" | "ask" | "more" | "done">("load");
  const [pick, setPick] = useState<Rating | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggest, setSuggest] = useState(false);

  useEffect(() => {
    if (!me || !ref) return;
    let off = false;
    feedbackApi
      .ratingOf(ref)
      .then(({ rating }) => {
        if (off) return;
        if (rating) {
          setPick(rating.rating);
          setTags(rating.tags);
          setBody(rating.body);
          setStep("done");
        } else setStep("ask");
      })
      .catch(() => !off && setStep("ask"));
    return () => {
      off = true;
    };
  }, [me, ref]);

  if (!me || !ref || step === "load") return null;

  const send = async (r: Rating, t: string[], b: string, next: "more" | "done") => {
    setBusy(true);
    setError(null);
    try {
      const out: MyRating = (await feedbackApi.rate({ mode, ref, rating: r, tags: t, body: b })).rating;
      setPick(out.rating);
      setTags(out.tags);
      setBody(out.body);
      setStep(next);
      if (next === "done") sound().play("stamp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };
  const chosen = RATINGS.find((r) => r.id === pick);
  const toggle = (t: string) => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : x.length >= TAGS_MAX ? x : [...x, t]));

  return (
    <section className="mt-8 rounded-3xl border border-peach/35 bg-gradient-to-b from-[#24130d] to-[#120a07] p-5" aria-label="점괘 평가">
      {step === "ask" && (
        <>
          <p className="text-center text-[16px] font-bold">이 점괘 어땠냥?</p>
          <p className="mt-1 text-center text-[12.5px] text-muted">솔직하게 골라 주면 냥신이 다음 점괘를 더 잘 쓴다냥</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  sound().play("tap");
                  setTags([]);
                  setBody("");
                  void send(r.id, [], "", "more");
                }}
                disabled={busy}
                className={`rounded-2xl border py-3 transition active:scale-95 disabled:opacity-60 ${pick === r.id ? "border-peach bg-peach/15" : "border-line bg-white/[0.04]"}`}
              >
                <span className="block text-[30px] leading-none" aria-hidden>
                  {r.emoji}
                </span>
                <span className="mt-1.5 block text-[12.5px] font-semibold">{r.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "more" && chosen && (
        <div className="space-y-3">
          <p className="text-center text-[15px] font-bold">
            {chosen.emoji} {chosen.label} — 받았다냥!
          </p>
          <div>
            <p className="text-[12.5px] text-muted">왜 그렇게 느꼈냥? (골라도 되고 안 골라도 된다냥 · {TAGS_MAX}개까지)</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chosen.tags.map((t) => (
                <button
                  key={t}
                  onClick={() => toggle(t)}
                  aria-pressed={tags.includes(t)}
                  className={`rounded-full border px-3 py-1.5 text-[13px] ${tags.includes(t) ? "border-peach bg-peach/20 font-bold text-peach" : "border-line text-ink/85"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <input value={body} onChange={(e) => setBody(e.target.value.slice(0, COMMENT_MAX))} placeholder="냥신한테 한마디 (선택)" className={inputCls} aria-label="냥신한테 한마디" />
          {error && <p className="text-[13px] text-pink">{error}</p>}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button onClick={() => send(chosen.id, tags, body, "done")} disabled={busy} className="btn-primary py-3 text-[15px]">
              {busy ? "보내는 중…" : "보내기"}
            </button>
            <button onClick={() => setStep("done")} disabled={busy} className="rounded-2xl border border-line px-4 text-[13.5px] text-muted">
              이대로 끝
            </button>
          </div>
        </div>
      )}

      {step === "done" && chosen && (
        <div className="text-center">
          <p className="text-[15px] font-bold">고맙다냥! 🐾</p>
          <p className="mt-1 text-[13px] text-muted">
            이 점괘엔 <b className="text-ink">{chosen.emoji} {chosen.label}</b>
            {tags.length ? ` · ${tags.join(", ")}` : ""}
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 text-[12.5px]">
            <button onClick={() => setStep("ask")} className="text-muted underline underline-offset-4">
              평가 바꾸기
            </button>
            <button onClick={() => setSuggest(true)} className="font-semibold text-peach">
              📮 더 하고 싶은 말은 건의함에 →
            </button>
          </div>
        </div>
      )}
      {error && step === "ask" && <p className="mt-2 text-center text-[13px] text-pink">{error}</p>}
      <SuggestSheet open={suggest} onClose={() => setSuggest(false)} page="result" mode={mode} />
    </section>
  );
}

// ───────────── 📮 냥신 건의함 (회원 전용) ─────────────

/** The 건의함 sheet: a guest gets the login; a member picks what it's about and writes (SUGGEST_MIN–SUGGEST_MAX). */
export function SuggestSheet({
  open,
  onClose,
  page,
  mode = null,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  page: "home" | "result" | "my";
  mode?: Mode | null;
  onSent?: (s: MySuggestion) => void;
}) {
  const me = useAppStore((s) => s.me);
  const screen = useAppStore((s) => s.screen);
  const gift = useLive().feedback.adoptReward;
  const [kind, setKind] = useState<SuggestKind>("idea");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<MySuggestion | null>(null);
  const [login, setLogin] = useState(false);

  // every opening starts clean (a sent one shows its thanks until closed)
  useEffect(() => {
    if (!open) return;
    setSent(null);
    setError(null);
  }, [open]);

  const k = SUGGEST_KINDS.find((x) => x.id === kind)!;
  const len = body.trim().length;
  const send = async () => {
    if (busy || len < SUGGEST_MIN) return;
    setBusy(true);
    setError(null);
    try {
      const r = await feedbackApi.suggest({ kind, body: body.trim(), page, mode });
      sound().play("stamp");
      setSent(r.item);
      setBody("");
      onSent?.(r.item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} title="📮 냥신 건의함" onClose={onClose}>
      {!me ? (
        <div className="space-y-4">
          <Say mood="smug">
            건의함은 냥신 회원만 쓸 수 있다냥. 로그인하면 보낸 의견이 어떻게 반영되는지 내 점괘함에서 볼 수 있고{gift > 0 ? `, 채택되면 ${gift}냥 선물도 준다냥` : ""} 🐾
          </Say>
          <button onClick={() => setLogin(true)} className="btn-primary w-full py-4">
            로그인하고 건의하기
          </button>
          <LoginSheet open={login} onClose={() => setLogin(false)} />
        </div>
      ) : sent ? (
        <div className="space-y-4">
          <Say mood="happy">잘 받았다냥! 냥신이 꼭 읽고, 답장과 반영 소식은 내 점괘함의 &lsquo;📮 내 건의함&rsquo;에 남기겠다냥 🐾</Say>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose();
                if (screen === "my") setTimeout(() => document.getElementById("my-suggestions")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                else openMySuggestions();
              }}
              className="rounded-2xl border border-violet/45 bg-white/[0.04] py-3.5 text-[14px] font-semibold"
            >
              📮 내 건의함 보기
            </button>
            <button onClick={() => setSent(null)} className="rounded-2xl border border-line py-3.5 text-[14px]">
              하나 더 보내기
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Say mood="talk">&ldquo;이런 게 있었으면&rdquo;, &ldquo;여기가 아쉬웠어&rdquo;… 뭐든 말해 줘라냥. 하나도 안 빼고 읽는다냥.</Say>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-muted">어떤 이야기냥?</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGEST_KINDS.map((x) => (
                <button
                  key={x.id}
                  onClick={() => setKind(x.id)}
                  aria-pressed={kind === x.id}
                  className={`rounded-xl border px-3 py-2.5 text-left text-[14px] ${kind === x.id ? "border-pink bg-pink/15 font-bold text-ink" : "border-line text-muted"}`}
                >
                  {x.emoji} {x.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between text-[13px] text-muted">
              <span>내용</span>
              <span className={len > SUGGEST_MAX - 30 ? "text-peach" : ""}>
                {len}/{SUGGEST_MAX}
              </span>
            </span>
            <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, SUGGEST_MAX))} rows={5} placeholder={k.placeholder} className={`${inputCls} resize-none`} />
          </label>
          {kind === "bug" && (
            <p className="text-[12.5px] leading-relaxed text-muted">어느 화면에서 무엇을 하다가 그랬는지 적어 주면 빨리 고친다냥. 쓰는 기기는 자동으로 같이 적힌다냥. 결제 · 환불 문제는 맨 아래 &lsquo;고객문의&rsquo;로 보내 줘라냥.</p>
          )}
          {gift > 0 && kind !== "praise" && <p className="text-[13px] font-semibold text-peach">🎁 이 의견이 채택되면 {gift}냥을 선물로 준다냥</p>}
          {error && <p className="text-[13px] text-pink">{error}</p>}
          <button onClick={send} disabled={busy || len < SUGGEST_MIN} className="btn-primary w-full py-4">
            {busy ? "보내는 중…" : len < SUGGEST_MIN ? `${SUGGEST_MIN}글자 이상 적어 줘라냥` : "📮 냥신한테 보내기"}
          </button>
          <p className="text-center text-[12px] text-muted">답장과 반영 소식은 📜 내 점괘함 → 📮 내 건의함에서 볼 수 있다냥</p>
        </div>
      )}
    </BottomSheet>
  );
}

/** 홈 맨 아래: 언제든 건의할 수 있는 칸. */
export function SuggestCard() {
  const me = useAppStore((s) => s.me);
  const gift = useLive().feedback.adoptReward;
  const [open, setOpen] = useState(false);
  return (
    <section className="fade-up mt-10 rounded-3xl border border-peach/35 bg-gradient-to-b from-[#24130d] to-[#120a07] p-5" aria-label="냥신 건의함">
      <div className="flex items-center gap-3">
        <span className="text-[34px] leading-none" aria-hidden>
          📮
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px]">냥신 건의함</h2>
          <p className="text-[12.5px] text-muted">회원 전용 · 언제든 열려 있다냥</p>
        </div>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink/85">&ldquo;이런 게 있었으면&rdquo;, &ldquo;여기가 아쉬웠어&rdquo;… 냥신한테 직접 말해 줘라냥. 하나도 안 빼고 읽고 답장한다냥.</p>
      {gift > 0 && <p className="mt-1.5 text-[13px] font-semibold text-peach">🎁 의견이 채택되면 {gift}냥 선물!</p>}
      <button onClick={() => setOpen(true)} className="btn-primary mt-4 w-full py-3.5 text-[15px]">
        ✍️ 건의하러 가기
      </button>
      {me && (
        <button onClick={openMySuggestions} className="mt-2.5 w-full text-center text-[12.5px] text-muted underline underline-offset-4">
          {me.news ? (
            <span className="font-semibold text-peach no-underline">🔔 보낸 의견에 새 소식이 있다냥 →</span>
          ) : (
            "📜 내가 보낸 의견 · 답장 보기"
          )}
        </button>
      )}
      <SuggestSheet open={open} onClose={() => setOpen(false)} page="home" />
    </section>
  );
}

// ───────────── 내 점괘함 · 📮 내 건의함 ─────────────

/** The member's 건의: 상태, 냥신의 답장, 채택 선물; news (unread) is marked seen once shown. */
export function MyFeedbackSection() {
  const [items, setItems] = useState<MySuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await feedbackApi.mine();
      setItems(r.items);
      setError(null);
      if (r.news) {
        // keep the NEW marks for this visit; the red dot goes away
        setFresh((f) => new Set([...f, ...r.items.filter((i) => i.unread).map((i) => i.id)]));
        await feedbackApi.seen().catch(() => null);
        useAppStore.setState((s) => (s.me ? { me: { ...s.me, news: 0 } } : {}));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오지 못했다냥.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const gifts = items?.filter((i) => fresh.has(i.id) && i.adopted && i.reward > 0).reduce((n, i) => n + i.reward, 0) ?? 0;
  return (
    <section id="my-suggestions" className="mt-8 scroll-mt-16">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">📮 내 건의함</h2>
        <button onClick={() => setOpen(true)} className="text-[12.5px] font-semibold text-peach">
          + 건의하기
        </button>
      </div>
      {error && (
        <p className="mb-2 text-sm text-pink">
          {error}{" "}
          <button onClick={load} className="underline">
            다시
          </button>
        </p>
      )}
      {fresh.size > 0 && (
        <p className="mb-2 rounded-2xl border border-peach/40 bg-peach/10 px-4 py-3 text-[13px] font-semibold leading-relaxed text-peach">
          🔔 보낸 의견에 새 소식이 있다냥!{gifts > 0 ? ` 🎁 채택 선물 ${gifts}냥을 복주머니에 넣었다냥` : ""}
        </p>
      )}
      {!items ? (
        !error && <p className="py-6 text-center text-sm text-muted">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-5 text-center">
          <p className="text-[13.5px] leading-relaxed text-muted">아직 보낸 의견이 없다냥. 아쉬운 점이나 바라는 기능을 냥신한테 말해 줘라냥 🐾</p>
          <button onClick={() => setOpen(true)} className="btn-primary mt-4 px-6 py-2.5 text-sm">
            ✍️ 건의하러 가기
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className={`rounded-2xl border bg-surface p-4 ${fresh.has(i.id) ? "border-peach/50" : "border-line"}`}>
              <div className="flex items-center justify-between gap-2 text-[12px] text-muted">
                <span>
                  {KIND_LABEL[i.kind]} · {md(i.createdAt)}
                </span>
                {fresh.has(i.id) && <span className="rounded-sm bg-pink px-1.5 py-0.5 text-[10.5px] font-bold text-white">NEW</span>}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed">{i.body}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px]">{STATUS[i.status].member}</span>
                {i.adopted && (
                  <span className="rounded-full bg-peach/20 px-2.5 py-1 text-[12px] font-bold text-peach">🎁 채택{i.reward > 0 ? ` · ${i.reward}냥 선물` : ""}</span>
                )}
              </div>
              {i.reply && (
                <div className="mt-2.5 rounded-xl border border-violet/35 bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[12px] font-semibold text-muted">🐾 냥신의 답장</p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">{i.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <SuggestSheet
        open={open}
        onClose={() => {
          setOpen(false);
          load();
        }}
        page="my"
      />
    </section>
  );
}
