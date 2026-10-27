"use client";

import { useEffect, useState } from "react";
import { accountApi, type LoginProvider } from "@/services/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { Nyang } from "./Nyang";

const LAST_KEY = "nyang-last-login";

const BUTTONS: Record<LoginProvider, { label: string; cls: string; icon: React.ReactNode }> = {
  kakao: {
    label: "카카오로 시작하기",
    cls: "bg-[#FEE500] text-[#191600]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#191600" d="M12 3C6.48 3 2 6.5 2 10.82c0 2.8 1.86 5.25 4.66 6.63-.2.75-.74 2.72-.85 3.14-.13.52.19.51.4.37.17-.11 2.65-1.8 3.72-2.53.67.1 1.36.15 2.07.15 5.52 0 10-3.5 10-7.82S17.52 3 12 3Z" />
      </svg>
    ),
  },
  naver: {
    label: "네이버로 시작하기",
    cls: "bg-[#03C75A] text-white",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path fill="#fff" d="M16.27 12.84 7.46 0H0v24h7.73V11.16L16.54 24H24V0h-7.73z" />
      </svg>
    ),
  },
  google: {
    label: "구글로 시작하기",
    cls: "bg-white text-[#1f1f1f]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.1 3.57-5.18 3.57-8.81Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.3v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.3a12 12 0 0 0 0 10.76l3.99-3.1Z" />
        <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.3 6.62l3.99 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
      </svg>
    ),
  },
  dev: { label: "개발용 테스트 로그인", cls: "border border-dashed border-peach/50 text-peach", icon: <span>🧪</span> },
};

/**
 * Bottom sheet with the Kakao / Naver / Google buttons. `forPay` = shown when paying: the user is sent back to the
 * payment sheet after login, and may also pay without an account.
 */
export function LoginSheet({ open, onClose, forPay, onGuest }: { open: boolean; onClose: () => void; forPay?: boolean; onGuest?: () => void }) {
  const providers = useAppStore((s) => s.providers);
  const setResumePay = useAppStore((s) => s.setResumePay);
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLast(localStorage.getItem(LAST_KEY));
    } catch {
      /* storage unavailable */
    }
  }, [open]);

  if (!open) return null;

  const go = (p: LoginProvider) => {
    try {
      localStorage.setItem(LAST_KEY, p);
    } catch {
      /* ignore */
    }
    if (forPay) setResumePay(true);
    window.location.href = accountApi.loginUrl(p, forPay ? "pay" : "");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="fade-up w-full max-w-[480px] rounded-t-3xl bg-surface p-6 pb-8" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="로그인">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-center gap-3">
          <Nyang mood="smug" size={52} />
          <div>
            <p className="text-[17px] font-bold">{forPay ? "점괘를 보관하려면 3초 로그인" : "냥신 상담소 로그인"}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {forPay ? "결제한 점괘는 내 점괘함에 보관된다냥. 다음엔 생년월일도 안 물어본다냥." : "기본 정보를 기억해 두고, 산 점괘는 언제든 다시 볼 수 있다냥."}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          {providers.map((p) => (
            <div key={p} className="relative">
              {last === p && (
                <span className="absolute -top-2.5 left-4 z-10 rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-bg">최근에 이 방식으로 로그인했어요</span>
              )}
              <button onClick={() => go(p)} className={`flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-[15px] font-bold active:scale-[0.98] ${BUTTONS[p].cls}`}>
                <span className="flex w-6 justify-center">{BUTTONS[p].icon}</span>
                <span className="flex-1 text-left">{BUTTONS[p].label}</span>
                <span aria-hidden>→</span>
              </button>
            </div>
          ))}
        </div>

        {forPay && onGuest && (
          <button onClick={onGuest} className="mt-4 w-full py-2 text-center text-xs text-muted underline underline-offset-2">
            로그인 없이 결제할래 (결과가 보관되지 않아요)
          </button>
        )}
        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted/80">
          로그인하면 이용약관과 개인정보처리방침에 동의하는 것으로 봅니다.
        </p>
      </div>
    </div>
  );
}
