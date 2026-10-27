"use client";

import { useEffect, useRef, useState } from "react";
import { accountApi, api } from "@/services/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { Nyang } from "./Nyang";

const MIN_DURATION_MS = 4200;

export function LoadingScreen() {
  const { input, setTeaser, setScreen, setError, error } = useAppStore();
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const started = useRef(false);

  const solo = input.mode === "solo";
  const messages = [
    `흠… ${input.me.name}의 사주를 펼치는 중이다냥`,
    "일주(日柱)를 보고 있다냥… 오호?",
    "오행을 세어 보는 중이다냥. 하나, 둘…",
    "네 답변을 꿰뚫어 보는 중이다냥 👀",
    solo ? "너랑 찰떡인 놈을 찾는 중이다냥…" : `${input.partner.name}의 속마음을 엿보는 중이다냥… 🙊`,
    "…다 봤다냥. 각오는 됐냥?",
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
        // Logged in without saved 기본 정보: keep what was just typed so the next interview skips it.
        const { me, setMe } = useAppStore.getState();
        if (me && !me.profile && input.me.birthdate) {
          accountApi.saveProfile(input.me).then((r) => setMe({ ...me, profile: r.profile })).catch(() => null);
        }
        setTimeout(() => setTeaser(res.teaser, res.inputHash), 300);
      })
      .catch((e: Error) => setError(e.message));
  }, [input, setTeaser, setError]);

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <Nyang mood="wow" size={100} />
        <p className="mt-4 font-semibold">점괘가 흐려졌다냥… 다시 해 보자냥</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <button onClick={() => setScreen("form")} className="btn-primary mt-6 px-8 py-3">
          다시 시도하기
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center" aria-live="polite">
      <div className="relative mb-8">
        <div className="absolute inset-0 m-auto h-32 w-32 animate-ping rounded-full bg-pink/15" />
        <div className="wiggle relative">
          <Nyang mood={idx % 2 ? "wow" : "smug"} size={150} />
        </div>
        <div className="absolute -right-2 top-6 text-3xl">🔮</div>
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
