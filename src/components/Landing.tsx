"use client";

import { useAppStore } from "@/store/useAppStore";

const PREVIEW_TYPES = [
  { emoji: "🚂", name: "풀악셀 폭주기관차" },
  { emoji: "📡", name: "츤데레 질투 레이더" },
  { emoji: "💣", name: "속으로 타는 시한폭탄" },
  { emoji: "🌙", name: "새벽 3시 감성 소설가" },
];

export function Landing() {
  const { setScreen, setStep } = useAppStore();

  const start = () => {
    setStep(0);
    setScreen("form");
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-10">
      <div className="fade-up text-center">
        <span className="inline-block rounded-full border border-pink/30 bg-pink/10 px-3 py-1 text-xs font-semibold text-pink">
          🔮 사주 × 연애 심리 리포트
        </span>
        <div className="float my-8 text-7xl" aria-hidden>
          💘
        </div>
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">
          내 상대방의 <span className="text-gradient">진짜 속마음</span>과
          <br />
          우리의 <span className="text-gradient">연애 폭탄 유형</span> 진단
        </h1>
        <p className="mt-4 text-[15px] text-muted">990원으로 알아보는 사주 × 연애 심리 &amp; 멘탈 케미 분석</p>
      </div>

      <button onClick={start} className="btn-primary glow shine mt-10 w-full py-4 text-[17px]">
        무료로 기본 케미 테스트 시작하기
      </button>
      <p className="mt-3 text-center text-xs text-muted">⏱ 3분 · 사주 원국 + 성향 20문항 · 기본 결과 무료</p>

      <section className="fade-up mt-12" style={{ animationDelay: "0.2s" }}>
        <h2 className="mb-3 text-sm font-semibold text-muted">16가지 연애 유형 중 나는?</h2>
        <div className="grid grid-cols-2 gap-3">
          {PREVIEW_TYPES.map((t) => (
            <div key={t.name} className="rounded-2xl border border-line bg-surface p-4">
              <div className="text-3xl">{t.emoji}</div>
              <div className="mt-2 text-sm font-bold">{t.name}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="fade-up mb-10 mt-8 space-y-3" style={{ animationDelay: "0.35s" }}>
        {[
          ["🀄", "생년월일시로 세우는 사주 원국 & 일간 해석"],
          ["📐", "4가지 축으로 보는 나의 연애 성향"],
          ["🔒", "상대방이 말하지 않는 진짜 속마음"],
          ["🔮", "이별 예방책 & 이번 달 연애 길일"],
        ].map(([icon, text]) => (
          <div key={text} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm">
            <span className="text-xl">{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
