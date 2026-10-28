"use client";

import { useEffect, useState } from "react";
import { Backdrop } from "@/components/Backdrop";
import { Footer } from "@/components/Footer";
import { FortuneResultView } from "@/components/FortuneResultView";
import { Landing } from "@/components/Landing";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MyPage } from "@/components/MyPage";
import { Questionnaire } from "@/components/Questionnaire";
import { ResultView } from "@/components/ResultView";
import { StoryScreen } from "@/components/StoryScreen";
import { isFortune } from "@/lib/config";
import { readHandoff } from "@/lib/handoff";
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
    if (login) window.history.replaceState(null, "", "/");
    const reason = q.get("reason");
    if (login && LOGIN_NOTICE[login]) setNotice(LOGIN_NOTICE[login] + (reason ? ` (원인: ${reason.slice(0, 40)})` : ""));

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
      {notice && (
        <div className="fade-up fixed inset-x-0 top-4 z-[60] mx-auto w-fit max-w-[90%] rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg shadow-lg">
          {notice}
        </div>
      )}
    </>
  );
}
