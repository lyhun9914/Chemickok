"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/services/apiClient";
import { useAppStore } from "@/store/useAppStore";

const MIN_DURATION_MS = 4200;

export function LoadingScreen() {
  const { input, setTeaser, setScreen, setError, error } = useAppStore();
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const started = useRef(false);

  const solo = input.mode === "solo";
  const messages = [
    `${input.me.name}님의 생년월일로 사주 원국(原局)을 세우는 중...`,
    "일주(日柱)와 오행 분포를 계산하는 중...",
    "응답 일관성을 검증하는 중...",
    `${input.me.name}님의 연애 성향 4가지 축을 분석하는 중...`,
    solo ? `${input.me.name}님과 찰떡인 유형·MBTI·띠를 찾는 중... 💘` : `${input.partner.name}님이 말하지 않은 속마음을 읽는 중... 👀`,
    solo ? "이번 달 연애운과 인연 길일을 계산하는 중... 🔮" : "두 사람의 궁합 리포트를 정리하는 중...",
  ];

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => Math.min(i + 1, messages.length - 1)), 750);
    const p = setInterval(() => setProgress((v) => v + (96 - v) * 0.07), 110);
    return () => {
      clearInterval(t);
      clearInterval(p);
    };
  }, [messages.length]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const minWait = new Promise((r) => setTimeout(r, MIN_DURATION_MS));
    Promise.all([api.analyze(input), minWait])
      .then(([res]) => {
        setProgress(100);
        setTimeout(() => setTeaser(res.teaser, res.inputHash), 300);
      })
      .catch((e: Error) => setError(e.message));
  }, [input, setTeaser, setError]);

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl">😵</div>
        <p className="mt-4 font-semibold">분석 중 문제가 생겼어요</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <button onClick={() => setScreen("form")} className="btn-primary mt-6 px-8 py-3">
          다시 시도하기
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center" aria-live="polite">
      <div className="relative mb-10">
        <div className="absolute inset-0 animate-ping rounded-full bg-pink/20" />
        <div className="heartbeat relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-pink to-violet text-5xl">
          🔮
        </div>
      </div>
      <p key={idx} className="fade-up min-h-[3.5rem] max-w-[300px] text-[15px] font-medium leading-relaxed">
        {messages[idx]}
      </p>
      <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink to-violet transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted">{Math.round(progress)}%</p>
    </main>
  );
}
