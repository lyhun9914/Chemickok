"use client";

import type { QuestionnaireInput, UnlockResponse } from "@/models/types";
import { paymentService } from "@/services/PaymentService";
import { shareService, siteUrl } from "@/services/shareService";

interface Props {
  input: QuestionnaireInput;
  /** title of the section that sharing unlocks */
  unlockTitle: string;
  onUnlocked: (u: UnlockResponse) => void;
  toast: (m: string) => void;
}

/** "친구에게 테스트 추천하고 무료로 보기" — sharing unlocks the first locked section for free. */
export function ShareUnlockPanel({ input, unlockTitle, onUnlocked, toast }: Props) {
  const share = async () => {
    const outcome = await shareService.shareLink({
      title: "냥신 연애 점집 🐾",
      description: "고양이 도사 냥신이 사주로 연애 봐주는데 소름 돋게 잘 맞아 😳 너도 해 봐!",
      url: siteUrl(),
    });
    if (outcome === "cancelled") return;
    if (outcome === "copied") toast("링크를 복사했어요! 친구에게 보내 주세요 💌");
    try {
      onUnlocked(await paymentService.unlockByShare(input));
    } catch (e) {
      toast(e instanceof Error ? e.message : "잠금 해제에 실패했어요");
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-peach/40 bg-peach/5 p-4">
      <p className="text-sm font-bold text-peach">🎁 친구 데려오면 하나는 공짜로 알려주겠다냥</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        테스트를 친구에게 공유하면 &lsquo;{unlockTitle}&rsquo;을 바로 열어 드려요.
      </p>
      <button
        onClick={share}
        className="mt-3 w-full rounded-xl border border-peach/50 py-3 text-sm font-bold text-peach active:scale-[0.98]"
      >
        친구에게 테스트 추천하고 무료로 보기
      </button>
    </div>
  );
}
