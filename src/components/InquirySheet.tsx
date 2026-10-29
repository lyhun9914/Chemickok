"use client";

import { useEffect, useMemo, useState } from "react";
import { useBack } from "@/lib/back";
import { BUSINESS } from "@/lib/config";
import { Say } from "./Nyang";

/**
 * 고객문의: mail only (no phone line). The visitor picks what it's about, fills a short form shaped for that, and
 * sends it from their mail app or Gmail — or copies it. Nothing is sent from here; the mail goes from their own box.
 */
type Kind = "pay" | "bug" | "login" | "etc";

const KINDS: { id: Kind; emoji: string; label: string; fields: { key: string; label: string; placeholder: string }[] }[] = [
  {
    id: "pay",
    emoji: "💳",
    label: "결제·환불",
    fields: [
      { key: "when", label: "결제 일시", placeholder: "예: 10월 29일 오후 3시쯤" },
      { key: "what", label: "상품과 금액", placeholder: "예: 타고난 사주 팔자 990원" },
      { key: "method", label: "결제 수단", placeholder: "예: 카드, 카카오페이, 토스" },
    ],
  },
  {
    id: "bug",
    emoji: "🐞",
    label: "오류·결과 문제",
    fields: [
      { key: "where", label: "어느 화면에서", placeholder: "예: 결과 화면, 결제 후, 미니 게임" },
      { key: "what", label: "어떤 문제가", placeholder: "예: 결과가 안 열려요, 화면이 멈춰요" },
    ],
  },
  {
    id: "login",
    emoji: "🔑",
    label: "로그인·계정",
    fields: [
      { key: "provider", label: "로그인 방식", placeholder: "예: 카카오, 네이버, 구글" },
      { key: "what", label: "어떤 문제가", placeholder: "예: 로그인 후 점괘함이 비어 있어요" },
    ],
  },
  { id: "etc", emoji: "💡", label: "제안·기타", fields: [] },
];

/** A short "기기 · 브라우저" line so a bug report says where it happened. */
function deviceLine(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows PC"
          : /Mac/.test(ua)
            ? "Mac"
            : "기타 기기";
  const browser = /KAKAOTALK/i.test(ua)
    ? "카카오톡 인앱"
    : /Instagram/.test(ua)
      ? "인스타그램 인앱"
      : /NAVER/.test(ua)
        ? "네이버 앱"
        : /SamsungBrowser/.test(ua)
          ? "삼성 인터넷"
          : /Edg\//.test(ua)
            ? "Edge"
            : /Chrome|CriOS/.test(ua)
              ? "Chrome"
              : /Safari/.test(ua)
                ? "Safari"
                : /Firefox/.test(ua)
                  ? "Firefox"
                  : "기타 브라우저";
  return `${device} · ${browser}`;
}

const inputCls = "w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-pink/60";

export function InquirySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>("pay");
  const [name, setName] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const device = useMemo(deviceLine, []);
  useBack(open, onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const k = KINDS.find((x) => x.id === kind)!;
  const subject = `[냥신 점괘 문의] ${k.label}${name.trim() ? ` - ${name.trim()}` : ""}`;
  const text = [
    "[냥신 점괘 고객문의]",
    `■ 문의 유형: ${k.label}`,
    `■ 이름(닉네임): ${name.trim()}`,
    ...k.fields.map((f) => `■ ${f.label}: ${vals[f.key]?.trim() ?? ""}`),
    "■ 문의 내용:",
    body.trim() || "(여기에 적어 주세요)",
    "",
    kind === "pay" || kind === "bug" ? "※ 화면 캡처를 첨부해 주시면 더 빨리 확인할 수 있어요." : null,
    "----",
    `사용 환경: ${device}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
  const mailto = `mailto:${BUSINESS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(BUSINESS.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  const copy = (what: string, done: string) =>
    navigator.clipboard
      ?.writeText(what)
      .then(() => setNote(done))
      .catch(() => setNote("복사를 못 했다냥. 길게 눌러 직접 복사해 줘라냥"));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="고객문의"
        className="fade-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-surface p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">📮 고객문의</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-muted hover:bg-white/5" aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <Say mood="talk">전화는 못 받는다냥… 대신 메일로 보내 주면 하나도 안 빼고 읽고 답장하겠다냥. 아래 양식만 채워 줘라냥.</Say>

          <div className="flex items-center gap-3 rounded-2xl border border-violet/35 bg-white/[0.03] px-4 py-3">
            <span className="text-xl" aria-hidden>
              ✉️
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-muted">문의 메일 주소</span>
              <span className="block break-all text-[15px] font-bold">{BUSINESS.email}</span>
            </span>
            <button onClick={() => copy(BUSINESS.email, "메일 주소를 복사했다냥 📋")} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold">
              복사
            </button>
          </div>
          <p className="-mt-2 text-[12.5px] text-muted">전화 상담은 운영하지 않아요. 메일로 보내 주시면 확인하는 대로 답장드려요.</p>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-muted">① 무엇에 관한 문의인가요?</p>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((x) => (
                <button
                  key={x.id}
                  onClick={() => setKind(x.id)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-[14px] ${kind === x.id ? "border-pink bg-pink/15 font-bold text-ink" : "border-line text-muted"}`}
                >
                  {x.emoji} {x.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[13px] font-semibold text-muted">② 양식 채우기</p>
            <label className="block">
              <span className="mb-1 block text-[13px] text-muted">이름(닉네임)</span>
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} placeholder="답장할 때 부를 이름" className={inputCls} />
            </label>
            {k.fields.map((f) => (
              <label key={`${kind}-${f.key}`} className="block">
                <span className="mb-1 block text-[13px] text-muted">{f.label}</span>
                <input value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value.slice(0, 80) })} placeholder={f.placeholder} className={inputCls} />
              </label>
            ))}
            <label className="block">
              <span className="mb-1 block text-[13px] text-muted">문의 내용</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 1000))}
                rows={4}
                placeholder={kind === "pay" ? "예: 결제는 됐는데 감정서가 안 열려요" : "자유롭게 적어 주세요"}
                className={`${inputCls} resize-none`}
              />
            </label>
            {kind === "pay" && <p className="text-[12.5px] text-peach">결제 문의는 결제 일시와 금액을 꼭 적어 주세요. 그래야 바로 찾을 수 있어요.</p>}
            <p className="text-[12px] text-muted">사용 환경({device})은 메일에 자동으로 적혀요.</p>
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-muted">③ 보내기</p>
            <a href={mailto} className="btn-primary block w-full py-3.5 text-center text-[15px]">
              ✉️ 메일 앱으로 보내기
            </a>
            <a href={gmail} target="_blank" rel="noopener noreferrer" className="block w-full rounded-2xl border border-line py-3.5 text-center text-[15px] font-semibold">
              Gmail로 보내기
            </a>
            <button
              onClick={() => copy(`받는 사람: ${BUSINESS.email}\n제목: ${subject}\n\n${text}`, "양식을 복사했다냥. 메일에 붙여넣어 보내라냥 📋")}
              className="w-full py-2 text-[13px] text-muted underline underline-offset-4"
            >
              📋 양식 복사하기 (다른 메일로 보낼 때)
            </button>
            {note && <p className="fade-up text-center text-xs text-peach">{note}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
