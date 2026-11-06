"use client";

import { useEffect, useState } from "react";
import type { QuestionnaireInput, UnlockResponse } from "@/models/types";
import { paymentService } from "@/services/PaymentService";
import { shareService, shareUrl } from "@/services/shareService";

interface Props {
  input: QuestionnaireInput;
  /** title of the section that sharing unlocks */
  unlockTitle: string;
  onUnlocked: (u: UnlockResponse) => void;
  toast: (m: string) => void;
}

type Step = "idle" | "away" | "ready";

const MESSAGE = {
  title: "냥신 점괘 🕯️ 골목 끝 점집",
  description: "고양이 도사 냥신이 사주로 연애 봐주는데 소름 돋게 잘 맞아 😳 너도 들어가 봐!",
};

/**
 * "친구에게 냥신 점집 알려 주고 무료로 보기": KakaoTalk only. First the KakaoTalk share, and only after coming back
 * from it the button that opens the section. Nothing opens on the first tap.
 */
export function ShareUnlockPanel({ input, unlockTitle, onUnlocked, toast }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [kakao, setKakao] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const loadKakao = () =>
    shareService
      .prepareKakao()
      .then(() => setKakao(Boolean(window.Kakao?.isInitialized())))
      .catch(() => setKakao(false));
  useEffect(() => {
    loadKakao();
  }, []);

  // Back from the KakaoTalk picker (another app on phones, a popup on PC): the unlock button appears.
  useEffect(() => {
    if (step !== "away") return;
    const back = () => {
      if (document.visibilityState === "visible") setStep("ready");
    };
    let left = false;
    const leave = () => (left = true);
    const focus = () => left && setStep("ready");
    document.addEventListener("visibilitychange", back);
    window.addEventListener("blur", leave);
    window.addEventListener("focus", focus);
    // if the picker opened in-page (nothing to come back from), don't leave the button hidden for ever
    const t = setTimeout(() => setStep((s) => (s === "away" ? "ready" : s)), 8000);
    return () => {
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", focus);
      clearTimeout(t);
    };
  }, [step]);

  const viaKakao = () => {
    shareService.shareKakao({ ...MESSAGE, url: shareUrl() });
    setStep("away");
  };
  const open = async () => {
    setBusy(true);
    try {
      onUnlocked(await paymentService.unlockByShare(input));
    } catch (e) {
      toast(e instanceof Error ? e.message : "잠금 해제에 실패했다냥… 다시 해 보라냥");
    }
    setBusy(false);
  };

  const choice = "w-full rounded-xl py-3 text-sm font-bold active:scale-[0.98]";
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-peach/40 bg-peach/5 p-4">
      <p className="text-sm font-bold text-peach">🎁 친구 데려오면 하나는 공짜로 알려주겠다냥</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        친구한테 냥신 점집을 공유하면 &lsquo;{unlockTitle}&rsquo; 하나는 공짜로 알려 주겠다냥.
      </p>

      {(step === "idle" || step === "away") &&
        (kakao === false ? (
          <div className="mt-3 space-y-2">
            <p className="text-[12.5px] leading-relaxed text-muted">카카오톡을 불러오지 못했다냥. 카카오톡이 열리는 브라우저에서 다시 해 보라냥.</p>
            <button onClick={loadKakao} className={`border border-line text-muted ${choice}`}>
              다시 불러오기
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <button onClick={viaKakao} disabled={!kakao} className={`bg-[#FEE500] text-[#191600] disabled:opacity-60 ${choice}`}>
              {kakao ? "💬 카카오톡으로 친구에게 알려 주기" : "카카오톡 준비 중…"}
            </button>
            {step === "away" && <p className="text-center text-[12px] text-muted">카톡으로 보내고 돌아오면 바로 열어 준다냥 🐾</p>}
          </div>
        ))}

      {step === "ready" && (
        <div className="mt-3 space-y-2">
          <p className="text-[12.5px] text-ink">✅ 알려 줘서 고맙다냥! 약속대로 하나 풀어 주겠다냥.</p>
          <button onClick={open} disabled={busy} className={`btn-primary ${choice}`}>
            {busy ? "냥신이 봉인 푸는 중…" : `🔓 '${unlockTitle}' 무료로 열기`}
          </button>
        </div>
      )}
    </div>
  );
}
