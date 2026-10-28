"use client";

import { useEffect, useState } from "react";
import { streakNow } from "@/lib/daily";
import { PRODUCTS, isFortune, won } from "@/lib/config";
import type { Mode } from "@/models/types";
import { useAppStore } from "@/store/useAppStore";
import { enterThroughDoors } from "./Backdrop";
import { LoginSheet } from "./LoginSheet";
import { MiniGameSheet, type MiniGame } from "./MiniGames";
import { Nyang } from "./Nyang";
import { SoundToggle } from "./SoundToggle";
import { Talisman } from "./Talisman";
import { TypeCarousel } from "./TypeCarousel";


const MENU: { title: string; sub: string; modes: Mode[] }[] = [
  { title: "💞 연애 점괘", sub: "그 사람, 그 인연, 다시 올 사람까지", modes: ["solo", "couple", "reunion", "spouse"] },
  { title: "📜 사주 · 운세 감정", sub: "만세력으로 원국을 세워 십성 · 용신 · 신살 · 대운까지 짚는 정통 감정서", modes: ["saju", "daeun"] },
];

const MINI: { id: MiniGame; emoji: string; name: string; sub: string; wide?: boolean }[] = [
  { id: "today", emoji: "📅", name: "오늘의 운세", sub: "총운 · 재물 · 연애 · 일 · 건강, 하루 한 번", wide: true },
  { id: "tarot", emoji: "🃏", name: "오늘의 타로", sub: "하루 한 장 · 무료" },
  { id: "zodiac", emoji: "🐾", name: "띠별 운세", sub: "12띠 오늘 일진 · 무료" },
  { id: "daily", emoji: "🔮", name: "오늘의 연애운", sub: "생일만 넣으면 끝 · 무료" },
  { id: "name", emoji: "✍️", name: "이름 궁합", sub: "그 시절 획수 궁합 · 무료" },
];

export function Landing() {
  const { setScreen, me, providers, startInterview } = useAppStore();
  const [game, setGame] = useState<MiniGame | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const k = new Date(Date.now() + 9 * 3600 * 1000);
  const todayLabel = `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`;
  // 출석 streak lives in this browser only; read after mount and whenever a mini game closes.
  const [{ streak, checkedToday }, setStreak] = useState({ streak: 0, checkedToday: false });
  useEffect(() => setStreak(streakNow()), [game]);

  // Saved 기본 정보 → the interview skips straight past name/birth. A product card also fixes the mode.
  const start = (mode?: Mode) => {
    setGame(null);
    enterThroughDoors(() => startInterview({ mode, me: me?.profile }));
  };

  return (
    <main className="enter-dark relative flex flex-1 flex-col px-5 pt-4">
      <Talisman className="absolute left-4 top-0" />
      <Talisman className="absolute right-6 top-24 opacity-70 [animation-delay:-2s]" />
      <div className="relative z-10 flex items-center justify-end gap-2">
        <SoundToggle />
        {providers.length > 0 &&
          (me ? (
            <button onClick={() => setScreen("my")} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold">
              📜 내 점괘함
            </button>
          ) : (
            <button onClick={() => setLoginOpen(true)} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted">
              로그인
            </button>
          ))}
      </div>
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

      <button
        onClick={() => setGame("today")}
        className="fade-up mt-6 flex w-full items-center gap-3 rounded-2xl border border-peach/40 bg-peach/5 px-4 py-3.5 text-left active:scale-[0.98]"
      >
        <span className="text-2xl">📅</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-peach">오늘의 운세 · {todayLabel}</span>
          <span className="block text-[13px] text-muted">
            {checkedToday ? `오늘 도장 완료 · 연속 ${streak}일째 🐾` : streak ? `연속 ${streak}일째 출석 중 · 오늘 도장 받아 가라냥` : "하루 한 번, 오늘의 일진을 짚어 준다냥"}
          </span>
        </span>
        <span className="text-muted" aria-hidden>
          →
        </span>
      </button>

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
        <h2 className="text-[17px]">🎴 가볍게 한 점 · 매일 무료</h2>
        <p className="mb-3 mt-1 text-[13.5px] text-muted">하루 한 번 들르면 출석 도장을 찍어 준다냥</p>
        <div className="grid grid-cols-2 gap-3">
          {MINI.map((g) => (
            <button
              key={g.id}
              onClick={() => setGame(g.id)}
              className={`rounded-2xl border bg-surface p-4 text-left active:scale-[0.98] ${g.wide ? "col-span-2 flex items-center gap-4 border-violet/40" : "border-line"}`}
            >
              <div className="text-3xl">{g.emoji}</div>
              <div className={g.wide ? "min-w-0 flex-1" : ""}>
                <div className={`font-bold ${g.wide ? "text-[16px]" : "mt-2 text-[15px]"}`}>{g.name}</div>
                <div className="mt-0.5 text-[13px] text-muted">{g.wide && streak ? `🐾 출석 ${streak}일째 · ${checkedToday ? "오늘 도장 완료" : "오늘 도장 받으러 가기"}` : g.sub}</div>
              </div>
              {g.wide && (
                <span className="text-muted" aria-hidden>
                  →
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="fade-up mt-8" style={{ animationDelay: "0.25s" }}>
        <h2 className="mb-3 text-sm font-semibold text-muted">16가지 연애 팔자 중 너는?</h2>
        <TypeCarousel />
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

      <MiniGameSheet game={game} onClose={() => setGame(null)} onStart={start} />
      <LoginSheet open={loginOpen} onClose={() => setLoginOpen(false)} />
    </main>
  );
}
