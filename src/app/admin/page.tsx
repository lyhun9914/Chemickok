"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminInstall } from "@/components/admin/AdminInstall";
import { ErrorsPanel } from "@/components/admin/ErrorsPanel";
import { FeedbackTab } from "@/components/admin/FeedbackTab";
import { FunnelPanel } from "@/components/admin/FunnelPanel";
import { MembersTab } from "@/components/admin/MembersTab";
import { PaymentsTab } from "@/components/admin/PaymentsTab";
import { PricesTab } from "@/components/admin/PricesTab";
import { LogTab, PromoTab } from "@/components/admin/PromoTab";
import { ShortsStudio } from "@/components/admin/ShortsStudio";
import { TodoTab, dueCount, useTodo } from "@/components/admin/TodoTab";
import { daysLeft, ADMIN_TODOS } from "@/lib/adminTodo";
import { Note, Section, box, call, input, num, won } from "@/components/admin/ui";

type Stats = Record<string, number | boolean>;
type Day = Record<string, number | string>;
type Live = { sale: { on: boolean; label: string; to: string }; banner: { on: boolean; text: string } };

const TABS = [
  ["home", "🏠 홈"],
  ["todo", "✅ 할 일"],
  ["pay", "💳 결제·환불"],
  ["members", "👥 회원"],
  ["feedback", "📮 의견"],
  ["prices", "🪙 가격·세일"],
  ["promo", "📢 공지·쿠폰"],
  ["flow", "📈 이용 흐름"],
  ["errors", "🚨 오류"],
  ["log", "🗂️ 기록"],
  ["shorts", "🎬 쇼츠"],
] as const;
type Tab = (typeof TABS)[number][0];

/** 오늘 vs 어제: one number with how it moved. */
function DayTile({ label, today, yesterday, money }: { label: string; today: unknown; yesterday: unknown; money?: boolean }) {
  const t = Number(today ?? 0);
  const y = Number(yesterday ?? 0);
  const f = money ? won : num;
  return (
    <div className={box}>
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-1 text-[18px] font-bold">{f(t)}</p>
      <p className="text-[11.5px] text-muted">어제 {f(y)}</p>
    </div>
  );
}

