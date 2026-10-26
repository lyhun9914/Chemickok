"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { MiniGameSheet, type MiniGame } from "./MiniGames";
import { Nyang } from "./Nyang";

const PREVIEW_TYPES = [
  { emoji: "🚂", name: "풀악셀 폭주기관차" },
  { emoji: "📡", name: "츤데레 질투 레이더" },
  { emoji: "💣", name: "속으로 타는 시한폭탄" },
  { emoji: "🌙", name: "새벽 3시 감성 소설가" },
];

export function Landing() {
  const { setScreen, setStep } = useAppStore();
  const [game, setGame] = useState<MiniGame | null>(null);

  const start = () => {
    setGame(null);
    setStep(0);
    setScreen("form");
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-8">
      <div className="fade-up text-center">
        <span className="inline-block rounded-full border border-pink/30 bg-pink/10 px-3 py-1 text-xs font-semibold text-pink">
          🐾 고양이 도사의 연애 점집
        </span>
        <div className="float mx-auto mt-6 w-fit">
          <Nyang mood="smug" size={150} />
        </div>
        <div className="relative mx-auto mt-2 w-fit max-w-[300px] rounded-2xl bg-[#fff6ec] px-4 py-3 text-[15px] font-medium text-[#2b1d16]">
          흥, 또 연애 고민이냥? 됐고 생년월일이나 내놔라냥. …뭐, 들어는 줄게.
        </div>
        <h1 className="mt-6 text-[27px] font-extrabold leading-tight tracking-tight">
          네 연애가 매번 꼬이는 이유,
          <br />
          <span className="text-gradient">냥신은 3분이면 안다냥</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          그 사람 속마음부터 이번 달 인연 오는 날짜까지
          <br />
          사주 × MBTI × 연애 성향 · 솔로도 커플도
        </p>
      </div>

      <button onClick={start} className="btn-primary glow shine mt-8 w-full py-4 text-[17px]">
        무료로 내 연애 팔자 보기 🐾
      </button>
      <p className="mt-3 text-center text-xs text-muted">⏱ 2~3분 · 회원가입 없음 · 기본 점괘 무료</p>

      <section className="fade-up mt-10" style={{ animationDelay: "0.15s" }}>
        <h2 className="mb-3 text-sm font-semibold text-muted">심심할 땐 10초 컷 🎲</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setGame("daily")} className="rounded-2xl border border-line bg-surface p-4 text-left active:scale-[0.98]">
            <div className="text-3xl">🔮</div>
            <div className="mt-2 text-sm font-bold">오늘의 연애운</div>
            <div className="text-xs text-muted">생일만 넣으면 끝</div>
          </button>
          <button onClick={() => setGame("name")} className="rounded-2xl border border-line bg-surface p-4 text-left active:scale-[0.98]">
            <div className="text-3xl">✍️</div>
            <div className="mt-2 text-sm font-bold">이름 궁합</div>
            <div className="text-xs text-muted">그 시절 획수 궁합</div>
          </button>
        </div>
      </section>

      <section className="fade-up mt-8" style={{ animationDelay: "0.25s" }}>
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
          ["😳", "\"이거 나 몰래 본 거 아니냥?\" 소름 돋는 일간 해석"],
          ["🃏", "카드를 뒤집으면 나오는 나의 연애 유형"],
          ["💘", "너랑 찰떡인 사람 vs 절대 만나면 안 되는 사람"],
          ["🔒", "그 사람이 끝내 말 못 한 속마음까지"],
        ].map(([icon, text]) => (
          <div key={text} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm">
            <span className="text-xl">{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </section>

      <MiniGameSheet game={game} onClose={() => setGame(null)} onStart={start} />
    </main>
  );
}
