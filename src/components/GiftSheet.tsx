"use client";

import { useEffect, useState } from "react";
import { GIFT_MAX, GIFT_QUICK, nyang } from "@/lib/config";
import { useLive } from "@/lib/liveSettings";
import { costLine } from "@/lib/pricing";
import { giftApi, type GiftView, type SentGift } from "@/services/apiClient";
import { siteUrl } from "@/services/shareService";
import { useAppStore } from "@/store/useAppStore";
import { BottomSheet, ShareLinkButtons } from "./BottomSheet";
import { Coin } from "./Coin";
import { LoginSheet } from "./LoginSheet";
import { Say } from "./Nyang";

// Not ?gift=: that one already carries the 가입 선물 amount back from a login.
export const giftLink = (id: string) => `${siteUrl()}?present=${id}`;
const STATUS: Record<SentGift["status"], string> = { open: "기다리는 중", claimed: "받았다냥", cancelled: "취소함" };
const fieldCls = "w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-pink/60";

/**
 * A gift being written when the 냥 ran short: kept through 충전 (a Toss payment leaves the page and comes back to
 * 내 점괘함), so the sheet reopens with it. Stale after half an hour.
 */
const DRAFT = "nyang-gift-draft";
type Draft = { coins: number; message: string; name: string; at: number };
export function takeGiftDraft(peek = false): Draft | null {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT) ?? "null") as Draft | null;
    if (!peek) sessionStorage.removeItem(DRAFT);
    return d && Date.now() - d.at < 30 * 60_000 ? d : null;
  } catch {
    return null;
  }
}
function keepGiftDraft(d: Omit<Draft, "at">) {
  try {
    sessionStorage.setItem(DRAFT, JSON.stringify({ ...d, at: Date.now() }));
  } catch {
    /* storage unavailable: the in-page return still keeps it */
  }
}

/**
 * 냥 선물하기 (from 내 점괘함): pick 1–10냥 and a line, get a link to send; unclaimed gifts can be taken back. Any
 * amount can be picked; when the 복주머니 holds less, the button goes to 충전 (`onCharge`, with the 냥 still missing)
 * and the sheet comes back afterwards with the gift as it was written.
 */
