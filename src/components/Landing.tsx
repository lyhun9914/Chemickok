"use client";

import { useEffect, useState } from "react";
import { streakNow } from "@/lib/daily";
import { PRODUCTS, WELCOME_COINS, isFortune, nyang } from "@/lib/config";
import { liveProduct, sellPacks, useLive } from "@/lib/liveSettings";
import { NoticeBanner } from "./NoticeBanner";
import type { Mode } from "@/models/types";
import { useAppStore } from "@/store/useAppStore";
import { enterThroughDoors } from "./Backdrop";
import { WalletSheet } from "./CoinShop";
import { LoginSheet } from "./LoginSheet";
import { MethodSection } from "./MethodSection";
import { MiniGameSheet, type MiniGame, suneungDday } from "./MiniGames";
import { GiftClaimSheet } from "./GiftSheet";
import { PairSheet } from "./PairSheet";
import { Nyang } from "./Nyang";
import { SoundToggle } from "./SoundToggle";
import { sound } from "@/lib/sound";
import { Talisman } from "./Talisman";
import { TypeCarousel } from "./TypeCarousel";
import { Coin } from "./Coin";
import { InstallHelp } from "./InstallPrompt";
import { AlbumQuest } from "./AlbumQuest";
import { SuggestCard } from "./Feedback";

const MENU: { title: string; sub: string; modes: Mode[] }[] = [
  { title: "💞 연애 점괘", sub: "그 사람, 그 인연, 다시 올 사람까지", modes: ["solo", "couple", "reunion", "spouse"] },
  { title: "📜 사주 · 운세 감정", sub: "만세력으로 원국을 세워 십성 · 용신 · 신살 · 대운까지 짚는 정통 감정서", modes: ["newyear", "saju", "daeun"] },
];


/** 가볍게 한 점: one card per row, in this order (고양이 도감 모으기 lives in the top bar as a daily quest) */
const MINI: { id: MiniGame; emoji: string; name: string; sub: string }[] = [
  { id: "today", emoji: "🗓️", name: "오늘의 운세", sub: "총운 · 재물 · 연애 · 일 · 건강, 하루 한 번" },
  { id: "exam", emoji: "🧧", name: "냥신 합격 부적", sub: "이름 넣으면 냥신이 직접 써 주는 부적 + 시험날 일진" },
  { id: "room", emoji: "💬", name: "단톡방 케미표", sub: "링크 하나로 우리 방 궁합표 · 짝꿍 · 앙숙 · 분위기 메이커" },
  { id: "quiz", emoji: "❓", name: "나를 얼마나 아냥?", sub: "7문제 퀴즈로 찐친 순위 매기기" },
  { id: "ilju", emoji: "🐈", name: "일주 고양이 도감", sub: "60일주 중 내 고양이 · 기 센 순위" },
  { id: "contact", emoji: "🃏", name: "할까? 말까?", sub: "고백 · 선톡 · 재회… 카드 세 장으로 답한다냥" },
  { id: "tarot", emoji: "🎴", name: "오늘의 타로", sub: "15장 중 2장 · 하루 한 번" },
  { id: "zodiac", emoji: "🐾", name: "띠별 운세", sub: "12띠 오늘 일진 · 무료" },
  { id: "daily", emoji: "🔮", name: "오늘의 연애운", sub: "이름 · 생일 · 혈액형으로 10초 컷" },
  { id: "name", emoji: "✍️", name: "이름 궁합", sub: "그 시절 획수 궁합 · 무료" },
];
/** games a ?game= link may open: the cards, plus the top bar's 도감 */
const LINKABLE: MiniGame[] = [...MINI.map((g) => g.id), "album"];

