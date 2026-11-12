"use client";

import { useEffect, useState } from "react";
import { nyang } from "@/lib/config";
import { kstDay } from "@/lib/kst";
import { sound } from "@/lib/sound";
import { albumApi, type AlbumCard, type AlbumView } from "@/services/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { LoginSheet } from "./LoginSheet";
import { Say } from "./Nyang";

/** One cat, as the album shows it once collected. */
function CatDetail({ c, isNew, mine }: { c: AlbumCard; isNew?: boolean; mine?: boolean }) {
  return (
    <div className={`rounded-3xl border border-peach/40 bg-gradient-to-b from-[#24130d] to-[#120a07] p-5 text-center ${isNew ? "chip-pop" : ""}`}>
      <p className="text-[12px] text-muted">
        도감 No.{String(c.no).padStart(2, "0")} · {c.ganji}({c.hanja})일주
      </p>
      <div className="mt-2 text-[56px] leading-none" aria-hidden>
        {c.icon}
      </div>
      <p className="font-ritual mt-2 text-[22px] text-peach">{c.name}</p>
      {mine && <p className="mt-1 text-[12.5px] font-bold text-pink">✨ 네 일주 고양이다냥</p>}
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {c.keys.map((k) => (
          <span key={k} className="rounded-full bg-violet/15 px-2.5 py-1 text-[12px]">
            #{k}
          </span>
        ))}
      </div>
      <p className="mt-3 text-left text-[13.5px] leading-relaxed text-ink/85">{c.trait}</p>
      <p className="mt-2 text-[12.5px] text-muted">기 센 순위 60일주 중 {c.rank}위</p>
    </div>
  );
}

/**
 * 고양이 도감 모으기 (회원): one 일주 cat a day, never the same twice; 60 make the set. 10 · 30 · 60 cats add 냥 for
 * members who joined with Kakao / Naver / Google.
 */
export function CatAlbum() {
  const me = useAppStore((s) => s.me);
  const [login, setLogin] = useState(false);
  const [v, setV] = useState<AlbumView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<AlbumCard | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pick, setPick] = useState<AlbumCard | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me) return;
    albumApi
      .get()
      .then(setV)
      .catch((e) => setError(e instanceof Error ? e.message : "도감을 열 수 없다냥."));
  }, [me]);

  if (!me)
    return (
      <div className="space-y-4">
        <Say mood="smug">60일주 고양이를 하루 한 장씩 모으는 도감이다냥. 모은 고양이는 네 계정에 저장되니까 로그인부터 하라냥 🐾</Say>
        <ul className="space-y-1.5 rounded-2xl border border-line bg-surface p-4 text-[13.5px] leading-relaxed">
          <li>🎴 하루 한 장, 이미 모은 고양이는 안 나온다냥</li>
          <li>✨ 첫 장은 네 일주 고양이 (기본 정보에 생일이 있으면)</li>
          <li>🎁 10마리 · 30마리 · 60마리 모으면 냥 선물</li>
        </ul>
        <button onClick={() => setLogin(true)} className="btn-primary w-full py-4">
          로그인하고 모으기
        </button>
        <LoginSheet open={login} onClose={() => setLogin(false)} />
      </div>
    );
  if (error) return <Say mood="wow">{error}</Say>;
  if (!v) return <p className="animate-pulse py-10 text-center text-[14px] text-muted">도감 펼치는 중…</p>;

  const owned = new Map(v.cards.map((c) => [c.no, c]));
  const today = v.cards.find((c) => c.day === kstDay());
  const draw = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    sound().play("flip");
    try {
      const r = await albumApi.draw();
      setV(r);
      if (r.card) {
        setFresh(r.card);
        setPick(null);
      }
      if (r.error) setMsg(r.error);
      else {
        sound().play("reveal");
        const parts = [r.first ? "첫 장은 네 일주 고양이다냥! 🐾" : r.cards.length === 1 ? "첫 고양이가 들어왔다냥! 🐾" : `${r.cards.length}번째 고양이가 들어왔다냥!`];
        if (r.reward) parts.push(`🎁 ${r.cards.length}마리 달성 선물 ${nyang(r.reward)}을 복주머니에 넣었다냥`);
        setMsg(parts.join(" "));
        if (r.reward) useAppStore.setState((s) => ({ me: s.me ? { ...s.me, coins: r.balance } : s.me }));
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };
  const shown = pick ?? fresh ?? (v.drawnToday ? today : null) ?? null;
  const pct = Math.round((v.cards.length / v.size) * 100);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] font-bold">
            🗂️ 모은 고양이 {v.cards.length} / {v.size}
          </p>
          <p className="text-[12.5px] text-muted">{pct}%</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-pink to-peach transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {v.milestones.map((m) => (
            <span key={m.at} className={`rounded-full px-2.5 py-1 text-[12px] ${m.done ? "bg-peach/20 font-bold text-peach" : "border border-line text-muted"}`}>
              {m.done ? "✅" : "🎁"} {m.at}마리{v.rewards ? ` · ${nyang(m.coins)}` : ""}
            </span>
          ))}
        </div>
        {!v.rewards && <p className="mt-1.5 text-[12px] text-muted">냥 선물은 카카오·네이버·구글로 가입한 회원에게 준다냥. 모으기는 누구나 된다냥.</p>}
      </div>

      {v.cards.length < v.size &&
        (v.drawnToday ? (
          <p className="rounded-xl bg-white/[0.04] py-3 text-center text-[13.5px] text-muted">오늘 고양이는 뽑았다냥. 내일 또 와라냥 🐾</p>
        ) : (
          <button onClick={draw} disabled={busy} className="btn-primary w-full py-4 text-[16px]">
            {busy ? "고양이 부르는 중…" : "🎴 오늘의 고양이 뽑기"}
          </button>
        ))}
      {v.cards.length >= v.size && <Say mood="wow">60마리를 다 모았다냥! 너는 이제 냥신 도감의 주인이다냥 👑</Say>}
      {msg && <p className="fade-up text-center text-[13.5px] font-semibold text-peach">{msg}</p>}
      {shown && <CatDetail c={shown} isNew={shown === fresh} mine={v.mine === shown.no} />}

      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: v.size }, (_, k) => {
          const c = owned.get(k + 1);
          return (
            <button
              key={k}
              onClick={() => c && setPick(c)}
              disabled={!c}
              aria-label={c ? `${c.no}번 ${c.name}` : `${k + 1}번 아직 못 모음`}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-center ${
                c ? (shown?.no === c.no ? "border-peach bg-peach/15" : "border-violet/40 bg-white/[0.04]") : "border-line/60 bg-black/20"
              }`}
            >
              <span className={`text-[20px] leading-none ${c ? "" : "opacity-25 grayscale"}`}>{c ? c.icon : "❔"}</span>
              <span className="mt-0.5 text-[9.5px] text-muted">{String(k + 1).padStart(2, "0")}</span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-[12px] text-muted">모은 고양이를 누르면 다시 볼 수 있다냥</p>
    </div>
  );
}
