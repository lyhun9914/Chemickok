"use client";

import { useEffect, useRef, useState } from "react";
import { isFortune } from "@/lib/config";
import { josa } from "@/lib/josa";
import type { FortuneMode } from "@/models/types";
import { accountApi, api } from "@/services/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { Nyang } from "./Nyang";

const MIN_DURATION_MS = 4200;

const FORTUNE_LINES: Record<FortuneMode, (p: string) => string[]> = {
  saju: () => ["십성(十星)을 하나씩 짚는 중이다냥", "신강인지 신약인지… 용신이 보인다냥", "타고난 그릇의 크기가 보인다냥"],
  daeun: () => ["대운수를 세는 중이다냥", "10년마다 바뀌는 물줄기가 보인다냥", "지나온 대운과 네 답을 맞춰 보는 중이다냥"],
  reunion: (p) => [`${josa(p, "과/와")} 이어진 끈을 찾는 중이다냥`, `${p}의 지금 마음이 비친다냥… 🙊`, "연락해도 되는 날을 고르는 중이다냥"],
  spouse: () => ["배우자 자리(일지)를 펼치는 중이다냥", "배우자 별이 들어오는 해를 세는 중이다냥", "…네 짝의 얼굴이 비친다냥"],
};

export function LoadingScreen() {
  const { input, setTeaser, setScreen, setError, error } = useAppStore();
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const started = useRef(false);

  const solo = input.mode === "solo";
  const fortune = isFortune(input.mode);
  const messages = fortune
    ? [
        "…향을 피웠다냥. 숨 고르고 가만히 있어라냥",
        `만세력을 펼쳐 ${input.me.name}의 원국을 세우는 중이다냥`,
        ...FORTUNE_LINES[input.mode as FortuneMode](input.partner.name || "그 사람"),
        "…감정서를 다 적었다냥. 각오는 됐냥?",
      ]
    : [
    "…향을 피웠다냥. 숨 고르고 가만히 있어라냥",
    `${input.me.name}의 사주 여덟 글자를 펼치는 중이다냥`,
    "촛불이 흔들린다냥… 일주(日柱)에 뭔가 보인다냥",
    "네 답 사이에 숨긴 게 있다냥. 다 보인다냥 👁️",
    solo ? "…네 앞에 올 사람의 그림자가 보인다냥" : `${input.partner.name}의 속마음이 비친다냥… 🙊`,
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
    const request = isFortune(input.mode)
      ? api.fortune(input).then((res) => () => useAppStore.getState().setFortune(res.teaser, res.inputHash))
      : api.analyze(input).then((res) => () => setTeaser(res.teaser, res.inputHash));
    Promise.all([request, minWait])
      .then(([show]) => {
        setProgress(100);
        // Logged in without saved 기본 정보: keep what was just typed so the next interview skips it.
        const { me, setMe } = useAppStore.getState();
        if (me && !me.profile && input.me.birthdate) {
          accountApi.saveProfile(input.me).then((r) => setMe({ ...me, profile: r.profile })).catch(() => null);
        }
        setTimeout(show, 300);
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
        <div className="flicker absolute -right-3 top-4 text-3xl">🕯️</div>
      </div>
      <p key={idx} className="font-ritual fade-up min-h-[3.5rem] max-w-[300px] text-[17px] leading-relaxed">
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