export function Landing() {
  const { setScreen, me, providers, startInterview } = useAppStore();
  // Came back from a result (back gesture): offer it again.
  const hasReading = useAppStore((s) => Boolean(s.teaser || s.fortune));
  const readingName = useAppStore((s) => s.input.me.name);
  const readingPaid = useAppStore((s) => s.level === "full");
  const lastReading = hasReading ? { name: readingName, paid: readingPaid } : null;
  const [game, setGame] = useState<MiniGame | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [pairId, setPairId] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  // Opened from a link: the 맞궁합 신청서 or a mini game (the gift sheet reads its own).
  const deepLink = useAppStore((s) => s.deepLink);
  useEffect(() => {
    if (!deepLink) return;
    if (deepLink.pair) setPairId(deepLink.pair);
    if (deepLink.game && LINKABLE.includes(deepLink.game as MiniGame)) setGame(deepLink.game as MiniGame);
    // 단톡방 케미표 · 퀴즈 links open their game on that room / quiz
    if (deepLink.room || deepLink.quiz) {
      setLinkId(deepLink.room ?? deepLink.quiz ?? null);
      setGame(deepLink.room ? "room" : "quiz");
    }
    if (deepLink.pair || deepLink.game || deepLink.room || deepLink.quiz) useAppStore.setState({ deepLink: deepLink.gift ? { gift: deepLink.gift } : null });
  }, [deepLink]);
  // 출석 streak lives in this browser only; read after mount and whenever a mini game closes.
  const [{ streak, checkedToday }, setStreak] = useState({ streak: 0, checkedToday: false });
  useEffect(() => setStreak(streakNow()), [game]);
  const [dday, setDday] = useState<number | null>(null);
  useEffect(() => setDday(suneungDday()), []);

  const openGame = (g: MiniGame) => {
    sound().play("slide");
    setLinkId(null);
    setGame(g);
  };

  // Saved 기본 정보 → the interview skips straight past name/birth. A product card also fixes the mode.
  const start = (mode?: Mode) => {
    setGame(null);
    enterThroughDoors(() => startInterview({ mode, me: me?.profile }));
  };

  const live = useLive();
  const minCost = Math.min(...Object.values(live.pricing.costs));
  const unit = live.pricing.packs[0].price / live.pricing.packs[0].coins;
  const maxSave = Math.max(0, ...sellPacks({ ...live, sale: null }).map((p) => Math.round((1 - p.price / p.coins / unit) * 100)));

  return (
    <main className="enter-dark relative flex flex-1 flex-col px-5 pt-4">
      <NoticeBanner />
      {/* clear of the top bar and the 현판: one by the corner, one down by 냥신 */}
      <Talisman className="absolute left-3 top-14" />
      <Talisman className="absolute right-4 top-40 opacity-70 [animation-delay:-2s]" />
      <div className="relative z-10 flex h-9 items-center justify-end gap-1.5 min-[380px]:gap-2">
        <InstallHelp />
        <SoundToggle />
        {providers.length > 0 && <AlbumQuest onOpen={() => openGame("album")} refresh={game === "album"} />}
        {providers.length > 0 &&
          (me ? (
            <>
              <button onClick={() => setWalletOpen(true)} className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-peach/40 bg-surface/90 px-3 text-[13px] font-bold text-peach" aria-label="내 복주머니">
                <Coin /> {nyang(me.coins)}
              </button>
              <button
                onClick={() => setScreen("my")}
                aria-label={me.news ? "내 점괘함 · 건의 답장 새 소식" : "내 점괘함"}
                className="relative h-9 shrink-0 rounded-full border border-line bg-surface/90 px-3 text-[13px] font-semibold min-[380px]:px-3.5"
              >
                📜 <span className="hidden min-[380px]:inline">내 </span>점괘함
                {me.news ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-pink ring-2 ring-[#120a07]" aria-hidden /> : null}
              </button>
            </>
          ) : (
            <button onClick={() => setLoginOpen(true)} className="h-9 rounded-full border border-line bg-surface/90 px-4 text-[13px] font-semibold text-ink/80">
              로그인
            </button>
          ))}
      </div>
      <div className="fade-up text-center">
        {/* 현판: hung from two cords under the eaves, the shop's name big enough to read on a phone */}
        <div className="hyeonpan relative mx-auto mt-7 w-fit rounded-md border-2 border-[#8a6a36] bg-gradient-to-b from-[#2e1b10] to-[#170d08] px-6 pb-2.5 pt-2 shadow-[inset_0_0_0_3px_#170d08,inset_0_0_0_4px_rgba(201,162,90,0.45),0_10px_24px_-10px_rgba(0,0,0,0.9)]">
          <p className="text-[12px] tracking-[0.5em] text-violet">골목 끝 점집</p>
          <p className="font-ritual mt-0.5 text-[25px] leading-tight tracking-[0.14em] text-peach">
            <span className="text-[17px] text-violet">神</span> 냥신 점괘 <span className="text-[17px] text-violet">神</span>
          </p>
        </div>
        <div className="float mx-auto mt-3 w-fit">
          <Nyang mood="smug" size={132} />
        </div>
        <div className="relative mx-auto mt-2 w-fit max-w-[300px] rounded-2xl hanji px-4 py-3 text-[15px] font-medium text-[#2b1d16]">
          …들어왔으면 문부터 닫아라냥. 촛불 꺼진다냥. 네가 올 줄은 알고 있었다냥.
        </div>
        <h1 className="mt-5 text-[23px] font-extrabold leading-tight tracking-tight min-[360px]:text-[27px]">
          네 인연, 네 팔자, 네 앞날까지
          <br />
          <span className="text-gradient">냥신은 이미 보고 있다냥</span>
        </h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-muted">
          연애 · 궁합 · 재회 · 배우자 · 사주 · 대운
          <br />
          생년월일로 원국을 세우고, 면담으로 맞춰 본다냥
        </p>
      </div>

      {lastReading && (
        <button
          onClick={() => setScreen("result")}
          className="fade-up mt-6 flex w-full items-center gap-3 rounded-2xl border border-violet/40 bg-surface/80 px-4 py-3 text-left active:scale-[0.98]"
        >
          <span className="text-2xl">📜</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-bold">{lastReading.name}의 점괘로 돌아가기</span>
            <span className="block text-[12.5px] text-muted">{lastReading.paid ? "전부 열린 점괘다냥" : "보던 데서 이어 본다냥"}</span>
          </span>
          <span className="text-muted" aria-hidden>
            →
          </span>
        </button>
      )}
      <button onClick={() => start()} className="btn-primary glow shine mt-8 w-full py-4 text-[17px]">
        🕯️ 연애 점괘 바로 보기 (무료)
      </button>
      <button
        onClick={() => document.getElementById("menu-fortune")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className="mt-3 w-full rounded-2xl border border-violet/40 bg-surface/70 py-3.5 text-[15px] font-semibold text-peach active:scale-[0.98]"
      >
        📜 사주 · 대운 감정 보러 가기 ↓
      </button>
      <p className="mt-3 text-center text-[13px] text-muted">⏱ 약 3~4분 · 회원가입 없이 · 기본 점괘는 무료</p>
      {!me && WELCOME_COINS > 0 && providers.some((p) => p !== "email") && (
        <button
          onClick={() => setLoginOpen(true)}
          className="fade-up mt-4 flex w-full items-center gap-3 rounded-2xl border border-peach/30 bg-gradient-to-r from-[#2a1510] to-surface px-4 py-3 text-left active:scale-[0.98]"
        >
          <span className="text-2xl">🎁</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-bold text-peach">가입하면 복채 {nyang(WELCOME_COINS)} 선물</span>
            <span className="block text-[12.5px] text-muted">전체 감정서 하나는 공짜로 열린다냥 · 3초 로그인</span>
          </span>
          <span className="text-muted" aria-hidden>
            →
          </span>
        </button>
      )}

      <p className="fade-up mt-6 rounded-xl border border-violet/25 bg-white/[0.03] px-3.5 py-2.5 text-center text-[12.5px] leading-relaxed text-muted">
        <Coin /> 복채는 <b className="text-peach">냥</b>(엽전)으로 낸다냥
        {/* the code defaults are not the live prices: name a price only once /api/settings has answered */}
        {live.loaded && <> · 점괘 하나 {nyang(minCost)}부터</>}
        {live.sale ? <> · 🎉 지금 충전 세일 중이다냥</> : maxSave > 0 && <> · 묶음으로 채우면 최대 {maxSave}% 싸다냥</>}
      </p>

      {MENU.map((group, gi) => (
        <section
          key={group.title}
          id={gi ? "menu-fortune" : "menu-love"}
          className={`fade-up scroll-mt-4 ${gi ? "mt-9" : "mt-6"}`}
          style={{ animationDelay: `${0.1 + gi * 0.05}s` }}
        >
          <h2 className="text-[17px]">{group.title}</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{group.sub}</p>
          <p className="mb-3 mt-1.5 text-[12.5px] font-semibold text-peach">👆 누르면 바로 냥신 면담이 시작된다냥</p>
          <div className="space-y-3">
            {(Object.keys(PRODUCTS) as Mode[])
              .filter((m) => group.modes.includes(m))
              .map((m) => {
                const pr = liveProduct(live, m);
                return (
                  // A door, not a panel: lit edge, gradient, and a real "보기" button on the right.
                  <button
                    key={m}
                    onClick={() => start(m)}
                    className="group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border border-peach/30 bg-gradient-to-r from-[#2a1510] via-surface to-surface py-4 pl-5 pr-3.5 text-left shadow-[0_10px_28px_-16px_rgba(0,0,0,0.95)] transition hover:border-peach/60 active:scale-[0.98]"
                  >
                    <span className="absolute inset-y-3 left-0 w-1 rounded-r bg-gradient-to-b from-peach to-pink" aria-hidden />
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-peach/20 bg-black/25 text-[30px]">{pr.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-bold">
                        {pr.name}
                        {m === "newyear" && <span className="ml-1.5 inline-block whitespace-nowrap rounded-sm bg-pink px-1.5 py-0.5 align-middle text-[10.5px] font-bold text-white">NEW · 시즌</span>}
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-muted">{pr.pitch}</span>
                      {/* the price stays on one line (on a 360px phone "1냥" used to drop below on its own) */}
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                        <span className="whitespace-nowrap rounded-sm border border-violet/40 px-2 py-0.5 font-semibold text-violet">기본 무료</span>
                        <span className="whitespace-nowrap font-semibold text-peach">
                          {isFortune(m) ? "전체 감정서" : "전체 풀이"} <Coin /> {nyang(pr.coins)}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-center gap-1">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-pink to-[#8c1c13] text-[20px] font-bold leading-none text-white shadow-[0_0_14px_rgba(212,80,63,0.5)] transition group-hover:translate-x-0.5">
                        ›
                      </span>
                      <span className="text-[11px] font-bold text-peach">보기</span>
                    </span>
                  </button>
                );
              })}
          </div>
        </section>
      ))}

      <section className="fade-up mt-8" style={{ animationDelay: "0.15s" }}>
        <h2 className="text-[17px]">🎴 가볍게 한 점 · 매일 무료</h2>
        <p className="mb-3 mt-1 text-[13.5px] text-muted">하루 한 번 들르면 출석 도장을 찍어 준다냥</p>
        <div className="grid gap-2.5">
          {MINI.map((g) => (
            <button
              key={g.id}
              onClick={() => openGame(g.id)}
              className="flex items-center gap-4 rounded-2xl border border-violet/40 bg-surface px-4 py-3.5 text-left transition hover:border-peach/50 active:scale-[0.98]"
            >
              <span className="w-9 shrink-0 text-center text-3xl" aria-hidden>
                {g.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-bold">
                  {g.name}
                  {g.id === "exam" && dday !== null && (
                    <span className="ml-1.5 rounded-sm bg-pink px-1.5 py-0.5 align-middle text-[10.5px] font-bold text-white">수능 D-{dday}</span>
                  )}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  {g.id === "today" && streak ? `🐾 출석 ${streak}일째 · ${checkedToday ? "오늘 도장 완료" : "오늘 도장 받으러 가기"}` : g.sub}
                </span>
              </span>
              <span className="shrink-0 text-lg text-peach" aria-hidden>
                ›
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="fade-up mt-10" style={{ animationDelay: "0.25s" }}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[17px]">🃏 16가지 연애 팔자 카드</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">연애 점괘를 보면 이 중 한 장이 네 카드로 뽑힌다냥</p>
          </div>
          <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">👀 구경 전용</span>
        </div>
        <div className="mt-3">
          <TypeCarousel />
        </div>
        <p className="mt-2 text-center text-[12px] text-muted">👈 손가락으로 밀면 넘어간다냥 👉</p>
        <button onClick={() => start("solo")} className="btn-primary mt-3 w-full py-3.5 text-[15px]">
          🃏 내 카드 뽑으러 가기 (무료)
        </button>
      </section>

      <section className="fade-up mt-10" style={{ animationDelay: "0.3s" }}>
        <h2 className="text-[17px]">📜 감정서에 담기는 것</h2>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {[
            ["🕯️", "촛불 앞 면담", "이상해 보이는 질문마다 이유가 있다냥. 답이 해석의 근거가 된다냥"],
            ["🀄", "원국과 감정 근거", "원국 · 십성 · 용신 · 신살 · 대운을 표로 적어 준다냥"],
            ["😳", "일간 해석", '"이거 나 몰래 본 거 아니냥?" 소리 나오는 성격 풀이'],
            ["🗓️", "날짜까지 짚는 시기", "좋은 해 · 좋은 달 · 조심할 때를 숫자로 적는다냥"],
            ["💌", "그 사람의 속마음", "궁합 · 재회엔 끝내 보내지 못한 편지까지 꺼내 준다냥"],
          ].map(([icon, title, text]) => (
            <li key={title} className="flex gap-3 py-3">
              <span className="mt-0.5 text-[18px]" aria-hidden>
                {icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[14.5px] font-bold">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <MethodSection />

      <SuggestCard />

      <MiniGameSheet
        game={game}
        linkId={linkId}
        onClose={() => {
          setGame(null);
          setLinkId(null);
        }}
        onStart={start}
      />
      <LoginSheet open={loginOpen} onClose={() => setLoginOpen(false)} />
      <WalletSheet open={walletOpen} onClose={() => setWalletOpen(false)} />
      <PairSheet id={pairId} onClose={() => setPairId(null)} />
      <GiftClaimSheet id={deepLink?.gift ?? null} onClose={() => useAppStore.setState({ deepLink: null })} />
    </main>
  );
}