function HomeTab({ go, todoCount, fbCount }: { go: (t: Tab) => void; todoCount: number; fbCount: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [day, setDay] = useState<{ today: Day; yesterday: Day } | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([call<Stats>("/api/admin/stats"), call<{ today: Day; yesterday: Day }>("/api/admin/day"), call<Live>("/api/admin/settings")])
      .then(([s, d, l]) => (setStats(s), setDay(d), setLive(l)))
      .catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <Note tone="error">{error}</Note>;
  if (!stats || !day) return <p className="py-6 text-center text-muted">불러오는 중…</p>;
  const t = day.today;
  const y = day.yesterday;

  const alerts: { tone: "warn" | "error" | "info"; text: string; tab?: Tab }[] = [];
  if (todoCount > 0) alerts.push({ tone: "warn", text: `✅ 지금 할 일이 ${todoCount}개 있어요.`, tab: "todo" });
  if (fbCount > 0) alerts.push({ tone: "info", text: `📮 새 의견이 ${fbCount}건 왔어요.`, tab: "feedback" });
  if (stats.testMode) alerts.push({ tone: "warn", text: "최근 하루 안에 테스트 결제가 있었어요. 실제 결제 키로 바뀌었는지 확인하세요." });
  if (Number(stats.errors24h) > 0) alerts.push({ tone: "error", text: `최근 24시간 오류 ${num(stats.errors24h)}건이 있어요.`, tab: "errors" });
  if (live?.sale.on) alerts.push({ tone: "info", text: `🎉 세일 켜짐: ${live.sale.label || "충전 세일"}${live.sale.to ? ` (${new Date(live.sale.to).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}까지)` : ""}`, tab: "prices" });
  if (live?.banner.on) alerts.push({ tone: "info", text: `📢 홈 공지: ${live.banner.text}`, tab: "promo" });

  const tiles: [string, string][] = [
    ["7일 매출", won(stats.sales7d)],
    ["30일 매출", won(stats.sales30d)],
    ["누적 매출", won(stats.salesAll)],
    ["30일 결제", `${num(stats.paidCount30d)}건`],
    ["30일 환불", won(stats.refunds30d)],
    ["전체 회원", `${num(stats.users)}명`],
    ["7일 새 회원", `${num(stats.users7d)}명`],
    ["회원이 가진 냥", `${num(stats.coinsOut)}냥`],
    ["30일 쓴 냥", `${num(stats.coinsSpent30d)}냥`],
    ["저장된 점괘", `${num(stats.readings)}개`],
    ["맞궁합 초대장 (답함)", `${num(stats.pairs)} (${num(stats.pairsAnswered)})`],
    ["냥 선물", `${num(stats.gifts)}건`],
  ];

  return (
    <div className="space-y-4">
      {alerts.map((a) => (
        <button key={a.text} onClick={() => a.tab && go(a.tab)} className="block w-full text-left">
          <Note tone={a.tone}>
            {a.text}
            {a.tab && <span className="ml-1 underline">보기 →</span>}
          </Note>
        </button>
      ))}

      <div>
        <h2 className="mb-2 text-[15px] font-bold">오늘 ({String(t.day)})</h2>
        <div className="grid grid-cols-2 gap-2">
          <DayTile label="매출" today={t.sales} yesterday={y.sales} money />
          <DayTile label="결제" today={t.paidCount} yesterday={y.paidCount} />
          <DayTile label="방문" today={t.visits} yesterday={y.visits} />
          <DayTile label="면담 시작 → 결과" today={t.started} yesterday={y.started} />
          <DayTile label="새 회원" today={t.newUsers} yesterday={y.newUsers} />
          <DayTile label="환불" today={t.refunds} yesterday={y.refunds} money />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["pay", "💳 결제 찾기 · 환불"],
            ["members", "👥 회원 찾기 · 냥 지급"],
            ["prices", "🪙 가격 · 세일 바꾸기"],
            ["promo", "📢 공지 · 쿠폰 만들기"],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button key={k} onClick={() => go(k)} className="rounded-2xl border border-peach/30 bg-peach/5 px-3 py-3.5 text-left text-[14px] font-semibold active:scale-[0.98]">
            {l}
          </button>
        ))}
      </div>

      <Section title="전체 숫자">
        <div className="grid grid-cols-2 gap-2">
          {tiles.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-black/25 px-3 py-2.5">
              <p className="text-[11.5px] text-muted">{label}</p>
              <p className="mt-0.5 text-[15px] font-bold">{value}</p>
            </div>
          ))}
        </div>
      </Section>
      <BackupSection />
      <p className="text-center text-[12px] text-muted">매일 아침 9시에 어제 요약이 관리자 메일로 와요.</p>
    </div>
  );
}

/** 전체 백업: the free database plan keeps no backups, so one file now and then; the 할 일 list remembers when. */
function BackupSection() {
  const { done, load } = useTodo();
  const def = ADMIN_TODOS.find((t) => t.id === "backup")!;
  const left = done ? daysLeft(def, done.backup) : undefined;
  const days = left === undefined || left === null ? null : def.every - left;
  const mark = () => setTimeout(load, 2500);
  return (
    <Section title="💾 전체 백업" sub="회원·냥·결제·점괘 기록 전체를 파일 하나로 받아요. 무료 요금제는 자동 백업이 없으니 일주일에 한 번 받아 두세요.">
      <a href="/api/admin/backup" download onClick={mark} className="btn-primary block w-full py-3 text-center text-[14px]">
        백업 파일 내려받기
      </a>
      <p className={`mt-2 text-[12px] ${days === null || days >= 7 ? "text-pink" : "text-muted"}`}>
        {done === null ? "\u00a0" : days === null ? "아직 백업을 받은 적이 없어요." : days === 0 ? "오늘 백업을 받았어요." : `마지막 백업: ${days}일 전${days >= 7 ? " — 새로 받아 두세요" : ""}`}
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-muted">회원 개인정보가 들어 있는 파일이에요. 다른 사람에게 보내지 말고 본인만 여는 곳(개인 클라우드 등)에 보관하세요.</p>
    </Section>
  );
}

