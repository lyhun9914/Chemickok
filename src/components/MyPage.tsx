"use client";

import { useCallback, useEffect, useState } from "react";
import { GIFTS_ON, INVITE_COINS, PRODUCTS, nyang } from "@/lib/config";
import { MBTI_TYPES } from "@/lib/questions";
import type { Gender, Mode, PersonInput } from "@/models/types";
import { accountApi, coinApi, type CoinHistoryRow, type ReadingSummary, type Wallet } from "@/services/apiClient";
import { shareService } from "@/services/shareService";
import { useAppStore } from "@/store/useAppStore";
import { useBack } from "@/lib/back";
import { useLive } from "@/lib/liveSettings";
import { WalletSheet, useSocialLabel } from "./CoinShop";
import { GiftSendSheet, takeGiftDraft } from "./GiftSheet";
import { DateTimeSelects } from "./DateTimeSelects";
import { FunSection } from "./MyFun";
import { Nyang } from "./Nyang";
import { Coin } from "./Coin";
import { Overlay } from "./Overlay";

const fieldCls = "w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px] text-ink outline-none focus:border-pink/60";
const PROVIDER_LABEL: Record<string, string> = { kakao: "카카오", naver: "네이버", google: "구글", email: "이메일", dev: "테스트" };

/** One line of 복주머니 history. */
function ledgerLabel(r: CoinHistoryRow): string {
  switch (r.reason) {
    case "charge":
      return "충전";
    case "spend":
      return `📜 ${PRODUCTS[r.ref.split(":")[0] as Mode]?.name ?? "점괘"} 열기`;
    case "bonus":
      return r.ref === "welcome"
        ? "🎁 가입 선물"
        : r.ref === "joined"
          ? "🎁 초대받아 가입 선물"
          : r.ref.startsWith("streak:")
            ? "📅 출석 선물"
            : r.ref.startsWith("coupon:")
              ? `🎟️ 쿠폰 ${r.ref.slice(7)}`
              : r.ref.startsWith("album:")
                ? `🗂️ 고양이 도감 ${r.ref.slice(6)}마리 선물`
                : "🤝 친구 초대 선물";
    case "gift":
      return r.ref.startsWith("send:") ? "🎁 선물 보냄" : r.ref.startsWith("recv:") ? "🎁 선물 받음" : "🎁 선물 취소 (돌려받음)";
    case "refund":
      return "↩️ 환불";
    case "expire":
      return "⏳ 유효기간 지남 (충전 1년)";
    default:
      return "🛠 조정";
  }
}

