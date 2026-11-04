"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/track";
import { useAppStore } from "@/store/useAppStore";

/** Errors that say nothing about the app: a dropped connection, an extension, the browser's own noise. */
const NOISE = /ResizeObserver loop|^Script error\.?$|Failed to fetch|Load failed|NetworkError|network error|AbortError|aborted|The user aborted|cancelled|canceled|Non-Error promise rejection/i;
const FOREIGN = /(chrome|moz|safari(-web)?)-extension:\/\//;

const stackOf = (e: unknown) => (e instanceof Error && e.stack ? e.stack.split("\n").slice(0, 8).join("\n") : undefined);

/** Reports errors in the page (and, through React 19, render errors) to the 관리자 오류 기록. Renders nothing. */
export function ErrorReporter() {
  useEffect(() => {
    const w = window as { __nyangScreen?: string };
    w.__nyangScreen = useAppStore.getState().screen;
    const unsub = useAppStore.subscribe((s) => {
      w.__nyangScreen = s.screen;
    });
    const onError = (e: ErrorEvent) => {
      const message = e.message || (e.error instanceof Error ? e.error.message : "");
      if (!message || NOISE.test(message) || FOREIGN.test(e.filename ?? "") || FOREIGN.test(stackOf(e.error) ?? "")) return;
      reportClientError("client", message, stackOf(e.error) ?? (e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined));
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const message = e.reason instanceof Error ? e.reason.message : typeof e.reason === "string" ? e.reason : "";
      if (!message || NOISE.test(message) || FOREIGN.test(stackOf(e.reason) ?? "")) return;
      reportClientError("client", message, stackOf(e.reason));
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      unsub();
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
