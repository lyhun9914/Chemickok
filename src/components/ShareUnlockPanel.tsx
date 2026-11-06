"use client";

import { useEffect, useState } from "react";
import type { QuestionnaireInput, UnlockResponse } from "@/models/types";
import { paymentService } from "@/services/PaymentService";
import { isMobile, shareService, shareUrl } from "@/services/shareService";

interface Props {
  input: QuestionnaireInput;
  /** title of the section that sharing unlocks */
  unlockTitle: string;
  onUnlocked: (u: UnlockResponse) => void;
  toast: (m: string) => void;
}

type Step = "idle" | "choose" | "away" | "ready";

const MESSAGE = {
  title: "냥신 점괘 🕯️ 골목 끝 점집",
  description: "고양이 도사 냥신이 사주로 연애 봐주는데 소름 돋게 잘 맞아 😳 너도 들어가 봐!",
};

/**
 * "친구에게 냥신 점집 알려 주고 무료로 보기": first the sharing (카카오톡 · 다른 앱 · 링크 복사), and only after
 * coming back from it the button that opens the section. Nothing opens on the first tap.
 */
export function ShareUnlockPanel({ input, unlockTitle, onUnlocked, toast }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [kakao, setKakao] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCanShare(Boolean(navigator.share) && isMobile());
    shareService
      .prepareKakao()
      .then(() => setKakao(Boolean(window.Kakao?.isInitialized())))
      .catch(() => setKakao(false));
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
  const viaApps = async () => {
    const r = await shareService.shareLink({ ...MESSAGE, url: shareUrl() });
    if (r === "shared") setStep("ready");
    else if (r === "copied") {
      toast("링크 복사했다냥! 친구한테 붙여 넣어 보내라냥 💌");
      setStep("ready");
    }
  };
  const viaCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${MESSAGE.description}\n${shareUrl()}`);
      toast("링크 복사했다냥! 친구한테 붙여 넣어 보내라냥 💌");
      setStep("ready");
    } catch {
      toast("복사가 안 됐다냥… 다른 방법으로 보내 보라냥");
    }
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

      {step === "idle" && (
        <button onClick={() => setStep("choose")} className={`mt-3 border border-peach/50 text-peach ${choice}`}>
          친구에게 냥신 점집 알려 주기
        </button>
      )}

      {(step === "choose" || step === "away") && (
        <div className="mt-3 space-y-2">
          <p className="text-[12.5px] text-ink">어디로 알려 줄 거냥?</p>
          {kakao && (
            <button onClick={viaKakao} className={`bg-[#FEE500] text-[#191600] ${choice}`}>
              💬 카카오톡으로 보내기
            </button>
          )}
          {canShare && (
            <button onClick={viaApps} className={`border border-line text-ink ${choice}`}>
              📤 다른 앱으로 보내기 (인스타 DM · 문자 등)
            </button>
          )}
          <button onClick={viaCopy} className={`border border-line text-muted ${choice}`}>
            🔗 링크 복사해서 보내기
          </button>
          {step === "away" && <p className="text-center text-[12px] text-muted">보내고 돌아오면 바로 열어 준다냥 🐾</p>}
        </div>
      )}

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