export function GiftSendSheet({ open, onClose, onCharge, note }: { open: boolean; onClose: () => void; onCharge: (need: number) => void; note?: string | null }) {
  const me = useAppStore((s) => s.me);
  const { costs } = useLive().pricing;
  const setCoins = useAppStore((s) => s.setCoins);
  const [coins, setCoinsPick] = useState(GIFT_QUICK[0]);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState<{ id: string; coins: number } | null>(null);
  const [list, setList] = useState<SentGift[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meName = me?.profile?.name || me?.nickname || "";
  useEffect(() => {
    if (!open) return;
    setSent(null);
    setError(null);
    const d = takeGiftDraft();
    if (d) {
      setCoinsPick(Math.min(GIFT_MAX, Math.max(1, d.coins)));
      setMessage(d.message);
      setName(d.name || meName);
    } else setName((n) => n || meName);
    giftApi
      .sent()
      .then((r) => setList(r.gifts))
      .catch(() => null);
  }, [open, meName]);
  if (!me) return null;

  const short = Math.max(0, coins - me.coins);
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await giftApi.send(coins, message, name);
      setCoins(r.balance);
      setSent({ id: r.id, coins });
      setList((l) => [{ id: r.id, coins, message, status: "open", created_at: new Date().toISOString(), claimed_at: null }, ...l]);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };
  const charge = () => {
    keepGiftDraft({ coins, message, name });
    onCharge(short);
  };
  const cancel = async (id: string) => {
    try {
      const r = await giftApi.cancel(id);
      setCoins(r.balance);
      setList((l) => l.map((g) => (g.id === id ? { ...g, status: "cancelled" } : g)));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const step = (d: number) => setCoinsPick((c) => Math.min(GIFT_MAX, Math.max(1, c + d)));
  const stepCls = "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-[22px] leading-none text-ink transition active:scale-90 disabled:opacity-30";

  return (
    <BottomSheet open={open} title="🎁 냥 선물하기" onClose={onClose}>
      {sent ? (
        <div className="space-y-4">
          <Say mood="happy">
            복채 {nyang(sent.coins)}을 선물 주머니에 넣었다냥. 이제 링크를 보내라냥. 받는 사람이 로그인하면 바로 들어간다냥 🐾
          </Say>
          <ShareLinkButtons
            label="카카오톡으로 선물 보내기"
            title={`🎁 ${name || "누군가"}님이 냥신 점괘 복채를 보냈다냥`}
            description={`복채 ${nyang(sent.coins)} — 점괘 ${sent.coins === 1 ? "한 번" : `${sent.coins}번`} 볼 수 있다냥.${message ? ` "${message}"` : ""}`}
            url={giftLink(sent.id)}
          />
          <button onClick={() => setSent(null)} className="w-full py-2 text-[13px] text-muted underline underline-offset-4">
            하나 더 보내기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[13.5px] leading-relaxed text-muted">
            내 복주머니의 냥을 친구에게 보낸다냥. 한 번 여는 값은 {costLine(costs)}이다냥. 지금 <Coin /> {nyang(me.coins)} 있다냥.
          </p>
          {note && <p className="fade-up rounded-xl border border-peach/40 bg-peach/10 px-3 py-2 text-center text-[13px] font-semibold text-peach">{note}</p>}
          <div className="rounded-2xl border border-line bg-black/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => step(-1)} disabled={coins <= 1} className={stepCls} aria-label="1냥 빼기">
                −
              </button>
              <div className="text-center">
                <p className="text-[30px] font-extrabold leading-none text-peach">
                  <Coin /> {nyang(coins)}
                </p>
                <p className="mt-1.5 text-[12px] text-muted">점괘 {coins === 1 ? "한 번" : `${coins}번`} 볼 수 있다냥</p>
              </div>
              <button onClick={() => step(1)} disabled={coins >= GIFT_MAX} className={stepCls} aria-label="1냥 더하기">
                +
              </button>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {GIFT_QUICK.map((c) => (
                <button
                  key={c}
                  onClick={() => setCoinsPick(c)}
                  className={`rounded-xl border py-2 text-[14px] font-bold transition ${coins === c ? "border-peach bg-peach/10 text-peach" : "border-line text-muted"}`}
                >
                  {nyang(c)}
                </button>
              ))}
            </div>
          </div>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 12))} placeholder="보내는 사람 이름" className={fieldCls} />
          <input value={message} onChange={(e) => setMessage(e.target.value.slice(0, 40))} placeholder="한마디 (선택) 예: 생일 축하해!" className={fieldCls} />
          {error && <p className="text-sm text-pink">{error}</p>}
          {short > 0 ? (
            <div>
              <p className="mb-2 text-center text-[13px] text-pink">
                복주머니에 {nyang(me.coins)}뿐이라 <b>{nyang(short)}</b>이 모자라다냥
              </p>
              <button onClick={charge} className="btn-primary w-full py-3.5">
                냥이 부족합니다 · 충전 후 보내기
              </button>
            </div>
          ) : (
            <button onClick={send} disabled={busy || !name.trim()} className="btn-primary w-full py-3.5">
              {busy ? "선물 싸는 중…" : `${nyang(coins)} 선물하기`}
            </button>
          )}
          <p className="text-[11.5px] leading-relaxed text-muted/80">보낸 냥은 상대가 받기 전까지 취소할 수 있어요. 선물로 보내거나 받은 냥은 환불되지 않아요.</p>
        </div>
      )}
      {list.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[13px] font-semibold text-muted">보낸 선물</p>
          <ul className="divide-y divide-line rounded-2xl border border-line text-[13px]">
            {list.slice(0, 8).map((g) => (
              <li key={g.id} className="flex items-center gap-2 px-3 py-2.5">
                <span className="font-semibold">
                  <Coin /> {nyang(g.coins)}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted">{g.message || "한마디 없음"}</span>
                <span className={g.status === "claimed" ? "text-peach" : "text-muted"}>{STATUS[g.status]}</span>
                {g.status === "open" && (
                  <button onClick={() => cancel(g.id)} className="text-[12px] text-muted underline underline-offset-2">
                    취소
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </BottomSheet>
  );
}

/** Opened from a gift link: who sent what, and 받기 (after a login if needed — the link waits in sessionStorage). */
export function GiftClaimSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const me = useAppStore((s) => s.me);
  const meLoaded = useAppStore((s) => s.meLoaded);
  const setCoins = useAppStore((s) => s.setCoins);
  const [gift, setGift] = useState<GiftView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id || !meLoaded) return;
    setError(null);
    setDone(null);
    giftApi
      .get(id)
      .then(setGift)
      .catch((e: Error) => {
        setError(e.message);
        // a link that leads nowhere shouldn't open again on the next visit
        try {
          sessionStorage.removeItem("nyang-gift");
        } catch {
          /* ignore */
        }
      });
  }, [id, meLoaded, me?.id]);
  const finish = () => {
    try {
      sessionStorage.removeItem("nyang-gift");
    } catch {
      /* ignore */
    }
    onClose();
  };
  const claim = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const r = await giftApi.claim(id);
      if (r.balance !== undefined) setCoins(r.balance);
      setDone(r.coins);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <>
      <BottomSheet open={id !== null && !loginOpen} title="🎁 냥 선물" onClose={finish}>
        {done !== null ? (
          <div className="space-y-4 text-center">
            <p className="text-[44px]">
              <Coin />
            </p>
            <Say mood="happy">복채 {nyang(done)} 받았다냥! 복주머니에 넣어 뒀다냥. 보고 싶은 점괘를 골라라냥 🐾</Say>
            <button onClick={finish} className="btn-primary w-full py-3.5">
              점괘 고르러 가기
            </button>
          </div>
        ) : error ? (
          <Say mood="wow">{error}</Say>
        ) : !gift ? (
          <p className="py-8 text-center text-sm text-muted">선물 주머니를 여는 중…</p>
        ) : gift.mine ? (
          <Say mood="smug">네가 보낸 선물이다냥 ({nyang(gift.coins)} · {gift.status === "open" ? "아직 안 받았다냥" : gift.status === "claimed" ? "받아 갔다냥" : "취소했다냥"}).</Say>
        ) : gift.claimedByMe ? (
          <Say mood="happy">이미 받은 선물이다냥. 복주머니를 확인해 봐라냥.</Say>
        ) : gift.status !== "open" ? (
          <Say mood="wow">{gift.status === "claimed" ? "이미 누가 받아 간 선물이다냥." : "보낸 사람이 취소한 선물이다냥."}</Say>
        ) : (
          <div className="space-y-4">
            <div className="rounded-3xl border border-peach/40 bg-gradient-to-b from-[#2a1510] to-surface p-5 text-center">
              <p className="text-[13px] text-muted">{gift.from}님이 보낸 복채</p>
              <p className="mt-2 text-[36px] font-extrabold text-peach">
                <Coin /> {nyang(gift.coins)}
              </p>
              <p className="mt-1 text-[13px] text-muted">점괘 {gift.coins === 1 ? "한 번" : `${gift.coins}번`} 볼 수 있다냥</p>
              {gift.message && <p className="mt-3 rounded-xl bg-black/25 px-3 py-2 text-[14px]">“{gift.message}”</p>}
            </div>
            {me ? (
              <button onClick={claim} disabled={busy} className="btn-primary w-full py-4 text-[16px]">
                {busy ? "받는 중…" : "선물 받기"}
              </button>
            ) : (
              <button onClick={() => setLoginOpen(true)} className="btn-primary w-full py-4 text-[16px]">
                로그인하고 받기 (3초)
              </button>
            )}
          </div>
        )}
      </BottomSheet>
      <LoginSheet open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
