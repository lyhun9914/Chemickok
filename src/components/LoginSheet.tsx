"use client";

import { useEffect, useState } from "react";
import { WELCOME_COINS, nyang } from "@/lib/config";
import { useBack } from "@/lib/back";
import { inAppBrowser } from "@/lib/handoff";
import { accountApi, type LoginProvider } from "@/services/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { useSocialLabel } from "./CoinShop";
import { Nyang } from "./Nyang";

const LAST_KEY = "nyang-last-login";

const BUTTONS: Record<LoginProvider, { label: string; cls: string; icon: React.ReactNode }> = {
  kakao: {
    label: "카카오로 시작하기",
    cls: "bg-[#FEE500] text-[#191600]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="#191600"
          d="M12 3C6.48 3 2 6.5 2 10.82c0 2.8 1.86 5.25 4.66 6.63-.2.75-.74 2.72-.85 3.14-.13.52.19.51.4.37.17-.11 2.65-1.8 3.72-2.53.67.1 1.36.15 2.07.15 5.52 0 10-3.5 10-7.82S17.52 3 12 3Z"
        />
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
  email: { label: "이메일로 시작하기", cls: "border border-line bg-surface-2 text-ink", icon: <span aria-hidden>✉️</span> },
  dev: { label: "개발용 테스트 로그인", cls: "border border-dashed border-peach/50 text-peach", icon: <span>🧪</span> },
};

const fieldCls = "w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-pink/60";

/** 이메일 회원가입 / 로그인 / 비밀번호 찾기. Success reloads the page, the same way a social login comes back. */
function EmailForm({ forPay }: { forPay?: boolean }) {
  const setResumePay = useAppStore((s) => s.setResumePay);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const social = useSocialLabel();

  const strong = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  const ok = /^\S+@\S+\.\S+$/.test(email.trim()) && (mode === "forgot" || (mode === "login" ? password.length > 0 : strong && password === password2));
  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "forgot") {
        await accountApi.email({ action: "reset-request", email });
        setMsg({ ok: true, text: "가입한 이메일이면 재설정 링크를 보냈다냥. 메일함(스팸함도)을 확인해 줘라냥." });
      } else {
        await accountApi.email({ action: mode, email, password });
        if (forPay) setResumePay(true);
        window.location.href = `/?login=ok&via=email${mode === "signup" ? "&new=1" : ""}`;
        return;
      }
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  };

  return (
    <form
      className="mt-3 space-y-2.5 rounded-2xl border border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.04] p-1 text-[14px]">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setMsg(null);
            }}
            className={`rounded-lg py-2 font-semibold ${mode === m || (m === "login" && mode === "forgot") ? "bg-surface-2 text-ink" : "text-muted"}`}
          >
            {m === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>
      <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" className={fieldCls} />
      {mode !== "forgot" && (
        <input
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "비밀번호 (영문+숫자 8자 이상)" : "비밀번호"}
          className={fieldCls}
        />
      )}
      {mode === "signup" && (
        <>
          <input
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="비밀번호 한 번 더"
            className={fieldCls}
          />
          {password && !strong && <p className="text-[12px] text-pink">영문과 숫자를 섞어 8자 이상으로 해 줘라냥.</p>}
          {password2 && password !== password2 && <p className="text-[12px] text-pink">비밀번호가 서로 다르다냥.</p>}
        </>
      )}
      {msg && <p className={`text-[13px] ${msg.ok ? "text-peach" : "text-pink"}`}>{msg.text}</p>}
      <button type="submit" disabled={!ok || busy} className="btn-primary w-full py-3.5 text-[15px]">
        {busy ? "잠깐만…" : mode === "login" ? "로그인" : mode === "signup" ? "가입하고 시작하기" : "재설정 링크 받기"}
      </button>
      {mode === "login" && (
        <button type="button" onClick={() => setMode("forgot")} className="w-full pt-1 text-center text-[12px] text-muted underline underline-offset-2">
          비밀번호를 잊었어요
        </button>
      )}
      {mode === "signup" && WELCOME_COINS > 0 && (
        <p className="text-center text-[12px] leading-relaxed text-muted">가입 선물 {nyang(WELCOME_COINS)}은 {social} 가입에만 드려요.</p>
      )}
    </form>
  );
}

/**
 * Bottom sheet with the Kakao / Naver / Google buttons. `forPay` = shown when paying: the user is sent back to the
 * payment sheet after login, and may also pay without an account.
 */