/** 관리자 화면: 탭으로 나눈 운영 도구. 탭은 주소 끝(#pay 등)에 남아서 새로고침해도 그대로예요. */
export default function AdminPage() {
  const [state, setState] = useState<{ configured: boolean; admin: boolean } | null>(null);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [errCount, setErrCount] = useState(0);
  const [todoCount, setTodoCount] = useState(0);
  const [fbCount, setFbCount] = useState(0);

  const go = useCallback((t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const h = location.hash.slice(1);
    if (TABS.some(([k]) => k === h)) setTab(h as Tab);
    call<{ configured: boolean; admin: boolean }>("/api/admin/login")
      .then(setState)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!state?.admin) return;
    call<{ errors: { count: number }[] }>("/api/admin/errors?hours=24").then((r) => setErrCount(r.errors.reduce((n, e) => n + e.count, 0))).catch(() => null);
    call<{ done: Record<string, string> }>("/api/admin/todo").then((r) => setTodoCount(dueCount(r.done))).catch(() => null);
    call<{ items: { kind: string; status: string }[] }>("/api/admin/feedback?days=60")
      .then((r) => setFbCount(r.items.filter((i) => i.kind !== "rating" && i.status === "new").length))
      .catch(() => null);
  }, [state?.admin]);

  const login = async () => {
    setBusy(true);
    setError(null);
    try {
      await call("/api/admin/login", { method: "POST", body: JSON.stringify({ key }) });
      setState({ configured: true, admin: true });
      setKey("");
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };
  const logout = async () => {
    await call("/api/admin/logout", { method: "POST" }).catch(() => null);
    setState({ configured: true, admin: false });
  };
  const openMember = useCallback(
    (id: string) => {
      setOpenUser(id);
      go("members");
    },
    [go],
  );
  const clearOpen = useCallback(() => setOpenUser(null), []);

  if (!state) return <main className="p-6 text-muted">{error ?? "불러오는 중…"}</main>;

  if (!state.admin) {
    return (
      <main className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[22px] font-bold">🔐 관리자</h1>
          <AdminInstall />
        </div>
        {!state.configured ? (
          <p className="text-[14px] leading-relaxed text-muted">
            Vercel 환경 변수에 <b className="text-ink">ADMIN_KEY</b>(16자 이상)를 넣고 다시 배포하면 열립니다. 방법은 docs/GUIDE.md에 있어요.
          </p>
        ) : (
          <>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="관리자 키"
              className={input}
              autoComplete="current-password"
            />
            <button onClick={login} disabled={busy || !key} className="btn-primary w-full py-3">
              들어가기
            </button>
          </>
        )}
        {error && <p className="text-sm text-pink">{error}</p>}
      </main>
    );
  }

  return (
    <main className="pb-16">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <button onClick={() => go("home")} className="min-w-0 truncate whitespace-nowrap text-[17px] font-bold">
            🐾 냥신 관리자
          </button>
          <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
            <AdminInstall />
            <a href={process.env.NEXT_PUBLIC_SITE_URL || "/"} target="_blank" rel="noreferrer" className="text-[12.5px] text-muted underline">
              사이트 보기
            </a>
            <button onClick={logout} className="text-[12.5px] text-muted underline">
              나가기
            </button>
          </div>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 [scrollbar-width:none]" aria-label="관리 메뉴">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => go(k)}
              className={`relative shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${tab === k ? "border-peach bg-peach/15 text-peach" : "border-line text-muted"}`}
              aria-current={tab === k ? "page" : undefined}
            >
              {label}
              {k === "errors" && errCount > 0 && <span className="ml-1 rounded-full bg-pink px-1.5 text-[10.5px] text-white">{errCount}</span>}
              {k === "todo" && todoCount > 0 && <span className="ml-1 rounded-full bg-pink px-1.5 text-[10.5px] text-white">{todoCount}</span>}
              {k === "feedback" && fbCount > 0 && <span className="ml-1 rounded-full bg-pink px-1.5 text-[10.5px] text-white">{fbCount}</span>}
            </button>
          ))}
        </nav>
      </header>

      <div className="space-y-4 p-4">
        {tab === "home" && <HomeTab go={go} todoCount={todoCount} fbCount={fbCount} />}
        {tab === "todo" && <TodoTab go={(t) => go(t as Tab)} onCount={setTodoCount} />}
        {tab === "pay" && <PaymentsTab onOpenUser={openMember} />}
        {tab === "members" && <MembersTab openId={openUser} onOpened={clearOpen} />}
        {tab === "feedback" && <FeedbackTab onCount={setFbCount} onOpenUser={openMember} />}
        {tab === "prices" && <PricesTab />}
        {tab === "promo" && <PromoTab />}
        {tab === "flow" && <FunnelPanel />}
        {tab === "errors" && <ErrorsPanel onCount={setErrCount} />}
        {tab === "log" && <LogTab />}
        {tab === "shorts" && <ShortsStudio />}
      </div>
    </main>
  );
}
