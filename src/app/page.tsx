"use client";

import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Landing } from "@/components/Landing";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MyPage } from "@/components/MyPage";
import { Questionnaire } from "@/components/Questionnaire";
import { ResultView } from "@/components/ResultView";
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
  // The store rehydrates from sessionStorage on the client; render after mount to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Back from /api/auth/*/callback with ?login=ok|fail|cancel|off — read it once, then clean the URL.
    const q = new URLSearchParams(window.location.search);
    const login = q.get("login");
    if (login) window.history.replaceState(null, "", "/");
    if (login && LOGIN_NOTICE[login]) setNotice(LOGIN_NOTICE[login]);

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
  }, [screen]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  if (!mounted) return <div className="flex-1" />;

  return (
    <>
      {screen === "landing" && <Landing />}
      {screen === "form" && <Questionnaire />}
      {screen === "loading" && <LoadingScreen />}
      {screen === "result" && <ResultView />}
      {screen === "my" && <MyPage />}
      {(screen === "landing" || screen === "result" || screen === "my") && <Footer />}
      {notice && (
        <div className="fade-up fixed inset-x-0 top-4 z-[60] mx-auto w-fit max-w-[90%] rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg shadow-lg">
          {notice}
        </div>
      )}
    </>
  );
}
