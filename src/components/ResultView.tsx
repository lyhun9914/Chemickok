"use client";

import { useState } from "react";
import { PRODUCT } from "@/lib/config";
import type { FullReport, UnlockResponse } from "@/models/types";
import { useAppStore } from "@/store/useAppStore";
import { PaymentModal } from "./PaymentModal";
import {
  AxisBars,
  Card,
  FullReportView,
  HiddenMindCard,
  LockedCard,
  PersonalReading,
  SajuChart,
  ScoreRing,
} from "./ReportCards";
import { ShareButtons } from "./ShareButtons";
import { ShareUnlockPanel } from "./ShareUnlockPanel";
import { useToast } from "./Toast";

export function ResultView() {
  const { teaser, report, level, input, inputHash, applyUnlock, reset } = useAppStore();
  const [payOpen, setPayOpen] = useState(false);
  const toast = useToast();

  if (!teaser || !inputHash) return null;
  const me = input.me.name;
  const p = input.partner.name;

  const onUnlocked = (u: UnlockResponse) => {
    applyUnlock(u);
    setPayOpen(false);
    toast.show(u.level === "full" ? "🎉 전체 리포트가 열렸어요!" : "🔓 속마음 섹션이 열렸어요!");
    setTimeout(() => document.getElementById("couple-report")?.scrollIntoView({ behavior: "smooth" }), 200);
  };

  return (
    <main className="flex-1 px-5 pb-10 pt-8">
      {/* ── 1. 나의 유형 (free) ── */}
      <section className="fade-up text-center">
        <p className="text-sm text-muted">{me}님의 연애 유형은</p>
        <div className="float my-4 text-7xl">{teaser.myType.emoji}</div>
        <h1 className="text-[28px] font-extrabold leading-tight">
          <span className="text-gradient">{teaser.myType.name}</span>
        </h1>
        <p className="mt-2 text-[15px] text-muted">{teaser.myType.tagline}</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs">
          <span className="rounded-full bg-white/[0.06] px-3 py-1 font-bold tracking-[0.25em]">{teaser.myType.code}</span>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-300">
            응답 신뢰도 {teaser.reliability}%
          </span>
        </div>
      </section>

      <Card className="mt-6" delay={0.1}>
        <p className="mb-4 text-xs font-semibold text-muted">📐 연애 성향 4가지 축</p>
        <AxisBars axes={teaser.axes} />
      </Card>

      {teaser.saju && (
        <Card className="mt-4" delay={0.15}>
          <p className="mb-3 text-xs font-semibold text-muted">🀄 {me}님의 사주 원국</p>
          <SajuChart saju={teaser.saju} />
        </Card>
      )}

      <section className="mt-4">
        <PersonalReading teaser={teaser} myName={me} />
      </section>

      {/* ── 2. 두 사람 궁합 ── */}
      <section id="couple-report" className="mt-12 scroll-mt-6 text-center">
        <p className="text-sm text-muted">
          {me} 💞 {p}
        </p>
        <div className="my-5">
          <ScoreRing score={teaser.matchScore} />
        </div>
        <h2 className="text-[22px] font-extrabold leading-snug">
          <span className="text-gradient">{teaser.coupleTitle}</span>
        </h2>
        <p className="mt-4 rounded-2xl bg-white/[0.04] p-4 text-[15px] leading-relaxed">{teaser.teaserSummary}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-muted">{me}님</p>
            <p className="mt-1 text-2xl">{teaser.myType.emoji}</p>
            <p className="mt-1 text-sm font-bold leading-snug">{teaser.myType.name}</p>
            {teaser.saju && (
              <p className="mt-1 text-[11px] text-muted">
                {teaser.saju.dayMaster.hangul}
                {teaser.saju.dayMaster.hanja} 일간
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-muted">{p}님</p>
            <p className="mt-1 text-2xl">{teaser.partnerType.emoji}</p>
            <p className="mt-1 text-sm font-bold leading-snug">{teaser.partnerType.name}</p>
            {teaser.partnerDayMaster && <p className="mt-1 text-[11px] text-muted">{teaser.partnerDayMaster} 일간</p>}
          </div>
        </div>
      </section>

      {/* ── 3. 유료 섹션 ── */}
      <section className="mt-8">
        {level === "full" && report ? (
          <>
            <h2 className="mb-4 text-lg font-bold">📖 {me}님만을 위한 전체 리포트</h2>
            <FullReportView report={report as FullReport} />
          </>
        ) : (
          <>
            <div className="mb-3 rounded-3xl border border-line bg-surface p-5">
              <p className="text-2xl">💖</p>
              <p className="text-xs font-semibold text-muted">종합 궁합 & 연애 스타일</p>
              <p className="mt-1 text-[17px] font-bold leading-snug">{teaser.overallHeadline}</p>
            </div>
            <div className="space-y-3">
              {level === "share" && report?.hiddenMind ? (
                <HiddenMindCard section={report.hiddenMind} />
              ) : (
                <LockedCard kind="hiddenMind" onClick={() => setPayOpen(true)} />
              )}
              <LockedCard kind="chemistry" onClick={() => setPayOpen(true)} />
              <LockedCard kind="crisis" onClick={() => setPayOpen(true)} />
            </div>

            <div className="sticky bottom-4 z-10 mt-6">
              <button onClick={() => setPayOpen(true)} className="btn-primary glow shine w-full py-4">
                <span className="block text-[17px]">{PRODUCT.price.toLocaleString()}원으로 전체 리포트 보기</span>
                <span className="block text-xs font-medium opacity-90">☕ 카페 아메리카노보다 싸다!</span>
              </button>
            </div>
            {level === "none" && <ShareUnlockPanel input={input} onUnlocked={onUnlocked} toast={toast.show} />}
          </>
        )}
      </section>

      <ShareButtons teaser={teaser} myName={me} partnerName={p} toast={toast.show} />

      <button onClick={reset} className="mt-8 w-full rounded-2xl border border-line py-3.5 text-sm text-muted">
        🔄 다른 사람과 다시 테스트하기
      </button>

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
