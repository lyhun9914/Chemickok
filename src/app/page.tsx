"use client";

import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Landing } from "@/components/Landing";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Questionnaire } from "@/components/Questionnaire";
import { ResultView } from "@/components/ResultView";
import { useAppStore } from "@/store/useAppStore";

export default function Home() {
  const screen = useAppStore((s) => s.screen);
  // The store rehydrates from sessionStorage on the client; render after mount to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  if (!mounted) return <div className="flex-1" />;

  return (
    <>
      {screen === "landing" && <Landing />}
      {screen === "form" && <Questionnaire />}
      {screen === "loading" && <LoadingScreen />}
      {screen === "result" && <ResultView />}
      {(screen === "landing" || screen === "result") && <Footer />}
    </>
  );
}
