"use client";

import { useState } from "react";
import { PRODUCTS, isFortune, won } from "@/lib/config";
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

const MENU: { title: string; sub: string; modes: Mode[] }[] = [
  { title: "💞 연애 점괘", sub: "그 사람, 그 인연, 다시 올 사람까지", modes: ["solo", "couple", "reunion", "spouse"] },
  { title: "📜 사주 · 운세 감정", sub: "만세력으로 원국을 세워 십성 · 용신 · 신살 · 대운까지 짚는 정통 감정서", modes: ["saju", "daeun"] },
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
          네 인연, 네 팔자, 네 앞날까지
          <br />
          <span className="text-gradient">냥신은 이미 보고 있다냥</span>
        </h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-muted">
          연애 · 궁합 · 재회 · 배우자 · 사주 · 대운
          <br />
          생년월일로 원국을 세우고, 면담으로 맞춰 본다냥
        </p>
      </div>

      <button onClick={() => start()} className="btn-primary glow shine mt-8 w-full py-4 text-[17px]">
        🕯️ 연애 점괘 바로 보기 (무료)
      </button>
      <button
        onClick={() => document.getElementById("menu-fortune")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className="mt-3 w-full rounded-2xl border border-violet/40 bg-surface/70 py-3.5 text-[15px] font-semibold text-peach active:scale-[0.98]"
      >
        📜 사주 · 대운 감정 보러 가기 ↓
      </button>
      <p className="mt-3 text-center text-[13px] text-muted">⏱ 약 3~4분 · 회원가입 없이 · 기본 점괘는 무료</p>

      {MENU.map((group, gi) => (
        <section key={group.title} id={gi ? "menu-fortune" : "menu-love"} className={`fade-up scroll-mt-4 ${gi ? "mt-8" : "mt-10"}`} style={{ animationDelay: `${0.1 + gi * 0.05}s` }}>
          <h2 className="text-[17px]">{group.title}</h2>
          <p className="mb-3 mt-1 text-[13.5px] leading-relaxed text-muted">{group.sub}</p>
          <div className="space-y-3">
            {(Object.keys(PRODUCTS) as Mode[])
              .filter((m) => group.modes.includes(m))
              .map((m) => {
                const pr = PRODUCTS[m];
                return (
                  <button
                    key={m}
                    onClick={() => start(m)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left active:scale-[0.98]"
                  >
                    <span className="text-4xl">{pr.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-bold">{pr.name}</span>
                      <span className="mt-1 block text-[13.5px] leading-relaxed text-muted">{pr.pitch}</span>
                      <span className="mt-1.5 block text-xs">
                        <span className="rounded-sm border border-violet/40 px-2 py-0.5 font-semibold text-violet">기본 무료</span>
                        <span className="ml-1.5 font-semibold text-peach">
                          {isFortune(m) ? "전체 감정서" : "전체 풀이"} {won(pr.price)}
                        </span>
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
      ))}

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
          ["📜", "원국 · 십성 · 용신 · 대운, 감정 근거까지 적어 주는 감정서"],
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
