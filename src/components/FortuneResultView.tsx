"use client";

import { useEffect, useRef, useState } from "react";
import { PRODUCTS, productOf, won } from "@/lib/config";
import { sound } from "@/lib/sound";
import type { FortuneMode, FortuneStoryCard, UnlockResponse } from "@/models/types";
import { useAppStore } from "@/store/useAppStore";
import { DocumentHead, FortuneCardView } from "./FortuneCards";
import { LoginSheet } from "./LoginSheet";
import { Nyang, Say } from "./Nyang";
import { PaymentModal } from "./PaymentModal";
import { FullReportView, LockedCard, SectionCard } from "./ReportCards";
import { ShareButtons } from "./ShareButtons";
import { ShareUnlockPanel } from "./ShareUnlockPanel";
import { useToast } from "./Toast";

const TYPING_MS = 750;

/** 냥신's line before each section of the paid 감정서 (by section id). {p} is the ex. */
const INTROS: Record<FortuneMode, Record<string, string>> = {
  saju: {
    nature: "타고난 그릇 얘기다냥. 겉과 속이 다 적혀 있다냥.",
    money: "돈 얘기다냥. 들어오는 길과 새는 길이다냥 💰",
    work: "일 얘기다냥. 맞는 자리는 따로 있다냥.",
    love: "인연 얘기다냥.",
    health: "몸 얘기다냥. 가볍게 넘기지 마라냥.",
    people: "사람 얘기다냥. 귀인과 악연이다냥.",
    years: "올해와 내년이다냥. 해마다 짚어 주겠다냥 📅",
    luck: "마지막으로 개운법이다냥. 오늘부터 해라냥.",
  },
  daeun: {
    now: "지금 네가 서 있는 대운이다냥.",
    next: "다음 갈림길이다냥.",
    peak: "네 인생에서 제일 센 10년이다냥.",
    trough: "조심할 10년이다냥. 미리 알면 덜 다친다냥.",
    all: "전체 물줄기다냥.",
    seun: "앞으로 3년, 해마다 짚어 주겠다냥 📅",
    use: "마지막으로 대운 쓰는 법이다냥.",
  },
  reunion: {
    mind: "{p}의 속마음이다냥… 들을 준비 됐냥?",
    chance: "가능성, 냉정하게 말하겠다냥.",
    timing: "연락 날짜다냥. 꼭 적어 둬라냥 📅",
    first: "첫 문장이다냥. 토씨 하나도 중요하다냥.",
    dont: "이건 절대 하지 마라냥.",
    match: "두 사람 사주를 나란히 놓고 봤다냥.",
    after: "다시 만난 다음 얘기다냥.",
    letgo: "마지막으로… 놓아야 할 때다냥.",
  },
  spouse: {
    trait: "네 배우자, 어떤 사람인지부터 보자냥.",
    look: "얼굴과 분위기다냥.",
    job: "무슨 일 하는 사람인지 보자냥.",
    timing: "언제 만나는지 보자냥 📅",
    place: "어디서 만나는지 보자냥.",
    married: "결혼하면 이렇게 산다냥.",
    caution: "결혼 전에 이것만은 조심해라냥.",
    now: "지금 만나는 그 사람 얘기다냥.",
  },
};

const PAY_LABEL: Record<FortuneMode, string> = {
  saju: "📜 사주 감정서 전부 열기",
  daeun: "🌊 대운 감정서 전부 열기",
  reunion: "🔁 재회 감정서 전부 열기",
  spouse: "💍 배우자 감정서 전부 열기",
};

const LEAVE_LINE: Record<FortuneMode, string> = {
  saju: "잠깐냥! 돈 들어오는 해랑 개운법은 아직 안 말했다냥. 그냥 갈 거냥?",
  daeun: "잠깐냥! 네 인생 황금기가 몇 살인지 아직 안 말했다냥. 그냥 갈 거냥?",
  reunion: "잠깐냥! {p}한테 연락해도 되는 날짜, 아직 안 말했다냥. 그냥 갈 거냥?",
  spouse: "잠깐냥! 배우자를 만나는 해랑 계절, 아직 안 말했다냥. 그냥 갈 거냥?",
};

/** A stable 감정 번호 for this person × product (same on first view and when reopened from 내 점괘함). */
const docNo = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).slice(-6).toUpperCase().padStart(6, "0");
};


