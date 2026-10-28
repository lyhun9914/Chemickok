"use client";

import { useEffect, useState } from "react";
import { nameCompat, nameCompatComment, type NameCompatResult } from "@/lib/nameCompat";
import { dailyApi, type DailyFortuneResponse } from "@/services/apiClient";
import { shareService, siteUrl } from "@/services/shareService";
import { useAppStore } from "@/store/useAppStore";
import { DateTimeSelects } from "./DateTimeSelects";
import { Say } from "./Nyang";

/** Share a link; on PC (or when the sheet is unavailable) it's copied, so say so. */
function ShareLinkButton({ label, title, description }: { label: string; title: string; description: string }) {
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <button
        onClick={() =>
          shareService
            .shareLink({ title, description, url: siteUrl() })
            .then((o) => o === "copied" && setNote("링크를 복사했다냥! 붙여넣어서 보내라냥 📋"))
            .catch(() => setNote("공유를 못 했다냥. 다시 눌러라냥"))
        }
        className="w-full rounded-2xl border border-line py-3.5 text-sm font-semibold"
      >
        {label}
      </button>
      {note && <p className="fade-up -mt-2 text-center text-xs text-peach">{note}</p>}
    </>
  );
}

export type MiniGame = "daily" | "name";

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fade-up max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-surface p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-muted hover:bg-white/5" aria-label="닫기">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-pink/60";

function DailyFortune({ onStart }: { onStart: () => void }) {
  const saved = useAppStore((st) => st.me?.profile?.birthdate ?? st.input.me.birthdate);
  const [birthdate, setBirthdate] = useState(saved ?? "");
  const [result, setResult] = useState<DailyFortuneResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const [r] = await Promise.all([dailyApi.get(birthdate), new Promise((res) => setTimeout(res, 900))]);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };

  if (!result) {
    return (
      <div className="space-y-4">
        <Say mood="smug">생일만 대라냥. 오늘 연애운 10초 컷이다냥.</Say>
        <DateTimeSelects type="date" initial={saved ?? ""} onChange={setBirthdate} />
        {error && <p className="text-sm text-pink">{error}</p>}
        <button onClick={go} disabled={!birthdate || busy} className="btn-primary w-full py-4">
          {busy ? "냥신이 하늘을 보는 중…" : "오늘의 연애운 보기 🔮"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-chemi p-5 text-center">
        <p className="text-xs text-white/80">{result.date} 오늘의 연애운</p>
        <p className="mt-2 text-5xl font-black">{result.score}점</p>
        <p className="mt-2 text-lg font-bold">{result.title}</p>
        <div className="mt-4 flex justify-center gap-2 text-xs">
          <span className="rounded-full bg-black/25 px-3 py-1">🎨 {result.color}</span>
          <span className="rounded-full bg-black/25 px-3 py-1">⏰ {result.time}</span>
        </div>
      </div>
      <Say mood="happy">{result.line}</Say>
      <ShareLinkButton
        label="친구한테 오늘 운세 보내기 📤"
        title="냥신 오늘의 연애운"
        description={`오늘 내 연애운 ${result.score}점 - ${result.title} 🕯️ 너도 봐 봐!`}
      />
      <button onClick={onStart} className="btn-primary w-full py-4">
        내 연애 유형까지 제대로 보기 🐾
      </button>
    </div>
  );
}

function NameMatch({ onStart }: { onStart: () => void }) {
  const myName = useAppStore((st) => st.me?.profile?.name ?? st.input.me.name);
  const [a, setA] = useState(myName ?? "");
  const [b, setB] = useState("");
  const [result, setResult] = useState<NameCompatResult | null>(null);
  const [rowsShown, setRowsShown] = useState(0);

  useEffect(() => {
    if (!result || rowsShown >= result.rows.length) return;
    const t = setTimeout(() => setRowsShown((n) => n + 1), 380);
    return () => clearTimeout(t);
  }, [result, rowsShown]);

  const go = () => {
    const r = nameCompat(a, b);
    setResult(r);
    setRowsShown(0);
  };
  const done = result && rowsShown >= result.rows.length;

  return (
    <div className="space-y-4">
      {!result && (
        <>
          <Say mood="smug">학교 다닐 때 하던 그거다냥. 이름 획수로 궁합 본다냥. 한글 이름만 된다냥.</Say>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="내 이름" maxLength={6} value={a} onChange={(e) => setA(e.target.value)} />
            <input className={inputCls} placeholder="그 사람 이름" maxLength={6} value={b} onChange={(e) => setB(e.target.value)} />
          </div>
          <button onClick={go} disabled={!a.trim() || !b.trim()} className="btn-primary w-full py-4">
            이름 궁합 보기 ✍️
          </button>
          {a && b && !nameCompat(a, b) && <p className="text-sm text-pink">한글 이름을 입력해 주세요</p>}
        </>
      )}
      {result && (
        <>
          <div className="rounded-3xl bg-white/[0.04] p-4">
            <div className="mb-2 flex justify-center gap-1.5">
              {result.syllables.map((s, i) => (
                <span key={i} className={`w-8 text-center text-lg font-bold ${i % 2 ? "text-violet" : "text-pink"}`}>
                  {s}
                </span>
              ))}
            </div>
            {result.rows.slice(0, rowsShown).map((row, ri) => (
              <div key={ri} className="fade-up flex justify-center gap-1.5 py-0.5">
                {row.map((n, i) => (
                  <span key={i} className="w-8 text-center font-mono text-[15px] text-ink/90">
                    {n}
                  </span>
                ))}
              </div>
            ))}
          </div>
          {done && (
            <>
              <p className="fade-up text-center text-5xl font-black">
                <span className="text-gradient">{result.score}%</span>
              </p>
              <Say mood={result.score >= 75 ? "wow" : result.score >= 40 ? "smug" : "happy"}>{nameCompatComment(result.score)}</Say>
              <ShareLinkButton label="결과 공유하기 📤" title="냥신 이름 궁합" description={`${a} ♥ ${b} 이름 궁합 ${result.score}% 😳 너도 해 봐!`} />
              <button onClick={() => setResult(null)} className="w-full py-2 text-sm text-muted">
                다른 이름으로 다시 하기
              </button>
              <button onClick={onStart} className="btn-primary w-full py-4">
                사주로 진짜 궁합 보기 🐾
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function MiniGameSheet({ game, onClose, onStart }: { game: MiniGame | null; onClose: () => void; onStart: () => void }) {
  if (!game) return null;
  return (
    <Sheet title={game === "daily" ? "🔮 오늘의 연애운" : "✍️ 이름 궁합"} onClose={onClose}>
      {game === "daily" ? <DailyFortune onStart={onStart} /> : <NameMatch onStart={onStart} />}
    </Sheet>
  );
}