export function LoginSheet({ open, onClose, forPay, onGuest }: { open: boolean; onClose: () => void; forPay?: boolean; onGuest?: () => void }) {
  const providers = useAppStore((s) => s.providers);
  const setResumePay = useAppStore((s) => s.setResumePay);
  const [last, setLast] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  useBack(open, onClose);
  // Google refuses to sign in inside app webviews (KakaoTalk, Instagram…), so it isn't offered there.
  const [webview, setWebview] = useState(false);
  useEffect(() => setWebview(inAppBrowser() !== null), []);

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
      <div
        className="fade-up max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-surface p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="로그인"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-center gap-3">
          <Nyang mood="smug" size={52} />
          <div>
            <p className="text-[17px] font-bold">{forPay ? "점괘를 보관하려면 3초 로그인" : "냥신 점집 로그인"}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {forPay ? "결제한 점괘는 내 점괘함에 보관된다냥. 다음엔 생년월일도 안 물어본다냥." : "기본 정보를 기억해 두고, 산 점괘는 언제든 다시 볼 수 있다냥."}
            </p>
            {WELCOME_COINS > 0 && providers.some((p) => p !== "email") && (
              <p className="mt-1.5 inline-block rounded-full bg-peach/15 px-2.5 py-0.5 text-[12px] font-bold text-peach">🎁 처음 가입하면 복채 {nyang(WELCOME_COINS)} 선물</p>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          {providers
            .filter((p) => !(p === "google" && webview))
            .map((p) => (
              <div key={p} className="relative">
                {last === p && (
                  <span className="absolute -top-2.5 left-4 z-10 rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-semibold text-bg">최근에 이 방식으로 로그인했어요</span>
                )}
                <button
                  onClick={() => (p === "email" ? setEmailOpen((v) => !v) : go(p))}
                  className={`flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-[15px] font-bold active:scale-[0.98] ${BUTTONS[p].cls}`}
                >
                  <span className="flex w-6 justify-center">{BUTTONS[p].icon}</span>
                  <span className="flex-1 text-left">{BUTTONS[p].label}</span>
                  <span aria-hidden>{p === "email" ? (emailOpen ? "▴" : "▾") : "→"}</span>
                </button>
                {p === "email" && emailOpen && <EmailForm forPay={forPay} />}
              </div>
            ))}
        </div>
        {webview && providers.includes("google") && (
          <p className="mt-3 text-center text-[12px] leading-relaxed text-muted">
            카톡·인스타 안에서는 구글 로그인이 막혀 있다냥. 구글로 하려면 오른쪽 위 메뉴에서 <b className="text-ink">다른 브라우저로 열기</b>를 눌러 줘라냥.
          </p>
        )}

        {forPay && onGuest && (
          <button onClick={onGuest} className="mt-4 w-full py-2 text-center text-xs text-muted underline underline-offset-2">
            로그인 없이 이 점괘만 바로 결제할래 (보관되지 않아요)
          </button>
        )}
        <p className="mt-4 text-center text-[12px] leading-relaxed text-muted/80">로그인하면 이용약관과 개인정보처리방침에 동의하는 것으로 봅니다.</p>
      </div>
    </div>
  );
}

/** Opened from the link in a 비밀번호 재설정 mail (/?reset=…): set a new password and come in logged in. */
export function ResetPasswordSheet({ token, onClose }: { token: string; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useBack(true, onClose);
  const strong = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await accountApi.email({ action: "reset", token, password });
      window.location.href = "/?login=ok&via=reset";
      return;
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="비밀번호 재설정"
        className="fade-up w-full max-w-[480px] space-y-3 rounded-t-3xl bg-surface p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (strong && password === password2 && !busy) submit();
        }}
      >
        <p className="text-lg font-bold">🔑 새 비밀번호 정하기</p>
        <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="새 비밀번호 (영문+숫자 8자 이상)" className={fieldCls} />
        <input type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="한 번 더" className={fieldCls} />
        {password && !strong && <p className="text-[12px] text-pink">영문과 숫자를 섞어 8자 이상으로 해 줘라냥.</p>}
        {password2 && password !== password2 && <p className="text-[12px] text-pink">비밀번호가 서로 다르다냥.</p>}
        {error && <p className="text-sm text-pink">{error}</p>}
        <button type="submit" disabled={!strong || password !== password2 || busy} className="btn-primary w-full py-3.5">
          {busy ? "바꾸는 중…" : "비밀번호 바꾸고 로그인"}
        </button>
      </form>
    </div>
  );
}