export function FortuneResultView() {
  const { fortune, report, level, input, inputHash, applyUnlock, reset, startInterview } = useAppStore();
  const { me: account, providers, meLoaded, setResumePay } = useAppStore();
  const [resumeAtLoad] = useState(() => useAppStore.getState().resumePay);
  const resumed = useRef(false);
  const [payOpen, setPayOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [payIntent, setPayIntent] = useState(false);
  const [shown, setShown] = useState(() => (level !== "none" || resumeAtLoad ? Number.MAX_SAFE_INTEGER : 1));
  const [typing, setTyping] = useState(level === "none" && !resumeAtLoad);
  const [leaveAsked, setLeaveAsked] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!payIntent) return;
    setPayIntent(false);
    if (!account && providers.length > 0) setLoginOpen(true);
    else setPayOpen(true);
  }, [payIntent, account, providers]);

  // Back from the login redirect: continue to the payment sheet.
  useEffect(() => {
    if (!resumeAtLoad || resumed.current || !meLoaded) return;
    resumed.current = true;
    setResumePay(false);
    if (level === "full") return;
    if (account) setPayOpen(true);
    else setLoginOpen(true);
  }, [resumeAtLoad, meLoaded, account, level, setResumePay]);

  const beats = fortune?.beats ?? [];
  const total = beats.length + 1; // + paywall
  const allShown = shown >= total;

  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => setTyping(false), TYPING_MS);
    return () => clearTimeout(t);
  }, [typing, shown]);

  useEffect(() => {
    if (typing || shown <= 1 || shown > total) return;
    document.getElementById(`beat-${shown - 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [typing, shown, total]);

  if (!fortune || !inputHash) return null;

  const mode = fortune.mode;
  const me = input.me.name;
  const p = input.partner.name || "그 사람";
  const P = (s: string) => s.replaceAll("{p}", p);
  const product = productOf(mode);
  const price = product.price;

  const advance = () => {
    sound().play("reveal");
    setShown((n) => n + 1);
    setTyping(true);
  };
  const showAll = () => {
    setShown(Number.MAX_SAFE_INTEGER);
    setTyping(false);
  };
  const onUnlocked = (u: UnlockResponse) => {
    applyUnlock(u);
    sound().play("chime");
    setPayOpen(false);
    setShown(Number.MAX_SAFE_INTEGER);
    toast.show(u.level === "full" ? (u.readingId ? "🐾 복채 잘 받았다냥! 내 점괘함에 보관해 뒀다냥" : "🐾 복채 잘 받았다냥!") : "🔓 하나는 공짜로 알려주겠다냥!");
    setTimeout(() => document.getElementById("paid-report")?.scrollIntoView({ behavior: "smooth" }), 250);
  };

  const shared = level === "share" ? report?.sections[0] : undefined;
  const lastBeat = beats[Math.min(shown, beats.length) - 1];
  const intros = Object.fromEntries(Object.entries(INTROS[mode]).map(([k, v]) => [k, P(v)]));
  const storyCard: FortuneStoryCard = fortune.story ?? {
    kind: "fortune",
    label: fortune.title,
    emoji: product.emoji,
    headline: product.name,
    sub: "냥신이 직접 짚은 감정서",
    meta: fortune.saju?.pillars.map((x) => x.hanja).join(" ") ?? "",
    slipLabel: "냥신 감정",
    slipText: product.pitch.split(" · ").slice(0, 3).join(" · "),
  };
  const others = (Object.keys(PRODUCTS) as (keyof typeof PRODUCTS)[]).filter((m) => m !== mode && m !== "solo" && m !== "couple") as FortuneMode[];

  return (
    <main className="flex-1 px-4 pb-10 pt-6">
      <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted">
        <Nyang mood="smug" size={28} /> {fortune.title}
      </div>

      <div className="space-y-5">
        {beats.slice(0, shown).map((b, i) => {
          const isTyping = typing && i === shown - 1;
          return (
            <section key={i} id={`beat-${i}`} className="scroll-mt-4 space-y-3">
              <Say mood={b.mood} typing={isTyping}>
                {b.say}
              </Say>
              {!isTyping && b.card && (
                <div className="fade-up">
                  <FortuneCardView card={b.card} saju={fortune.saju} name={me} />
                </div>
              )}
            </section>
          );
        })}

        {/* ── Paywall / 감정서 ── */}
        {allShown && (
          <section id={`beat-${beats.length}`} className="scroll-mt-4 space-y-4">
            {level === "full" && report ? (
              <div id="paid-report" className="scroll-mt-4 space-y-4">
                <Say mood="happy">복채 잘 받았다냥. 감정서 본문이다냥. 하나도 안 빼고 적었다냥 🐾</Say>
                <DocumentHead title={fortune.title} saju={fortune.saju} no={docNo(fortune.title + (fortune.saju?.pillars.map((x) => x.hanja).join("") ?? ""))} />
                <FullReportView report={report} intros={intros} />
              </div>
            ) : (
              <>
                <Say mood="smug" typing={typing}>
                  {fortune.paywall}
                </Say>
                {!typing && (
                  <div id="paid-report" className="fade-up scroll-mt-4">
                    <div className="space-y-3">
                      {fortune.locked.map((lp, i) =>
                        i === 0 && shared ? (
                          <SectionCard key={lp.id} icon={shared.icon} section={shared.section} />
                        ) : (
                          <LockedCard key={lp.id} preview={lp} compact onClick={() => setPayIntent(true)} />
                        ),
                      )}
                    </div>
                    <div className="mt-5 rounded-3xl border border-peach/30 bg-peach/5 p-5">
                      <p className="text-sm font-bold text-peach">📜 복채 {won(price)}이면 지금 바로 열리는 감정서</p>
                      <ul className="mt-3 space-y-2 text-sm">
                        {fortune.locked.map((lp) => (
                          <li key={lp.id} className="flex gap-2">
                            <span className="text-pink">✓</span>
                            <span>
                              {lp.title} <span className="text-muted">· {lp.count}개</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs text-muted">
                        총 {fortune.locked.reduce((n, l) => n + l.count, 0)}개 항목 · 결제 즉시 이 화면에서 바로 열려요 · 로그인하면 내 점괘함에 보관돼요
                      </p>
                    </div>
                    <div className="sticky bottom-4 z-10 mt-5">
                      <button onClick={() => setPayIntent(true)} className="btn-primary glow shine w-full py-4">
                        <span className="block text-[17px]">
                          {PAY_LABEL[mode]} · {won(price)}
                        </span>
                        <span className="block text-xs font-medium opacity-90">{price < 1000 ? "천 원도 안 되는 복채다냥" : "점집 복채의 10분의 1도 안 된다냥"}</span>
                      </button>
                    </div>
                    {level === "none" && <ShareUnlockPanel input={input} unlockTitle={fortune.locked[0].title} onUnlocked={onUnlocked} toast={toast.show} />}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>

      {/* ── Reveal controls ── */}
      {!allShown && (
        <div className="sticky bottom-4 z-20 mt-6">
          <button onClick={advance} disabled={typing} className="btn-primary w-full py-4 text-[16px]">
            {`${lastBeat?.next ?? "그래서?"} 👉`}
          </button>
          <div className="mt-2 flex items-center justify-between px-1">
            <button onClick={showAll} className="text-xs text-muted underline-offset-2 hover:underline">
              한 번에 다 보기
            </button>
            {level !== "full" && (
              <button onClick={() => setPayIntent(true)} className="text-xs font-bold text-peach">
                기다리기 싫다냥? 감정서 바로 열기 {won(price)} →
              </button>
            )}
          </div>
        </div>
      )}

      {allShown && !typing && (
        <>
          <ShareButtons teaser={storyCard} myName={me} partnerName={input.partner.name} toast={toast.show} />

          {level === "full" && (
            <section className="mt-10">
              <h2 className="mb-3 text-[18px]">🕯️ 다른 감정도 받아 볼래냥?</h2>
              <div className="space-y-2">
                {others.map((m) => (
                  <button
                    key={m}
                    onClick={() => startInterview({ mode: m, me: input.me.birthdate ? input.me : account?.profile })}
                    className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left active:scale-[0.98]"
                  >
                    <span className="text-3xl">{PRODUCTS[m].emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{PRODUCTS[m].name}</span>
                      <span className="mt-0.5 block text-xs text-muted">내 정보는 기억해 뒀다냥 · 기본 무료 · 전체 {won(PRODUCTS[m].price)}</span>
                    </span>
                    <span aria-hidden>→</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <button onClick={() => (level === "full" || leaveAsked ? reset() : setLeaveAsked(true))} className="mt-8 w-full rounded-2xl border border-line py-3.5 text-sm text-muted">
            🔄 처음으로
          </button>
          {leaveAsked && level !== "full" && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setLeaveAsked(false)}>
              <div className="fade-up w-full max-w-[480px] rounded-t-3xl bg-surface p-6 pb-8" onClick={(e) => e.stopPropagation()}>
                <Say mood="wow">{P(LEAVE_LINE[mode])}</Say>
                <button
                  onClick={() => {
                    setLeaveAsked(false);
                    setPayIntent(true);
                  }}
                  className="btn-primary mt-5 w-full py-4"
                >
                  {PAY_LABEL[mode]} · {won(price)}
                </button>
                <button onClick={reset} className="mt-2 w-full py-3 text-sm text-muted">
                  다음에 볼게요
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <LoginSheet
        open={loginOpen}
        forPay
        onClose={() => setLoginOpen(false)}
        onGuest={() => {
          setLoginOpen(false);
          setPayOpen(true);
        }}
      />
      <PaymentModal open={payOpen} input={input} inputHash={inputHash} onClose={() => setPayOpen(false)} onUnlocked={onUnlocked} />
      {toast.node}
    </main>
  );
}
