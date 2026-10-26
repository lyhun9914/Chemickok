"use client";

import { useEffect, useMemo, useState } from "react";
import { PRODUCT } from "@/lib/config";
import { josa } from "@/lib/josa";
import type { UnlockResponse } from "@/models/types";
import { useAppStore } from "@/store/useAppStore";
import { FlipCard, Nyang, Say, type Mood } from "./Nyang";
import { PaymentModal } from "./PaymentModal";
import {
  Card,
  DayMasterCard,
  FullReportView,
  LockedCard,
  MatchCard,
  MbtiPairLine,
  QuoteCard,
  SajuChart,
  ScoreRing,
  SectionCard,
  TraitsCard,
  TwoFacesCard,
} from "./ReportCards";
import { ShareButtons } from "./ShareButtons";
import { ShareUnlockPanel } from "./ShareUnlockPanel";
import { useToast } from "./Toast";

interface Beat {
  say: string;
  mood: Mood;
  node?: React.ReactNode;
  /** label of the button that reveals the next beat */
  next: string;
  /** the next button stays disabled until the card is flipped */
  needsFlip?: boolean;
}

const TYPING_MS = 750;

export function ResultView() {
  const { teaser, report, level, input, inputHash, applyUnlock, reset } = useAppStore();
  const [payOpen, setPayOpen] = useState(false);
  const [flipped, setFlipped] = useState(level !== "none");
  // Paid / returning users see everything at once.
  const [shown, setShown] = useState(() => (level !== "none" ? Number.MAX_SAFE_INTEGER : 1));
  const [typing, setTyping] = useState(level === "none");
  const [leaveAsked, setLeaveAsked] = useState(false);
  const toast = useToast();

  const me = input.me.name;
  const p = input.partner.name;

  const beats = useMemo<Beat[]>(() => {
    if (!teaser) return [];
    const { personal, saju, couple, solo, myType } = teaser;
    const list: Beat[] = [{ say: `${me}… 흥, 생년월일 보니까 대충 알겠다냥.`, mood: "smug", next: "뭔데? 👀" }];
    if (saju) {
      list.push({
        say: `네 사주부터 펼쳐 보겠다냥. ${saju.animal}띠구냥.`,
        mood: "talk",
        node: (
          <Card>
            <p className="mb-3 text-xs font-semibold text-muted">🀄 {me}님의 사주 원국</p>
            <SajuChart saju={saju} />
          </Card>
        ),
        next: "그래서?",
      });
      list.push({
        say: `네 일간은 ${saju.dayMaster.hangul}${saju.dayMaster.hanja}, '${saju.dayMaster.image}'이다냥. 어디 보자…`,
        mood: "wow",
        node: <DayMasterCard personal={personal} />,
        next: "헐 맞아… 계속",
      });
    }
    list.push({
      say: "이제 진짜 너를 보겠다냥. 카드 한 장 뒤집어 봐라냥.",
      mood: "smug",
      node: (
        <FlipCard
          flipped={flipped}
          onFlip={() => setFlipped(true)}
          back={
            <div className="flex h-full flex-col items-center justify-center text-center text-white">
              <p className="text-xs text-white/80">{me}님의 연애 유형</p>
              <div className="my-3 text-7xl">{myType.emoji}</div>
              <p className="text-2xl font-extrabold leading-tight">{myType.name}</p>
              <p className="mt-2 text-sm text-white/85">{myType.tagline}</p>
              <p className="mt-4 rounded-full bg-black/25 px-3 py-1 text-xs font-bold tracking-[0.25em]">
                {[myType.code, teaser.match.myMbti].filter(Boolean).join(" · ")}
              </p>
            </div>
          }
        />
      ),
      next: "이게 나라고? 😳",
      needsFlip: true,
    });
    list.push({
      say: "겉이랑 속이 다르지? 냥신 눈엔 다 보인다냥.",
      mood: "smug",
      node: <TwoFacesCard personal={personal} myName={me} />,
      next: "어떻게 알았지…",
    });
    const hook = teaser.locked[solo ? 1 : 2];
    if (hook) {
      list.push({
        say: solo
          ? "…근데 너, 연애할 때마다 똑같은 실수 하나 하고 있다냥. 이건 좀 이따 말해 주겠다냥 🤐"
          : `…근데 너희 둘, 이대로 가면 크게 터질 순간이 하나 보인다냥. 이건 좀 이따 말해 주겠다냥 🤐`,
        mood: "wow",
        node: <LockedCard preview={hook} compact onClick={() => setPayOpen(true)} />,
        next: "뭔데 궁금하게… 계속",
      });
    }
    list.push({
      say: `응답 신뢰도 ${teaser.reliability}%. 솔직하게 답했구냥. 네 연애 성향, 하나씩 짚어 주겠다냥.`,
      mood: "talk",
      node: <TraitsCard teaser={teaser} myName={me} />,
      next: "더 말해 줘",
    });
    if (personal.quote) {
      list.push({
        say: `그리고 너… 이 질문에 '${personal.quote.answer}' 했지? 냥신은 이게 제일 마음에 걸린다냥.`,
        mood: "wow",
        node: <QuoteCard personal={personal} myName={me} />,
        next: "뜨끔…",
      });
    }
    if (solo) {
      list.push({
        say: "너랑 찰떡인 놈도 알려주겠다냥. 이런 사람 나타나면 놓치지 마라냥.",
        mood: "happy",
        node: <MatchCard match={teaser.match} myName={me} />,
        next: "이번 달 연애운은?",
      });
      list.push({
        say: "이번 달 연애운은…",
        mood: "talk",
        node: (
          <div className="text-center">
            <ScoreRing score={solo.loveLuck} label="이번 달 연애운" />
            <p className="mt-4 text-[19px] font-extrabold leading-snug">
              <span className="text-gradient">{solo.loveLuckHeadline}</span>
            </p>
          </div>
        ),
        next: "그래서 내 인연은 언제?",
      });
    }
    if (couple) {
      list.push({
        say: `자, 이제 ${josa(p, "이랑/랑")} 궁합이다냥. 두근두근하냥?`,
        mood: "smug",
        node: (
          <div className="text-center">
            <p className="text-sm text-muted">
              {me} 💞 {p}
            </p>
            <div className="my-4">
              <ScoreRing score={couple.matchScore} />
            </div>
            <p className="text-[21px] font-extrabold leading-snug">
              <span className="text-gradient">{couple.coupleTitle}</span>
            </p>
            <p className="mt-4 rounded-2xl bg-white/[0.04] p-4 text-[15px] leading-relaxed">{couple.teaserSummary}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-xs text-muted">{me}님</p>
                <p className="mt-1 text-2xl">{myType.emoji}</p>
                <p className="mt-1 text-sm font-bold leading-snug">{myType.name}</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-xs text-muted">{p}님</p>
                <p className="mt-1 text-2xl">{couple.partnerType.emoji}</p>
                <p className="mt-1 text-sm font-bold leading-snug">{couple.partnerType.name}</p>
                {couple.partnerDayMaster && <p className="mt-1 text-[11px] text-muted">{couple.partnerDayMaster} 일간</p>}
              </div>
            </div>
            {couple.mbti && <MbtiPairLine pair={couple.mbti} />}
          </div>
        ),
        next: `${p}의 속마음은?`,
      });
    }
    return list;
  }, [teaser, me, p, flipped]);

  const total = beats.length + 1; // + paywall beat
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

  if (!teaser || !inputHash) return null;

  const advance = () => {
    setShown((n) => n + 1);
    setTyping(true);
  };
  const showAll = () => {
    setFlipped(true);
    setShown(Number.MAX_SAFE_INTEGER);
    setTyping(false);
  };

  const onUnlocked = (u: UnlockResponse) => {
    applyUnlock(u);
    setPayOpen(false);
    setFlipped(true);
    setShown(Number.MAX_SAFE_INTEGER);
    toast.show(u.level === "full" ? "🐾 복채 잘 받았다냥!" : "🔓 하나는 공짜로 알려주겠다냥!");
    setTimeout(() => document.getElementById("paid-report")?.scrollIntoView({ behavior: "smooth" }), 250);
  };

  const shared = level === "share" ? report?.sections[0] : undefined;
  const payLabel = teaser.solo ? "🔓 내 연애 팔자 전부 열기" : `🔓 ${p}의 속마음 지금 열기`;
  const lastBeat = beats[Math.min(shown, beats.length) - 1];
  const nextDisabled = typing || (lastBeat?.needsFlip && !flipped);

  const intros: Record<string, string> = {
    overall: "종합부터 말해 주겠다냥.",
    hiddenMind: `${josa(p, "이/가")} 말 안 한 속마음이다냥… 들을 준비 됐냥?`,
    chemistry: "이건 둘만 봐라냥 🙈",
    crisis: "여기 조심해야 할 순간들이다냥. 진지하게 읽어라냥.",
    prescriptions: "고민별 처방전이다냥. 쓴 약일수록 잘 듣는다냥.",
    match: "너랑 맞는 사람, 피해야 할 사람 자세히 알려주겠다냥.",
    pattern: "네가 매번 하는 실수다냥. 뜨끔하지?",
    luck: "마지막으로 이번 달 개운법이다냥. 날짜 꼭 기억해라냥 📅",
  };

  return (
    <main className="flex-1 px-4 pb-10 pt-6">
      <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted">
        <Nyang mood="smug" size={28} /> 냥신의 연애 점괘 · {me}님
      </div>

      <div className="space-y-5">
        {beats.slice(0, shown).map((b, i) => {
          const isTyping = typing && i === shown - 1;
          return (
            <section key={i} id={`beat-${i}`} className="scroll-mt-4 space-y-3">
              <Say mood={b.mood} typing={isTyping}>
                {b.say}
              </Say>
              {!isTyping && b.node && <div className="fade-up">{b.node}</div>}
            </section>
          );
        })}

        {/* ── Paywall beat ── */}
        {allShown && (
          <section id={`beat-${beats.length}`} className="scroll-mt-4 space-y-4">
            {level === "full" && report ? (
              <div id="paid-report" className="scroll-mt-4 space-y-4">
                <Say mood="happy">복채 잘 받았다냥. 약속대로 다 말해 주겠다냥 🐾</Say>
                <FullReportView report={report} intros={intros} />
              </div>
            ) : (
              <>
                <Say mood="smug" typing={typing}>
                  {teaser.solo
                    ? `…여기서부터가 진짜다냥. ${josa(me, "이/가")} 연애를 매번 망치는 이유랑, 이번 달 인연이 들어오는 날짜까지 냥신 눈엔 다 보인다냥. 듣고 갈래, 모르고 갈래? 😼`
                    : `…여기서부터가 진짜다냥. ${josa(p, "이/가")} ${me}한테 끝내 말 못 한 한마디, 냥신은 이미 봤다냥. 듣고 갈래, 모르고 갈래? 😼`}
                </Say>
                {!typing && (
                  <div id="paid-report" className="fade-up scroll-mt-4">
                    {teaser.couple && (
                      <div className="mb-3 rounded-3xl border border-line bg-surface p-5">
                        <p className="text-xs font-semibold text-muted">💖 종합 궁합 & 연애 스타일</p>
                        <p className="mt-1 text-[17px] font-bold leading-snug">{teaser.couple.overallHeadline}</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      {teaser.locked.map((lp, i) =>
                        i === 0 && shared ? (
                          <SectionCard key={lp.id} icon={shared.icon} section={shared.section} />
                        ) : (
                          <LockedCard key={lp.id} preview={lp} onClick={() => setPayOpen(true)} />
                        ),
                      )}
                    </div>
                    <div className="mt-5 rounded-3xl border border-peach/30 bg-peach/5 p-5">
                      <p className="text-sm font-bold text-peach">🐾 복채 {PRODUCT.price.toLocaleString()}원이면 지금 바로 열리는 것</p>
                      <ul className="mt-3 space-y-2 text-sm">
                        {teaser.locked.map((lp) => (
                          <li key={lp.id} className="flex gap-2">
                            <span className="text-pink">✓</span>
                            <span>
                              {lp.title} <span className="text-muted">· {lp.count}개</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs text-muted">
                        총 {teaser.locked.reduce((n, l) => n + l.count, 0)}개의 분석 · 결제 즉시 이 화면에서 바로 열려요
                      </p>
                    </div>
                    <div className="sticky bottom-4 z-10 mt-5">
                      <button onClick={() => setPayOpen(true)} className="btn-primary glow shine w-full py-4">
                        <span className="block text-[17px]">{payLabel} · {PRODUCT.price.toLocaleString()}원</span>
                        <span className="block text-xs font-medium opacity-90">☕ 커피 한 잔보다 싼 복채다냥</span>
                      </button>
                    </div>
                    {level === "none" && (
                      <ShareUnlockPanel input={input} unlockTitle={teaser.locked[0].title} onUnlocked={onUnlocked} toast={toast.show} />
                    )}
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
          <button onClick={advance} disabled={nextDisabled} className="btn-primary w-full py-4 text-[16px]">
            {lastBeat?.needsFlip && !flipped ? "👆 먼저 카드를 뒤집어라냥" : `${lastBeat?.next ?? "그래서?"} 👉`}
          </button>
          <div className="mt-2 flex items-center justify-between px-1">
            <button onClick={showAll} className="text-xs text-muted underline-offset-2 hover:underline">
              한 번에 다 보기
            </button>
            {level !== "full" && (
              <button onClick={() => setPayOpen(true)} className="text-xs font-bold text-peach">
                기다리기 싫다냥? 바로 전부 열기 990원 →
              </button>
            )}
          </div>
        </div>
      )}

      {allShown && !typing && (
        <>
          <ShareButtons teaser={teaser} myName={me} partnerName={p} toast={toast.show} />
          <button
            onClick={() => (level === "full" || leaveAsked ? reset() : setLeaveAsked(true))}
            className="mt-8 w-full rounded-2xl border border-line py-3.5 text-sm text-muted"
          >
            🔄 다른 사람 점괘도 보기
          </button>
          {leaveAsked && level !== "full" && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setLeaveAsked(false)}>
              <div className="fade-up w-full max-w-[480px] rounded-t-3xl bg-surface p-6 pb-8" onClick={(e) => e.stopPropagation()}>
                <Say mood="wow">
                  {teaser.solo
                    ? "잠깐냥! 제일 중요한 얘기는 아직 안 했다냥. 이번 달 인연 오는 날짜, 그냥 두고 갈 거냥?"
                    : `잠깐냥! ${josa(p, "이/가")} 끝내 말 못 한 속마음, 아직 안 봤다냥. 그래도 갈 거냥?`}
                </Say>
                <button
                  onClick={() => {
                    setLeaveAsked(false);
                    setPayOpen(true);
                  }}
                  className="btn-primary mt-5 w-full py-4"
                >
                  {payLabel} · 990원
                </button>
                <button onClick={reset} className="mt-2 w-full py-3 text-sm text-muted">
                  다음에 볼게요
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <PaymentModal
        open={payOpen}
        input={input}
        inputHash={inputHash}
        onClose={() => setPayOpen(false)}
        onUnlocked={onUnlocked}
      />
      {toast.node}
    </main>
  );
}
