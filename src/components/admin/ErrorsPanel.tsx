"use client";

import { useCallback, useEffect, useState } from "react";

type ErrorGroup = {
  fingerprint: string;
  source: "client" | "server" | "api";
  message: string;
  path: string | null;
  detail: string | null;
  ua: string | null;
  count: number;
  first: string;
  last: string;
};

const SOURCE: Record<ErrorGroup["source"], string> = { client: "화면", server: "서버", api: "API" };
const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" });

/** A browser in a few words, from its user agent. */
function browserOf(ua: string | null): string {
  if (!ua) return "";
  const os = /iPhone|iPad/.test(ua) ? "아이폰" : /Android/.test(ua) ? "안드로이드" : /Windows/.test(ua) ? "윈도우" : /Mac OS/.test(ua) ? "맥" : "";
  const app = /KAKAOTALK/i.test(ua) ? "카톡 안" : /Instagram/.test(ua) ? "인스타 안" : /NAVER/.test(ua) ? "네이버 앱" : /SamsungBrowser/.test(ua) ? "삼성 인터넷" : /CriOS|Chrome/.test(ua) ? "크롬" : /Safari/.test(ua) ? "사파리" : /Firefox/.test(ua) ? "파이어폭스" : "";
  return [os, app].filter(Boolean).join(" ");
}

/** 오류 기록: what went wrong for people, grouped by kind; cleared once fixed. */
export function ErrorsPanel({ onCount }: { onCount?: (n: number) => void }) {
  const [hours, setHours] = useState(24);
  const [list, setList] = useState<ErrorGroup[] | null>(null);
  const [mail, setMail] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/errors?hours=${hours}`, { cache: "no-store" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "불러오지 못했어요");
      setList(b.errors);
      setMail(b.mail);
      onCount?.(b.errors.reduce((n: number, e: ErrorGroup) => n + e.count, 0));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [hours, onCount]);

  useEffect(() => {
    load();
  }, [load]);

  const clear = async (fp: string) => {
    if (!window.confirm("이 오류를 목록에서 지울까요? (고쳤거나 확인 끝난 것)")) return;
    await fetch(`/api/admin/errors?fp=${encodeURIComponent(fp)}`, { method: "DELETE" }).catch(() => null);
    load();
  };

  const btn = (on: boolean) => `rounded-xl border px-3 py-1.5 text-[13px] font-semibold ${on ? "border-peach text-peach" : "border-line text-muted"}`;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold">🚨 오류 기록</h2>
        <div className="flex gap-1.5">
          {[24, 168].map((h) => (
            <button key={h} onClick={() => setHours(h)} className={btn(hours === h)}>
              {h === 24 ? "24시간" : "7일"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
        손님 화면·결제·로그인에서 난 오류가 자동으로 쌓여요.{" "}
        {mail ? "새로운 종류가 생기면 관리자 메일로도 알려 드려요." : "ADMIN_EMAIL을 넣으면 새로운 오류가 생길 때 메일로도 받아요 (GUIDE.md)."}
      </p>
      {error && <p className="mt-2 text-[13px] text-pink">{error}</p>}
      {!list ? (
        <p className="py-4 text-center text-[13px] text-muted">불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-muted">오류가 없어요 🐾</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {list.map((e) => (
            <li key={e.fingerprint} className="py-2.5">
              <button onClick={() => setOpen(open === e.fingerprint ? null : e.fingerprint)} className="w-full text-left">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="mr-1.5 rounded-md bg-pink/15 px-1.5 py-0.5 text-[11px] font-bold text-pink">{SOURCE[e.source]}</span>
                    <span className="text-[13.5px] font-semibold break-words">{e.message}</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-bold">{e.count}번</span>
                </span>
                <span className="mt-0.5 block text-[12px] text-muted">
                  {e.path ?? "-"} · 마지막 {when(e.last)}
                  {e.count > 1 ? ` · 처음 ${when(e.first)}` : ""} · {browserOf(e.ua) || "브라우저 모름"}
                </span>
              </button>
              {open === e.fingerprint && (
                <div className="mt-2 space-y-2">
                  {e.detail && <pre className="max-h-48 overflow-auto rounded-lg bg-black/40 p-2 text-[11.5px] leading-snug whitespace-pre-wrap text-muted">{e.detail}</pre>}
                  {e.ua && <p className="text-[11px] break-all text-muted">{e.ua}</p>}
                  <button onClick={() => clear(e.fingerprint)} className="rounded-xl border border-line px-3 py-1.5 text-[12.5px]">
                    ✓ 확인했어요 (목록에서 지우기)
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
