"use client";

import { useState } from "react";
import { PRODUCTS, won } from "@/lib/config";
import type { Mode } from "@/models/types";
import { useAppStore } from "@/store/useAppStore";
import { enterThroughDoors } from "./Backdrop";
import { LoginSheet } from "./LoginSheet";
import { MiniGameSheet, type MiniGame } from "./MiniGames";
import { Nyang } from "./Nyang";
import { Talisman } from "./Talisman";

const PREVIEW_TYPES = [
  { emoji: "🚂", name: "풀악셀 폭주기관차" },
  { emoji: "📡", name: "츤데레 질투 레이더" },
  { emoji: "💣", name: "속으로 타는 시한폭탄" },
  { emoji: "🌙", name: "새벽 3시 감성 소설가" },
];

export function Landing() {
  const { setScreen, me, providers, startInterview } = useAppStore();
  const [game, setGame] = useState<MiniGame | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  // Saved 기본 정보 → the interview skips straight past name/birth. A product card also fixes the mode.
  const start = (mode?: Mode) => {
    setGame(null);
    enterThroughDoors(() => startInterview({ mode, me: me?.profile }));
  };

  return (
    <main className="enter-dark relative flex flex-1 flex-col px-5 pt-4">
      <Talisman className="absolute left-4 top-0" />
      <Talisman className="absolute right-6 top-24 opacity-70 [animation-delay:-2s]" />
      {providers.length > 0 && (
        <div className="flex justify-end">
          {me ? (
            <button onClick={() => setScreen("my")} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold">
              📜 내 점괘함
            </button>
          ) : (
            <button onClick={() => setLoginOpen(true)} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted">
              로그인
            </button>
          )}
        </div>
      )}
      <div className="fade-up text-center">
        <span className="font-ritual inline-block rounded-sm border border-violet/40 bg-[#1a0d0a] px-3 py-1 text-[13px] tracking-[0.2em] text-violet">
          神 골목 끝 점집 · 냥신 점괘 神
        </span>
        <div className="float mx-auto mt-6 w-fit">
          <Nyang mood="smug" size={150} />
        </div>
        <div className="relative mx-auto mt-2 w-fit max-w-[300px] rounded-2xl hanji px-4 py-3 text-[15px] font-medium text-[#2b1d16]">
          …들어왔으면 문부터 닫아라냥. 촛불 꺼진다냥. 네가 올 줄은 알고 있었다냥.
        </div>
        <h1 className="mt-6 text-[27px] font-extrabold leading-tight tracking-tight">
          네 연애가 매번 꼬이는 이유,
          <br />
          <span className="text-gradient">냥신은 이미 보고 있다냥</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          숨겨 둔 속마음, 말 못 한 미련, 인연이 오는 날까지
          <br />
          사주 여덟 글자 × MBTI × 연애 성향으로 다 읽힌다냥
        </p>
      </div>

      <button onClick={() => start()} className="btn-primary glow shine mt-8 w-full py-4 text-[17px]">
        🕯️ 점집 안으로 들어가기 (무료)
      </button>
      <p className="mt-3 text-center text-xs text-muted">⏱ 약 4분 · 회원가입 없음 · 기본 점괘 무료 · 거짓말은 통하지 않는다냥</p>

      <section className="fade-up mt-10" style={{ animationDelay: "0.1s" }}>
        <h2 className="mb-3 text-sm font-semibold text-muted">📜 오늘 펼칠 수 있는 점괘</h2>
        <div className="space-y-3">
          {(Object.keys(PRODUCTS) as Mode[]).map((m) => {
            const pr = PRODUCTS[m];
            return (
              <button
                key={m}
                onClick={() => start(m)}
                className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left active:scale-[0.98]"
              >
                <span className="text-4xl">{pr.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{pr.name}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">{pr.pitch}</span>
                  <span className="mt-1.5 block text-xs">
                    <span className="rounded-sm border border-violet/40 px-2 py-0.5 font-semibold text-violet">기본 무료</span>
                    <span className="ml-1.5 font-semibold text-peach">전체 풀이 {won(pr.price)}</span>
                  </span>
                </span>
                <span className="text-muted" aria-hidden>
                  →
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="fade-up mt-8" style={{ animationDelay: "0.15s" }}>
        <h2 className="mb-3 text-sm font-semibold text-muted">가볍게 한 점 🎴</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setGame("daily")} className="rounded-2xl border border-line bg-surface p-4 text-left active:scale-[0.98]">
            <div className="text-3xl">🔮</div>
            <div className="mt-2 text-sm font-bold">오늘의 연애운</div>
            <div className="text-xs text-muted">생일만 넣으면 끝 · 무료</div>
          </button>
          <button onClick={() => setGame("name")} className="rounded-2xl border border-line bg-surface p-4 text-left active:scale-[0.98]">
            <div className="text-3xl">✍️</div>
            <div className="mt-2 text-sm font-bold">이름 궁합</div>
            <div className="text-xs text-muted">그 시절 획수 궁합 · 무료</div>
          </button>
        </div>
      </section>

      <section className="fade-up mt-8" style={{ animationDelay: "0.25s" }}>
        <h2 className="mb-3 text-sm font-semibold text-muted">16가지 연애 팔자 중 너는?</h2>
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
          ["🕯️", "촛불 앞에서 냥신이 묻는 이상한 질문들… 다 이유가 있다"],
          ["😳", "\"이거 나 몰래 본 거 아니냥?\" 소름 돋는 일간 해석"],
          ["🃏", "카드를 뒤집으면 나오는 나의 연애 유형"],
          ["💘", "너랑 찰떡인 사람 vs 절대 만나면 안 되는 사람"],
          ["💌", "그 사람이 끝내 보내지 못한 편지까지 꺼내 준다"],
        ].map(([icon, text]) => (
          <div key={text} className="flex items-center gap-3 rounded-2xl border border-line bg-surface/60 px-4 py-3 text-sm">
            <span className="text-xl">{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </section>

      <MiniGameSheet game={game} onClose={() => setGame(null)} onStart={() => start()} />
      <LoginSheet open={loginOpen} onClose={() => setLoginOpen(false)} />
    </main>
  );
}
