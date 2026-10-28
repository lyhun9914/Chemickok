"use client";

import { useEffect, useState } from "react";
import { checkIn, saveTarot, tarotToday } from "@/lib/daily";
import { nameCompat, nameCompatComment, type NameCompatResult } from "@/lib/nameCompat";
import { sound } from "@/lib/sound";
import { TAROT } from "@/lib/tarot";
import type { Mode } from "@/models/types";
import { dailyApi, todayApi, type DailyFortuneResponse, type TodayFortuneResponse, type ZodiacTodayResponse } from "@/services/apiClient";
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

export type MiniGame = "today" | "daily" | "tarot" | "zodiac" | "name";

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

const inputCls = "w-full rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-pink/60";

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
      <ShareLinkButton label="친구한테 오늘 운세 보내기 📤" title="냥신 오늘의 연애운" description={`오늘 내 연애운 ${result.score}점 - ${result.title} 🕯️ 너도 봐 봐!`} />
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

const TITLES: Record<MiniGame, string> = {
  today: "📅 오늘의 운세",
  daily: "🔮 오늘의 연애운",
  tarot: "🃏 오늘의 타로 한 장",
  zodiac: "🐾 띠별 오늘의 운세",
  name: "✍️ 이름 궁합",
};

export function MiniGameSheet({ game, onClose, onStart }: { game: MiniGame | null; onClose: () => void; onStart: (mode?: Mode) => void }) {
  if (!game) return null;
  return (
    <Sheet title={TITLES[game]} onClose={onClose}>
      {game === "today" ? (
        <TodayFortune onStart={onStart} />
      ) : game === "daily" ? (
        <DailyFortune onStart={() => onStart()} />
      ) : game === "tarot" ? (
        <TarotDraw onStart={onStart} />
      ) : game === "zodiac" ? (
        <ZodiacList onStart={onStart} />
      ) : (
        <NameMatch onStart={() => onStart("couple")} />
      )}
    </Sheet>
  );
}

// ───────────── 오늘의 운세 · 출석 도장 ─────────────

