"use client";

import { useEffect, useState } from "react";
import { drawBujeok } from "@/lib/bujeok";
import { CONTACT, CONTACT_Q, POSITIONS, type ContactQ, verdictOf } from "@/lib/contactTarot";
import { checkIn, contactToday, saveContact, saveTarot, tarotToday } from "@/lib/daily";
import { nameCompat, nameCompatComment, type NameCompatResult } from "@/lib/nameCompat";
import { sound } from "@/lib/sound";
import { TAROT } from "@/lib/tarot";
import type { FortuneStoryCard, Mode } from "@/models/types";
import { dailyApi, todayApi, type DailyFortuneResponse, type ExamDayResponse, type IljuResponse, type TodayFortuneResponse, type ZodiacTodayResponse } from "@/services/apiClient";
import { shareService, siteUrl } from "@/services/shareService";
import { useAppStore } from "@/store/useAppStore";
import { DateTimeSelects } from "./DateTimeSelects";
import { Say } from "./Nyang";
import { ShareButtons } from "./ShareButtons";

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

export type MiniGame = "today" | "daily" | "tarot" | "zodiac" | "name" | "ilju" | "contact" | "exam";

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
  ilju: "🐈 일주 고양이 도감",
  contact: "📨 연락할까 말까? 타로",
  exam: "🧧 냥신 합격 부적",
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
      ) : game === "ilju" ? (
        <IljuDex onStart={onStart} />
      ) : game === "contact" ? (
        <ContactTarot onStart={onStart} />
      ) : game === "exam" ? (
        <ExamCharm onStart={onStart} />
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
      <div className="rounded-2xl border border-line p-4">
        <p className="mb-2.5 text-[13px] font-semibold text-muted">⏰ 시간대별 운세</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {result.slots.map((sl) => (
            <div key={sl.label} className={`rounded-xl px-2 py-2.5 ${sl.score >= 78 ? "bg-peach/10 ring-1 ring-peach/40" : "bg-white/[0.04]"}`}>
              <p className="text-[12px] text-muted">{sl.label}</p>
              <p className={`text-[18px] font-black ${sl.score >= 78 ? "text-peach" : ""}`}>{sl.score}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{sl.line}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1.5 rounded-2xl bg-white/[0.04] p-4 text-[14px]">
        <p>
          <span className="text-muted">👕 행운의 코디 · </span>
          {result.outfit}
        </p>
        <p>
          <span className="text-muted">🍽️ 오늘 끌리는 맛 · </span>
          {result.food}
        </p>
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

// ───────────── 일주 고양이 도감 ─────────────

function IljuDex({ onStart }: { onStart: (mode?: Mode) => void }) {
  const savedDate = useAppStore((st) => st.me?.profile?.birthdate || st.input.me.birthdate);
  const savedName = useAppStore((st) => st.me?.profile?.name || st.input.me.name);
  const [birthdate, setBirthdate] = useState(savedDate ?? "");
  const [card, setCard] = useState<IljuResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const me = savedName || "나";

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const [r] = await Promise.all([todayApi.ilju(birthdate), new Promise((res) => setTimeout(res, 800))]);
      setCard(r);
      sound().play("chime");
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };

  if (!card) {
    return (
      <div className="space-y-4">
        <Say mood="smug">태어난 날의 기둥, 일주(日柱)가 곧 너다냥. 60일주마다 고양이가 하나씩 산다냥. 네 고양이는 누구냥?</Say>
        <DateTimeSelects type="date" initial={savedDate ?? ""} onChange={setBirthdate} />
        {error && <p className="text-sm text-pink">{error}</p>}
        <button onClick={go} disabled={!birthdate || busy} className="btn-primary w-full py-4">
          {busy ? "도감을 넘기는 중…" : "내 일주 고양이 찾기 🐈"}
        </button>
        <p className="text-center text-[12px] text-muted">일주는 만세력 기준 태어난 날의 간지다냥. 시간은 몰라도 된다냥.</p>
      </div>
    );
  }

  const story: FortuneStoryCard = {
    kind: "fortune",
    label: `${me}의 일주 고양이`,
    emoji: "🐈",
    headline: card.name,
    sub: `${card.ganji}일주 · 기 센 순위 ${card.rank}위/60`,
    meta: `${card.hanja} · 도감 No.${String(card.no).padStart(2, "0")}`,
    slipLabel: "찰떡 일주",
    slipValue: card.match.ganji,
    slipText: `키워드 · ${card.keys.join(" · ")}`,
  };
  return (
    <div className="space-y-4">
      <div className="chip-pop relative overflow-hidden rounded-3xl border-2 border-peach/45 bg-chemi p-6 text-center">
        <span className="pointer-events-none absolute inset-2 rounded-2xl border border-peach/20" aria-hidden />
        <p className="text-[12px] tracking-[0.3em] text-peach/80">냥신 도감 · No.{String(card.no).padStart(2, "0")}/60</p>
        <div className="mt-3 text-5xl">
          {card.icon}
          <span className="ml-1">🐈</span>
        </div>
        <p className="font-ritual mt-3 text-[24px] leading-snug text-white">{card.name}</p>
        <p className="mt-1 text-[14px] text-white/75">
          {card.ganji}일주 · {card.hanja}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {card.keys.map((k) => (
            <span key={k} className="rounded-full border border-peach/50 bg-black/20 px-3 py-1 text-[13px] font-bold text-peach">
              #{k}
            </span>
          ))}
        </div>
      </div>
      <Say mood="talk">{card.trait}</Say>
      {card.labelLine && (
        <div className="rounded-2xl border border-pink/40 bg-pink/5 p-4">
          <p className="text-[13px] font-bold text-pink">🔥 {card.labels.join(" · ")}</p>
          <p className="mt-1 text-[14px] leading-relaxed">{card.labelLine}</p>
        </div>
      )}
      <div className="rounded-2xl border border-line p-4">
        <div className="flex items-end justify-between">
          <p className="text-[14px] font-semibold">💪 60일주 기 센 순위</p>
          <p className="text-[22px] font-black text-peach">
            {card.rank}
            <span className="text-[14px] font-bold text-muted">위 / 60</span>
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="gauge-fill h-full rounded-full bg-gradient-to-r from-pink to-violet" style={{ width: `${Math.round(((61 - card.rank) / 60) * 100)}%` }} />
        </div>
        <p className="mt-2 text-[13px] text-muted">{card.rankLine}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[14px]">
        <div className="rounded-xl bg-white/[0.04] p-3">
          <p className="text-xs text-muted">💘 연애할 때</p>
          <p className="mt-1 font-semibold leading-snug">{card.love}</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] p-3">
          <p className="text-xs text-muted">🤝 찰떡 일주</p>
          <p className="mt-1 font-semibold leading-snug">
            {card.match.ganji}일주
            <br />
            <span className="text-[13px] font-normal text-muted">{card.match.name}</span>
          </p>
        </div>
      </div>
      <ShareButtons teaser={story} myName={me} partnerName="" toast={setNote} />
      {note && <p className="fade-up text-center text-xs text-peach">{note}</p>}
      <button onClick={() => onStart("saju")} className="btn-primary w-full py-4">
        일주 말고 여덟 글자 전부 보기 📜
      </button>
    </div>
  );
}

// ───────────── 연락할까 말까? 타로 ─────────────

function ContactTarot({ onStart }: { onStart: (mode?: Mode) => void }) {
  const [q, setQ] = useState<ContactQ | null>(null);
  const [picks, setPicks] = useState<number[]>([]); // slots picked (0..6)
  const [cards, setCards] = useState<number[] | null>(null); // card indices, once drawn
  const [shown, setShown] = useState(0);
  const [again, setAgain] = useState(false);
  const question = CONTACT_Q.find((x) => x.id === q);

  const choose = (id: ContactQ) => {
    setQ(id);
    setPicks([]);
    setShown(0);
    const prev = contactToday(id);
    setAgain(Boolean(prev));
    setCards(prev);
    if (prev) setShown(3);
  };
  const pick = (slot: number) => {
    if (cards || picks.includes(slot) || !q) return;
    sound().play("tap");
    const next = [...picks, slot];
    setPicks(next);
    if (next.length === 3) {
      // Three different cards out of the 22.
      const deck = [...TAROT.keys()].sort(() => Math.random() - 0.5).slice(0, 3);
      saveContact(q, deck);
      setTimeout(() => {
        setCards(deck);
        [1, 2, 3].forEach((n) =>
          setTimeout(() => {
            setShown(n);
            sound().play(n === 3 ? "chime" : "reveal");
          }, n * 700),
        );
      }, 400);
    }
  };

  if (!q || !question) {
    return (
      <div className="space-y-3">
        <Say mood="smug">손가락이 메시지 창 위에서 멈췄지? 질문 하나만 골라라냥. 카드 세 장으로 답해 주겠다냥.</Say>
        {CONTACT_Q.map((x) => (
          <button
            key={x.id}
            onClick={() => choose(x.id)}
            className="flex w-full items-center gap-3 rounded-2xl border border-peach/30 bg-surface-2 p-4 text-left active:scale-[0.98]"
          >
            <span className="text-2xl">{x.emoji}</span>
            <span className="flex-1 text-[15px] font-bold">{x.label}</span>
            <span className="text-peach" aria-hidden>
              ›
            </span>
          </button>
        ))}
      </div>
    );
  }

  const verdict = cards ? verdictOf(cards) : null;
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-center text-[15px] font-bold">
        {question.emoji} {question.label}
      </p>
      {!cards && (
        <>
          <Say mood="talk">{picks.length === 0 ? "그 사람 얼굴 떠올리고, 끌리는 카드 세 장을 골라라냥." : picks.length === 1 ? "두 장 더." : "마지막 한 장."}</Say>
          <div className="grid grid-cols-4 gap-2.5">
            {Array.from({ length: 8 }, (_, slot) => {
              const order = picks.indexOf(slot);
              return (
                <button
                  key={slot}
                  onClick={() => pick(slot)}
                  disabled={order >= 0}
                  className={`relative aspect-[2/3] rounded-xl border-2 bg-card-front transition duration-300 ${order >= 0 ? "-translate-y-2 border-peach shadow-[0_0_20px_rgba(240,207,138,0.45)]" : "border-peach/35 active:scale-95"}`}
                  aria-label={`${slot + 1}번 카드`}
                >
                  <span className="text-xl">{order >= 0 ? ["①", "②", "③"][order] : "🐾"}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {cards && (
        <div className="space-y-2.5">
          {again && <p className="text-center text-[13px] text-muted">오늘 이 질문은 이미 물어봤다냥. 카드는 하루에 한 번만 답한다냥.</p>}
          {cards.map((c, i) =>
            i < shown ? (
              <div key={i} className="chip-pop flex gap-3 rounded-2xl border border-line bg-white/[0.03] p-3.5">
                <div className="grid w-14 shrink-0 place-items-center rounded-xl border border-peach/40 bg-card-front py-2">
                  <span className="text-2xl">{TAROT[c].emoji}</span>
                  <span className="mt-0.5 text-[10px] text-peach">{TAROT[c].no}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-violet">
                    {["①", "②", "③"][i]} {POSITIONS[i]} · {TAROT[c].name}
                  </p>
                  <p className="mt-1 text-[14.5px] leading-relaxed">{i === 0 ? CONTACT[c].now : i === 1 ? CONTACT[c].heart : CONTACT[c].advice}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="h-[84px] animate-pulse rounded-2xl border border-line bg-white/[0.02]" />
            ),
          )}
          {verdict && shown >= 3 && (
            <div className="chip-pop rounded-3xl border-2 border-peach/50 bg-chemi p-5 text-center">
              <p className="text-[12px] tracking-[0.3em] text-peach/80">냥신의 답</p>
              <p className="font-ritual mt-2 text-[26px] text-white">{question.verdict[verdict]}</p>
              <p className="mt-2 text-[13.5px] text-white/80">
                {verdict === "go"
                  ? "카드 셋 중 둘이 '움직여라'를 가리킨다냥."
                  : verdict === "stop"
                    ? "카드가 '지금은 아니다'를 가리킨다냥. 아니라는 게 끝이라는 뜻은 아니다냥."
                    : "카드가 반반이다냥. 타이밍이 열쇠다냥."}
              </p>
            </div>
          )}
        </div>
      )}
      {cards && shown >= 3 && verdict && (
        <>
          <ShareLinkButton label="친구한테 결과 보내기 📤" title="냥신 연락 타로" description={`'${question.label}' 냥신의 답: ${question.verdict[verdict]} 🃏 너도 물어봐!`} />
          <button onClick={() => onStart(q === "back" ? "reunion" : "couple")} className="btn-primary w-full py-4">
            {q === "back" ? "재회 가능성 제대로 보기 🔁" : "그 사람 속마음까지 보기 💞"}
          </button>
          <button onClick={() => setQ(null)} className="w-full py-2 text-[13px] text-muted">
            ← 다른 질문 하기
          </button>
        </>
      )}
    </div>
  );
}

// ───────────── 냥신 합격 부적 ─────────────

const SUNEUNG = "2026-11-19"; // 2027학년도 수능 (교육부 발표)
const EXAMS = [{ id: "수능", date: SUNEUNG }, { id: "공무원 시험" }, { id: "자격증 시험" }, { id: "면접" }, { id: "중간·기말고사" }] as const;

const kstToday = () => {
  const k = new Date(Date.now() + 9 * 3600 * 1000);
  return k.toISOString().slice(0, 10);
};
/** Days left to 수능 (KST), or null once it has passed. */
export function suneungDday(): number | null {
  const d = Math.round((Date.parse(SUNEUNG) - Date.parse(kstToday())) / 86400000);
  return d >= 0 ? d : null;
}

function ExamCharm({ onStart }: { onStart: (mode?: Mode) => void }) {
  const savedDate = useAppStore((st) => st.me?.profile?.birthdate || st.input.me.birthdate);
  const savedName = useAppStore((st) => st.me?.profile?.name || st.input.me.name);
  const dday = suneungDday();
  const [name, setName] = useState(savedName ?? "");
  const [birthdate, setBirthdate] = useState(savedDate ?? "");
  const [exam, setExam] = useState<string>(dday !== null ? "수능" : "자격증 시험");
  const [date, setDate] = useState(dday !== null ? SUNEUNG : "");
  const [result, setResult] = useState<ExamDayResponse | null>(null);
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => () => void (img && URL.revokeObjectURL(img.url)), [img]);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const [r] = await Promise.all([todayApi.exam(birthdate, date), new Promise((res) => setTimeout(res, 900))]);
      const blob = await drawBujeok({ name: name.trim(), exam, dateLabel: r.date, ganji: r.ganji, site: siteUrl() });
      setResult(r);
      setImg({ url: URL.createObjectURL(blob), blob });
      sound().play("stamp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    if (!img) return;
    shareService.shareStory(img.blob).then((o) => {
      if (o === "shared" || o === "cancelled") return;
      // PC / no share sheet: download the PNG instead.
      const a = document.createElement("a");
      a.href = img.url;
      a.download = `냥신-합격부적-${name.trim() || "나"}.png`;
      a.click();
      setNote("부적을 저장했다냥! 배경화면으로 써라냥 🧧");
    });
  };

  if (!result || !img) {
    const ok = name.trim() && birthdate && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= kstToday();
    return (
      <div className="space-y-4">
        <Say mood="smug">{dday !== null ? `수능까지 D-${dday}다냥. ` : ""}시험 보는 사람 이름이랑 생일, 시험 날짜를 대라냥. 냥신이 직접 부적을 써 주겠다냥 🧧</Say>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 10))} placeholder="시험 보는 사람 이름" className={inputCls} />
        <DateTimeSelects type="date" initial={savedDate ?? ""} onChange={setBirthdate} />
        <div className="flex flex-wrap gap-2">
          {EXAMS.map((x) => (
            <button
              key={x.id}
              onClick={() => {
                setExam(x.id);
                if ("date" in x && dday !== null) setDate(x.date);
                else if (date === SUNEUNG) setDate("");
              }}
              className={`rounded-full border px-3.5 py-2 text-[14px] ${exam === x.id ? "border-pink bg-pink/15 font-bold text-ink" : "border-line text-muted"}`}
            >
              {x.id}
              {"date" in x && dday !== null ? ` · D-${dday}` : ""}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-muted">시험 날짜</span>
          <input type="date" value={date} min={kstToday()} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </label>
        {error && <p className="text-sm text-pink">{error}</p>}
        <button onClick={go} disabled={!ok || busy} className="btn-primary w-full py-4">
          {busy ? "냥신이 부적을 쓰는 중…" : "합격 부적 받기 🧧"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <img src={img.url} alt={`${name}의 합격 부적`} className="chip-pop mx-auto w-[72%] rounded-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]" />
      <button onClick={save} className="btn-primary w-full py-4">
        부적 저장 · 공유하기 🧧
      </button>
      {note && <p className="fade-up -mt-2 text-center text-xs text-peach">{note}</p>}
      <div className="rounded-3xl border border-line bg-white/[0.03] p-5">
        <p className="text-[13px] text-muted">
          시험날 {result.date} · {result.ganji}
        </p>
        <p className="font-ritual mt-1 text-[21px]">
          <span className="text-gradient">{result.title}</span>
        </p>
        <p className="mt-2 text-[14.5px] leading-relaxed">{result.line}</p>
        <p className="mt-3 rounded-xl bg-white/[0.05] px-3 py-2 text-[14px] font-semibold">🐾 냥신의 한 수: {result.tip}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-[13px]">
        <span className="rounded-full bg-violet/10 px-3 py-1.5">🎨 {result.item}</span>
        <span className="rounded-full bg-violet/10 px-3 py-1.5">⏰ 기운이 오르는 때: {result.time}</span>
        <span className="rounded-full bg-violet/10 px-3 py-1.5">🍽️ 전날 저녁: {result.food}</span>
      </div>
      <p className="text-center text-[12px] text-muted">부적은 마음을 다잡는 상징이다냥. 붙는 건 네 실력이다냥 💪</p>
      <button onClick={() => onStart("newyear")} className="w-full rounded-2xl border border-line py-3.5 text-sm font-semibold">
        새해 합격운·12달 흐름까지 보기 🎍
      </button>
    </div>
  );
}