/** 내 복주머니: balance, 충전, recent history, and the 친구 초대 link. */
function WalletSection() {
  const me = useAppStore((s) => s.me)!;
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  /** 충전 started from a gift that ran short: how many 냥 it needs; the gift sheet comes back after */
  const [giftNeed, setGiftNeed] = useState(0);
  const [giftNote, setGiftNote] = useState<string | null>(null);
  const social = useSocialLabel();
  const { costs } = useLive().pricing;
  const oneCost = Math.min(...(Object.keys(costs) as Mode[]).filter((m) => m !== "couple").map((m) => costs[m]));
  useEffect(() => {
    if (!open) coinApi.wallet().then(setWallet).catch(() => null);
    shareService.prepareKakao().catch(() => null);
  }, [open, me.coins]);
  // back from a Toss 충전 that a short gift started (the page was left): the gift sheet again, as it was written
  useEffect(() => {
    if (!GIFTS_ON) return;
    const d = takeGiftDraft(true);
    if (!d) return;
    if (me.coins >= d.coins) setGiftNote(`충전 완료! 복주머니에 ${nyang(me.coins)} 있다냥. 이제 보내기만 하면 된다냥 🐾`);
    setGiftOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const link = `${window.location.origin}/?ref=${me.refCode}`;
  const invite = () =>
    shareService
      .shareKakao({ title: "냥신 점괘 초대장 🐾", description: `골목 끝 고양이 점집이다냥. 이 링크로 가입하면 복채 ${nyang(INVITE_COINS)}을 더 얹어 준다냥 🎁`, url: link })
      .then((o) => o === "copied" && setNote("링크를 복사했다냥 📋"));
  const history = wallet?.history ?? [];
  const paid = wallet?.paid ?? [];
  // 충전 냥 lapsing within 30 days
  const soon = paid.filter((l) => Date.parse(l.expiresAt) - Date.now() < 30 * 86400000);

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-muted">👛 내 복주머니</h2>
      <div className="rounded-2xl border border-violet/35 bg-gradient-to-b from-[#24130d] to-[#120a07] p-4">
        <div className="flex items-center justify-between">
          <p className="text-[28px] font-extrabold leading-none text-peach">
            <Coin /> {nyang(me.coins)}
          </p>
          <button onClick={() => setOpen(true)} className="btn-primary px-5 py-2.5 text-sm">
            충전하기
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[12px] text-muted">
            점괘 하나 {nyang(oneCost)} · 궁합 {nyang(costs.couple)}
          </p>
          {GIFTS_ON && (
            <button onClick={() => setGiftOpen(true)} className="rounded-full border border-peach/40 px-3 py-1 text-[12px] font-semibold text-peach">
              🎁 냥 선물하기
            </button>
          )}
        </div>
        {paid.length > 0 && (
          <div className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2 text-[12px] leading-relaxed text-muted">
            {soon.length > 0 && (
              <p className="mb-1 font-semibold text-peach">
                ⏳ 충전한 냥 {nyang(soon.reduce((a, l) => a + l.left, 0))}이 {fmt(soon[0].expiresAt)}에 사라진다냥. 그 전에 써라냥
              </p>
            )}
            <p className="font-semibold text-ink/80">충전한 냥 유효기간 (충전일부터 1년)</p>
            {paid.map((l, i) => (
              <p key={i}>
                · {fmt(l.at)} 충전 {nyang(l.coins)} 중 {nyang(l.left)} 남음 → {fmt(l.expiresAt)}까지
              </p>
            ))}
            {(wallet?.free ?? 0) > 0 && <p>· 무료로 받은 냥 {nyang(wallet!.free!)} → 기한 없음</p>}
          </div>
        )}
        {history.length > 0 && (
          <ul className="mt-3 divide-y divide-violet/15 border-t border-violet/15 text-[13px]">
            {history.slice(0, more ? 30 : 4).map((r, i) => (
              <li key={i} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate">{ledgerLabel(r)}</span>
                <span className="text-[11.5px] text-muted">{fmt(r.created_at)}</span>
                <span className={`w-14 text-right font-semibold ${r.delta > 0 ? "text-peach" : "text-muted"}`}>
                  {r.delta > 0 ? "+" : ""}
                  {nyang(r.delta)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {history.length > 4 && !more && (
          <button onClick={() => setMore(true)} className="mt-1 w-full py-1 text-center text-[12px] text-muted underline underline-offset-2">
            내역 더 보기
          </button>
        )}
      </div>

      {INVITE_COINS > 0 && wallet && (
        <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
          <p className="text-[14.5px] font-bold">🤝 친구 초대하고 {nyang(INVITE_COINS)}씩 받기</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            내 링크로 들어온 친구가 {social}로 처음 가입하면 둘 다 {nyang(INVITE_COINS)}씩 받는다냥. (지금까지 {wallet.invites}명 · 최대 {wallet.inviteLimit}명)
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={invite} className="rounded-xl bg-[#FEE500] py-2.5 text-[13.5px] font-bold text-[#191600]">
              카카오톡으로 초대
            </button>
            <button
              onClick={() =>
                navigator.clipboard
                  ?.writeText(link)
                  .then(() => setNote("초대 링크를 복사했다냥 📋"))
                  .catch(() => setNote(link))
              }
              className="rounded-xl border border-line py-2.5 text-[13.5px] font-semibold"
            >
              링크 복사
            </button>
          </div>
          {note && <p className="fade-up mt-2 break-all text-center text-xs text-peach">{note}</p>}
        </div>
      )}
      <WalletSheet
        open={open}
        need={giftNeed}
        why={giftNeed > 0 ? `🎁 선물할 냥이 ${nyang(giftNeed)} 모자라다냥. 채우면 선물 창으로 바로 돌아간다냥` : undefined}
        onClose={() => {
          setOpen(false);
          // back out of 충전 without paying: the gift as it was, to send a smaller one or close
          if (giftNeed > 0) {
            setGiftNeed(0);
            setGiftOpen(true);
          }
        }}
        onCharged={(b) => {
          if (giftNeed <= 0) return;
          setGiftNeed(0);
          setOpen(false);
          setGiftNote(`충전 완료! 복주머니에 ${nyang(b)} 있다냥. 이제 보내기만 하면 된다냥 🐾`);
          setGiftOpen(true);
        }}
      />
      <GiftSendSheet
        open={GIFTS_ON && giftOpen}
        note={giftNote}
        onClose={() => {
          setGiftOpen(false);
          setGiftNote(null);
        }}
        onCharge={(need) => {
          setGiftOpen(false);
          setGiftNote(null);
          setGiftNeed(need);
          setOpen(true);
        }}
      />
    </section>
  );
}

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

function ProfileForm({ initial, onSaved }: { initial: PersonInput | null; onSaved: (p: PersonInput) => void }) {
  const [p, setP] = useState<PersonInput>(initial ?? { name: "", gender: "female", birthdate: "", birthtime: "", mbti: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (x: Partial<PersonInput>) => setP((cur) => ({ ...cur, ...x }));
  const setBirthdate = useCallback((birthdate: string) => setP((cur) => ({ ...cur, birthdate })), []);
  const setBirthtime = useCallback((birthtime: string) => setP((cur) => ({ ...cur, birthtime })), []);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      onSaved((await accountApi.saveProfile(p)).profile);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="space-y-3">
      <label className="block text-xs text-muted">
        이름
        <input className={`${fieldCls} mt-1`} value={p.name} maxLength={12} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {(["female", "male", "other"] as Gender[]).map((g) => (
          <button key={g} onClick={() => set({ gender: g })} className={`rounded-xl border py-2 text-sm ${p.gender === g ? "border-pink bg-pink/15" : "border-line text-muted"}`}>
            {{ female: "여성", male: "남성", other: "기타" }[g]}
          </button>
        ))}
      </div>
      <div className="text-xs text-muted">
        생년월일 (양력)
        <div className="mt-1">
          <DateTimeSelects type="date" initial={initial?.birthdate ?? ""} onChange={setBirthdate} />
        </div>
      </div>
      <div className="text-xs text-muted">
        태어난 시간 (선택)
        <div className="mt-1">
          <DateTimeSelects type="time" initial={initial?.birthtime ?? ""} onChange={setBirthtime} />
        </div>
      </div>
      <div className="text-xs text-muted">
        혈액형 (선택)
        <div className="mt-1 grid grid-cols-5 gap-2">
          {(["A", "B", "O", "AB", ""] as const).map((b) => (
            <button key={b || "none"} onClick={() => set({ blood: b })} className={`rounded-xl border py-2 text-sm ${(p.blood ?? "") === b ? "border-pink bg-pink/15 text-ink" : "border-line text-muted"}`}>
              {b ? `${b}형` : "모름"}
            </button>
          ))}
        </div>
      </div>
      <label className="block text-xs text-muted">
        MBTI (선택)
        <select className={`${fieldCls} mt-1`} value={p.mbti ?? ""} onChange={(e) => set({ mbti: e.target.value })}>
          <option value="">모름</option>
          {MBTI_TYPES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      {error && <p className="text-sm text-pink">{error}</p>}
      <button onClick={save} disabled={busy || !p.name.trim() || !p.birthdate} className="btn-primary w-full py-3">
        {busy ? "저장 중…" : "기본 정보 저장"}
      </button>
    </div>
  );
}

/** 내 점괘함: saved readings, 기본 정보, logout, 회원 탈퇴. */
export function MyPage() {
  const { me, meLoaded, setMe, setScreen, openSaved, reset } = useAppStore();
  const [readings, setReadings] = useState<ReadingSummary[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  useBack(true, () => setScreen("landing"));
  useBack(confirmLeave, () => setConfirmLeave(false));

  useEffect(() => {
    if (!me) return;
    accountApi
      .readings()
      .then((r) => setReadings(r.readings))
      .catch((e: Error) => setError(e.message));
  }, [me]);

  if (!me && !meLoaded) return <main className="flex-1" />;
  if (!me) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <Nyang mood="wow" size={90} />
        <p className="mt-4 font-semibold">로그인이 풀렸다냥</p>
        <button onClick={() => setScreen("landing")} className="btn-primary mt-6 px-8 py-3">
          처음으로
        </button>
      </main>
    );
  }

  const open = async (id: string) => {
    try {
      openSaved((await accountApi.reading(id)).reading);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("이 점괘를 점괘함에서 지울까요? 지우면 다시 볼 수 없어요.")) return;
    await accountApi.deleteReading(id).catch(() => null);
    setReadings((r) => r?.filter((x) => x.id !== id) ?? null);
  };
  const logout = async () => {
    await accountApi.logout().catch(() => null);
    setMe(null);
    reset();
  };
  const withdraw = async () => {
    setWithdrawError(null);
    try {
      await accountApi.withdraw();
    } catch (e) {
      setWithdrawError((e as Error).message || "탈퇴하지 못했다냥. 잠시 뒤 다시 해 줘라냥.");
      return;
    }
    const via = PROVIDER_LABEL[me.provider];
    try {
      sessionStorage.setItem(
        "nyang-notice",
        `탈퇴가 끝났다냥. 점괘함과 냥이 모두 지워졌다냥 🐾${me.provider === "email" ? "" : ` 같은 ${via} 계정으로 다시 로그인하면 새 회원으로 가입된다냥.`}`,
      );
    } catch {
      /* storage unavailable */
    }
    setMe(null);
    reset();
    window.location.href = "/";
  };

  return (
    <main className="flex-1 px-5 pb-10 pt-4">
      <button onClick={() => setScreen("landing")} className="py-2 text-sm text-muted">
        ← 처음으로
      </button>
      <div className="mt-2 flex items-center gap-3">
        <Nyang mood="happy" size={56} />
        <div>
          <p className="text-lg font-bold">{me.profile?.name || me.nickname || "손님"}의 점괘함</p>
          <p className="text-xs text-muted">{PROVIDER_LABEL[me.provider] ?? me.provider} 로그인</p>
        </div>
      </div>

      {/* 내 계정: the 별명 and email the login service gave (what 네이버 로그인 검수 checks as 제공 정보 활용처) */}
      <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface text-[13px]">
        <div className="flex justify-between gap-3 px-4 py-2.5">
          <dt className="shrink-0 text-muted">닉네임</dt>
          <dd className="min-w-0 truncate font-semibold">{me.nickname || "-"}</dd>
        </div>
        <div className="flex justify-between gap-3 px-4 py-2.5">
          <dt className="shrink-0 text-muted">이메일</dt>
          <dd className="min-w-0 truncate font-semibold">{me.email || "제공 안 함"}</dd>
        </div>
        <p className="px-4 py-2 text-[11.5px] leading-relaxed text-muted">
          {me.provider === "email" ? "가입한 이메일이에요." : `${PROVIDER_LABEL[me.provider] ?? me.provider}에서 받은 정보예요.`} 이메일은 결제·환불 문의 때 회원을 확인하는 데 써요.
        </p>
      </dl>

      <WalletSection />

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-muted">📜 내가 본 점괘</h2>
        {error && <p className="mb-2 text-sm text-pink">{error}</p>}
        {readings === null ? (
          <p className="py-6 text-center text-sm text-muted">불러오는 중…</p>
        ) : readings.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-5 text-center">
            <p className="text-sm text-muted">아직 복채 낸 점괘가 없다냥.</p>
            <button onClick={() => setScreen("landing")} className="btn-primary mt-4 px-6 py-2.5 text-sm">
              🕯️ 면담하러 가기
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {readings.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
                <span className="text-2xl">{PRODUCTS[r.mode]?.emoji ?? "📜"}</span>
                <button onClick={() => open(r.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-semibold">{r.title}</p>
                  <p className="text-xs text-muted">{fmt(r.created_at)}</p>
                </button>
                <button onClick={() => remove(r.id)} className="px-1 text-xs text-muted" aria-label="삭제">
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FunSection />

      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">📇 기본 정보</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs text-peach">
              {me.profile ? "수정" : "입력하기"}
            </button>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          {editing ? (
            <ProfileForm
              initial={me.profile}
              onSaved={(profile) => {
                setMe({ ...me, profile });
                setEditing(false);
              }}
            />
          ) : me.profile ? (
            <p className="text-sm leading-relaxed">
              {me.profile.name} · {{ female: "여성", male: "남성", other: "기타" }[me.profile.gender]} · {me.profile.birthdate.replaceAll("-", ".")}
              {me.profile.birthtime ? ` ${me.profile.birthtime}` : ""}
              {me.profile.blood ? ` · ${me.profile.blood}형` : ""}
              {me.profile.mbti ? ` · ${me.profile.mbti}` : ""}
              <span className="mt-1 block text-xs text-muted">면담할 때 이 정보로 바로 시작해요.</span>
            </p>
          ) : (
            <p className="text-sm text-muted">아직 저장된 기본 정보가 없어요. 첫 면담을 마치면 자동으로 저장돼요.</p>
          )}
        </div>
      </section>

      <section className="mt-8 flex items-center justify-between text-xs text-muted">
        <button onClick={logout} className="underline underline-offset-2">
          로그아웃
        </button>
        <button onClick={() => setConfirmLeave(true)} className="underline underline-offset-2">
          회원 탈퇴
        </button>
      </section>

      {confirmLeave && (
        <Overlay>
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmLeave(false)}>
            <div className="fade-up w-full max-w-[480px] rounded-t-3xl bg-surface p-6 pb-8" onClick={(e) => e.stopPropagation()}>
              <p className="text-lg font-bold">정말 탈퇴할 거냥?</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                기본 정보와 점괘함의 점괘, 복주머니, 고양이 도감, 내가 만든 퀴즈와 케미표에 넣은 내 정보가 모두 바로 삭제되고 되돌릴 수 없어요. 결제 기록은 전자상거래법에 따라 5년간 회원 정보 없이 보관돼요.
                {me.coins > 0 && (
                  <b className="mt-2 block text-peach">
                    복주머니에 남은 {nyang(me.coins)}도 함께 사라져요. 충전한 냥을 환불받으려면 탈퇴 전에 고객문의로 요청해 주세요.
                  </b>
                )}
              </p>
              {me.provider !== "email" && (
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                  같은 {PROVIDER_LABEL[me.provider] ?? me.provider} 계정으로 다시 로그인하면 새 회원으로 가입돼요. 가입 선물은 처음 가입할 때 한 번만 드려요.
                </p>
              )}
              {withdrawError && <p className="mt-3 text-sm text-pink">{withdrawError}</p>}
              <button onClick={withdraw} className="mt-5 w-full rounded-2xl bg-pink/90 py-3.5 font-bold text-white">
                탈퇴하기
              </button>
              <button onClick={() => setConfirmLeave(false)} className="mt-2 w-full py-3 text-sm text-muted">
                취소
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </main>
  );
}