/** Last 7 days as stamps; today in the last slot. */
function Stamps({ stamps, streak }: { stamps: boolean[]; streak: number }) {
  const days = ["6일 전", "5일 전", "4일 전", "3일 전", "그제", "어제", "오늘"];
  return (
    <div className="rounded-2xl border border-violet/30 bg-violet/5 p-4">
      <p className="text-[15px] font-bold text-peach">🐾 출석 도장 · 연속 {streak}일째</p>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {stamps.map((on, i) => (
          <div key={i} className="text-center">
            <div
              className={`mx-auto grid h-9 w-9 place-items-center rounded-full border text-[15px] ${on ? "border-pink bg-pink/20" : "border-line bg-white/[0.03] text-muted/50"}`}
              style={on && i === 6 ? { animation: "sealStamp 0.5s cubic-bezier(0.3,1.6,0.5,1) backwards" } : undefined}
            >
              {on ? "🐾" : "·"}
            </div>
            <p className="mt-1 text-[11px] text-muted">{days[i]}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted">
        {streak >= 7 ? "🎁 7일 개근이다냥! 이번 주 운은 냥신이 지켜 준다냥." : `내일 또 오면 도장 하나 더 찍어 주겠다냥. 7일 개근까지 ${7 - Math.min(7, streak)}일!`}
      </p>
    </div>
  );
}

function Bar({ label, score, line }: { label: string; score: number; line: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[14px]">
        <span className="font-semibold">{label}</span>
        <span className="font-bold text-peach">{score}점</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="gauge-fill h-full rounded-full bg-gradient-to-r from-pink to-violet" style={{ width: `${score}%` }} />
      </div>
      <p className="mt-1 text-[13px] text-muted">{line}</p>
    </div>
  );
}

function TodayFortune({ onStart }: { onStart: (mode?: Mode) => void }) {
  const saved = useAppStore((st) => st.me?.profile?.birthdate || st.input.me.birthdate);
  const [birthdate, setBirthdate] = useState(saved ?? "");
  const [result, setResult] = useState<TodayFortuneResponse | null>(null);
  const [stamp, setStamp] = useState<ReturnType<typeof checkIn> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const [r] = await Promise.all([todayApi.fortune(birthdate), new Promise((res) => setTimeout(res, 900))]);
      setResult(r);
      const s = checkIn();
      setStamp(s);
      sound().play(s.fresh ? "stamp" : "reveal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };

  if (!result) {
    return (
      <div className="space-y-4">
        <Say mood="smug">하루 한 번, 오늘의 일진을 짚어 주겠다냥. 생일만 대라냥.</Say>
        <DateTimeSelects type="date" initial={saved ?? ""} onChange={setBirthdate} />
        {error && <p className="text-sm text-pink">{error}</p>}
        <button onClick={go} disabled={!birthdate || busy} className="btn-primary w-full py-4">
          {busy ? "오늘의 일진을 펼치는 중…" : "오늘의 운세 보기 📅"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stamp && <Stamps stamps={stamp.stamps} streak={stamp.streak} />}
      <div className="rounded-3xl border border-line bg-white/[0.03] p-5 text-center">
        <p className="text-[13px] text-muted">
          {result.date} · {result.ganji}
        </p>
        <p className="mt-2 text-5xl font-black">
          <span className="text-gradient">{result.score}점</span>
        </p>
        <p className="font-ritual mt-2 text-[21px]">{result.title}</p>
      </div>
      <Say mood="talk">{result.line}</Say>
      <div className="space-y-3 rounded-2xl border border-line p-4">
        {result.cats.map((c) => (
          <Bar key={c.key} label={c.label} score={c.score} line={c.line} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[14px]">
        <div className="rounded-xl bg-white/[0.04] p-3">
          <p className="text-xs text-muted">✅ 오늘 하면 좋은 것</p>
          <p className="mt-1 font-semibold leading-snug">{result.do}</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] p-3">
          <p className="text-xs text-muted">🚫 오늘 피할 것</p>
          <p className="mt-1 font-semibold leading-snug">{result.dont}</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-[13px]">
        <span className="rounded-full bg-violet/10 px-3 py-1.5">🎨 {result.color}</span>
        <span className="rounded-full bg-violet/10 px-3 py-1.5">🧭 {result.direction}</span>
        <span className="rounded-full bg-violet/10 px-3 py-1.5">🔢 {result.number}</span>
        <span className="rounded-full bg-violet/10 px-3 py-1.5">⏰ {result.time}</span>
      </div>
      <ShareLinkButton label="친구한테 오늘 운세 보내기 📤" title="냥신 오늘의 운세" description={`오늘 내 운세 ${result.score}점 - ${result.title} 🕯️ 너도 봐 봐!`} />
      <button onClick={() => onStart("saju")} className="btn-primary w-full py-4">
        타고난 사주 팔자까지 보기 📜
      </button>
    </div>
  );
}

// ───────────── 오늘의 타로 ─────────────

function TarotDraw({ onStart }: { onStart: (mode?: Mode) => void }) {
  const [card, setCard] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  // Today's card is fixed once drawn (read after mount: localStorage isn't there during SSR).
  useEffect(() => {
    const c = tarotToday();
    if (c !== null) {
      setCard(c);
      setPicked(1);
    }
  }, []);
  const pick = (slot: number) => {
    if (picked !== null) return;
    const c = Math.floor(Math.random() * TAROT.length);
    saveTarot(c);
    setPicked(slot);
    sound().play("reveal");
    setTimeout(() => {
      setCard(c);
      sound().play("chime");
    }, 650);
  };
  const t = card !== null ? TAROT[card] : null;
  return (
    <div className="space-y-4">
      <Say mood="smug">{t ? "오늘 네 카드다냥. 하루에 한 장뿐이다냥." : "숨 한 번 고르고, 끌리는 카드 한 장만 골라라냥."}</Say>
      {!t && (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((slot) => (
            <button
              key={slot}
              onClick={() => pick(slot)}
              className={`aspect-[2/3] rounded-2xl border-2 border-peach/40 bg-card-front transition duration-500 ${picked === slot ? "-translate-y-3 scale-105 shadow-[0_0_30px_rgba(240,207,138,0.5)]" : picked !== null ? "opacity-30" : "active:scale-95"}`}
              aria-label={`${slot + 1}번 카드`}
            >
              <span className="text-3xl">🐾</span>
            </button>
          ))}
        </div>
      )}
      {t && (
        <div className="chip-pop rounded-3xl border border-peach/40 bg-white/[0.03] p-6 text-center">
          <p className="text-[13px] tracking-[0.3em] text-violet">{t.no}</p>
          <div className="mt-2 text-6xl">{t.emoji}</div>
          <p className="font-ritual mt-3 text-[24px] text-peach">{t.name}</p>
          <p className="mt-3 text-[15px] leading-relaxed">{t.line}</p>
          <p className="mt-3 rounded-xl bg-white/[0.05] px-3 py-2 text-[14px] font-semibold">🐾 오늘의 한 수: {t.advice}</p>
        </div>
      )}
      {t && (
        <>
          <p className="text-center text-[13px] text-muted">내일 다시 오면 새 카드를 뽑을 수 있다냥.</p>
          <ShareLinkButton label="오늘 내 카드 공유하기 📤" title="냥신 오늘의 타로" description={`오늘 내 타로는 '${t.name}' ${t.emoji} — ${t.advice} 너도 뽑아 봐!`} />
          <button onClick={() => onStart()} className="btn-primary w-full py-4">
            내 연애 팔자도 보기 🐾
          </button>
        </>
      )}
    </div>
  );
}

// ───────────── 띠별 오늘의 운세 ─────────────

const ZODIAC_EMOJI: Record<string, string> = { 쥐: "🐭", 소: "🐮", 호랑이: "🐯", 토끼: "🐰", 용: "🐲", 뱀: "🐍", 말: "🐴", 양: "🐑", 원숭이: "🐵", 닭: "🐔", 개: "🐶", 돼지: "🐷" };

/** 띠 by 입춘 (Feb 4), the same way the readings count it. */
function animalOf(date: string): string | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  const year = m < 2 || (m === 2 && d < 4) ? y - 1 : y;
  return Object.keys(ZODIAC_EMOJI)[(((year - 4) % 12) + 12) % 12];
}

function ZodiacList({ onStart }: { onStart: (mode?: Mode) => void }) {
  const birth = useAppStore((st) => st.me?.profile?.birthdate || st.input.me.birthdate);
  const mine = animalOf(birth ?? "");
  const [data, setData] = useState<ZodiacTodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    todayApi.zodiac().then(setData, (e: Error) => setError(e.message));
  }, []);
  if (error) return <p className="text-sm text-pink">{error}</p>;
  if (!data) return <p className="py-8 text-center text-sm text-muted">오늘의 일진을 펼치는 중…</p>;
  const list = mine ? [...data.list.filter((z) => z.animal === mine), ...data.list.filter((z) => z.animal !== mine)] : data.list;
  return (
    <div className="space-y-3">
      <p className="text-center text-[13px] text-muted">
        {data.date} · {data.ganji}
      </p>
      <ul className="space-y-2">
        {list.map((z) => (
          <li key={z.animal} className={`flex items-center gap-3 rounded-2xl border p-3 ${z.animal === mine ? "border-pink/50 bg-pink/10" : "border-line bg-white/[0.02]"}`}>
            <span className="text-3xl">{ZODIAC_EMOJI[z.animal]}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">
                {z.animal}띠 {z.animal === mine && <span className="text-[12px] text-pink">· 내 띠</span>}
              </span>
              <span className="block text-[13.5px] leading-snug text-muted">{z.line}</span>
            </span>
            <span className={`text-[17px] font-black ${z.score >= 80 ? "text-peach" : z.score < 60 ? "text-pink" : ""}`}>{z.score}</span>
          </li>
        ))}
      </ul>
      <button onClick={() => onStart("daeun")} className="btn-primary w-full py-4">
        내 인생 대운 흐름 보기 🌊
      </button>
    </div>
  );
}
