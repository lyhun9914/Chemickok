"use client";

import { useEffect, useState } from "react";
import { Backdrop } from "@/components/Backdrop";
import { Footer } from "@/components/Footer";
import { FortuneResultView } from "@/components/FortuneResultView";
import { Landing } from "@/components/Landing";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ResetPasswordSheet } from "@/components/LoginSheet";
import { MyPage } from "@/components/MyPage";
import { Questionnaire } from "@/components/Questionnaire";
import { ResultView } from "@/components/ResultView";
import { SoundToggle } from "@/components/SoundToggle";
import { StoryScreen } from "@/components/StoryScreen";
import { isFortune } from "@/lib/config";
import { readHandoff } from "@/lib/handoff";
import { sound } from "@/lib/sound";
import { accountApi } from "@/services/apiClient";
import { useAppStore } from "@/store/useAppStore";

const LOGIN_NOTICE: Record<string, string> = {
  fail: "로그인에 실패했다냥. 잠시 후 다시 해 보라냥.",
  cancel: "로그인을 취소했다냥.",
  off: "지금은 로그인을 쓸 수 없다냥.",
};

export default function Home() {
  const screen = useAppStore((s) => s.screen);
  const loadMe = useAppStore((s) => s.loadMe);
  const fortune = useAppStore((s) => isFortune(s.input.mode));
  // The store rehydrates from sessionStorage on the client; render after mount to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Arrived with a result handed over from another device / browser (?r=…): re-read it here.
    const handoff = readHandoff(window.location.search);
    if (handoff) {
      window.history.replaceState(null, "", "/");
      if (handoff.kind === "input")
        useAppStore.setState({ input: handoff.input, screen: "loading", step: 0, teaser: null, fortune: null, report: null, level: "none", error: null });
      else useAppStore.setState({ story: { ...handoff.share, insta: handoff.then === "insta" }, screen: "story", error: null });
    }
    // Back from /api/auth/*/callback with ?login=ok|fail|cancel|off — read it once, then clean the URL.
    const q = new URLSearchParams(window.location.search);
    const login = q.get("login");
    const ref = q.get("ref");
    const reset = q.get("reset");
    if (login || ref || reset) window.history.replaceState(null, "", "/");
    const reason = q.get("reason");
    if (login && LOGIN_NOTICE[login]) setNotice(LOGIN_NOTICE[login] + (reason ? ` (원인: ${reason.slice(0, 40)})` : ""));
    const gift = Number(q.get("gift"));
    if (login === "ok" && gift > 0) setNotice(`🎁 가입 선물 ${gift}냥이 복주머니에 들어왔다냥!${q.get("invited") ? " (친구 초대 선물 포함)" : ""}`);
    else if (login === "ok" && q.get("new")) setNotice("어서 와라냥! 가입 완료다냥 🐾");
    else if (login === "ok" && q.get("via") === "reset") setNotice("비밀번호를 바꿨다냥. 로그인됐다냥 🔑");
    // Came through a friend's 초대 link: remembered until this visitor makes an account (read by the server then).
    if (ref && /^[\w-]{4,16}$/.test(ref)) document.cookie = `nyang_ref=${ref}; path=/; max-age=${30 * 86400}; samesite=lax`;
    if (reset) setResetToken(reset);
    // Left by /payment/success after a 충전.
    try {
      const n = sessionStorage.getItem("nyang-notice");
      if (n) {
        sessionStorage.removeItem("nyang-notice");
        setNotice(n);
      }
    } catch {
      /* storage unavailable */
    }

    loadMe().then(async (me) => {
      // First login: keep the 기본 정보 the user just typed in the interview.
      const { input, setMe } = useAppStore.getState();
      if (me && !me.profile && input.me.name && input.me.birthdate) {
        const r = await accountApi.saveProfile(input.me).catch(() => null);
        if (r) setMe({ ...me, profile: r.profile });
      }
    });
  }, [loadMe]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    // Room tone follows the screen: wind at the gate, the drone inside, a heartbeat while the reading is drawn.
    sound().setScene(screen === "landing" ? "gate" : screen === "form" ? "inside" : screen === "loading" ? "loading" : "result");
    // The camera sits right at the altar while reading the result.
    if (screen === "loading" || screen === "result" || screen === "my") document.documentElement.style.setProperty("--progress", "1");
  }, [screen]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!mounted) return <div className="flex-1" />;

  return (
    <>
      <Backdrop scene={screen === "landing" ? "gate" : "inside"} />
      {screen === "landing" && <Landing />}
      {screen === "form" && <Questionnaire />}
      {screen === "loading" && <LoadingScreen />}
      {screen === "result" && (fortune ? <FortuneResultView /> : <ResultView />)}
      {screen === "my" && <MyPage />}
      {screen === "story" && <StoryScreen />}
      {(screen === "landing" || screen === "result" || screen === "my" || screen === "story") && <Footer />}
      {/* Landing and the interview carry the toggle in their own top bar. */}
      {screen !== "landing" && screen !== "form" && <SoundToggle floating />}
      {resetToken && <ResetPasswordSheet token={resetToken} onClose={() => setResetToken(null)} />}
      {notice && (
        <div className="fade-up fixed inset-x-0 top-4 z-[60] mx-auto w-fit max-w-[90%] rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg shadow-lg">
          {notice}
        </div>
      )}
    </>
  );
}
