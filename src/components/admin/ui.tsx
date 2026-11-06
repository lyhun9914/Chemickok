"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

export async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { ...init, headers: { "content-type": "application/json" }, cache: "no-store" });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error ?? `오류 (${r.status})`);
  return body as T;
}

export const won = (n: unknown) => `${Number(n ?? 0).toLocaleString("ko-KR")}원`;
export const num = (n: unknown) => Number(n ?? 0).toLocaleString("ko-KR");
export const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" });
export const PROVIDER: Record<string, string> = { kakao: "카카오", naver: "네이버", google: "구글", email: "이메일", dev: "테스트" };

export const box = "rounded-2xl border border-line bg-surface p-4";
export const input = "w-full rounded-xl border border-line bg-black/30 px-3 py-2.5 text-[15px] outline-none focus:border-peach disabled:opacity-50";
export const small = "w-full rounded-lg border border-line bg-black/30 px-2.5 py-1.5 text-[14px] outline-none focus:border-peach disabled:opacity-50";
export const ghost = "rounded-xl border border-line px-3 py-2 text-[13px] text-muted active:scale-[0.98] disabled:opacity-50";

export function Section({ title, sub, right, children, className = "" }: { title: string; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${box} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold">{title}</h2>
          {sub && <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{sub}</p>}
        </div>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Note({ tone = "info", children }: { tone?: "info" | "warn" | "ok" | "error"; children: ReactNode }) {
  const c = { info: "bg-white/5 text-muted", warn: "bg-peach/10 text-peach", ok: "bg-emerald-500/10 text-emerald-300", error: "bg-pink/10 text-pink" }[tone];
  return <p className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed ${c}`}>{children}</p>;
}

export interface ConfirmOpts {
  title: string;
  rows?: [string, ReactNode][];
  message?: ReactNode;
  confirm: string;
  danger?: boolean;
}

/**
 * 한 번 더 확인: an in-page sheet listing exactly what will happen, with the action spelled out on the button.
 * `const [ask, dialog] = useConfirm(); if (await ask({...})) …` and render `{dialog}`.
 */
export function useConfirm(): [(o: ConfirmOpts) => Promise<boolean>, ReactNode] {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const done = useRef<((v: boolean) => void) | null>(null);
  const ask = useCallback(
    (o: ConfirmOpts) =>
      new Promise<boolean>((resolve) => {
        done.current = resolve;
        setOpts(o);
      }),
    [],
  );
  const close = (v: boolean) => {
    done.current?.(v);
    done.current = null;
    setOpts(null);
  };
  const dialog = opts ? (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={() => close(false)}>
      <div role="alertdialog" aria-modal="true" className="fade-up w-full max-w-[440px] rounded-t-3xl bg-surface p-5 pb-7 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[17px] font-bold">{opts.title}</h3>
        {opts.rows && (
          <dl className="mt-3 divide-y divide-line rounded-xl border border-line text-[14px]">
            {opts.rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 px-3 py-2">
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 text-right font-semibold break-words">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {opts.message && <div className="mt-3 text-[13px] leading-relaxed text-muted">{opts.message}</div>}
        <div className="mt-4 flex gap-2">
          <button onClick={() => close(false)} className="flex-1 rounded-xl border border-line py-3 text-[15px] text-muted">
            돌아가기
          </button>
          <button
            onClick={() => close(true)}
            className={`flex-[1.4] rounded-xl py-3 text-[15px] font-bold text-white ${opts.danger ? "bg-gradient-to-b from-[#c0392b] to-[#8e1f16]" : "bg-gradient-to-b from-peach to-[#b8662e]"}`}
          >
            {opts.confirm}
          </button>
        </div>
      </div>
    </div>
  ) : null;
  return [ask, dialog];
}
