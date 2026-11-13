"use client";

import { useEffect, useState } from "react";
import { PRODUCTS } from "@/lib/config";
import { heroMode, type HomeSettings } from "@/lib/home";
import type { Banner } from "@/lib/pricing";
import type { Mode } from "@/models/types";
import { Note, Section, call, ghost, small, useConfirm, when } from "./ui";

type Coupon = { code: string; coins: number; max_uses: number | null; used: number; expires_at: string | null; social_only: boolean; active: boolean; note: string | null; created_at: string };

const TONES: { id: Banner["tone"]; label: string; icon: string }[] = [
  { id: "info", label: "공지", icon: "📢" },
  { id: "event", label: "이벤트", icon: "🎉" },
  { id: "warn", label: "점검·주의", icon: "🛠️" },
];
const state = (c: Coupon) =>
  !c.active ? ["꺼짐", "text-muted"] : c.expires_at && Date.parse(c.expires_at) < Date.now() ? ["기간 끝", "text-muted"] : c.max_uses !== null && c.used >= c.max_uses ? ["소진", "text-muted"] : ["사용 중", "text-peach"];

const HEROES: HomeSettings["hero"][] = ["auto", "off", ...(Object.keys(PRODUCTS) as Mode[])];
const heroLabel = (h: HomeSettings["hero"]) => (h === "auto" ? "자동 (12~1월엔 신년운세)" : h === "off" ? "없음" : `${PRODUCTS[h].emoji} ${PRODUCTS[h].name}`);

/** 공지 · 쿠폰 탭. */
export function PromoTab() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [saved, setSaved] = useState<Banner | null>(null);
  const [home, setHome] = useState<HomeSettings | null>(null);
  const [homeSaved, setHomeSaved] = useState<HomeSettings | null>(null);
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [c, setC] = useState({ code: "", coins: "1", maxUses: "", expires: "", socialOnly: true, note: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [ask, dialog] = useConfirm();

  const loadCoupons = () => call<{ coupons: Coupon[] }>("/api/admin/coupons").then((r) => setCoupons(r.coupons));
  useEffect(() => {
    call<{ banner: Banner; home: HomeSettings }>("/api/admin/settings")
      .then((r) => (setBanner(r.banner), setSaved(r.banner), setHome(r.home), setHomeSaved(r.home)))
      .catch((e: Error) => setMsg({ ok: false, text: e.message }));
    loadCoupons().catch((e: Error) => setMsg({ ok: false, text: e.message }));
  }, []);

  const saveBanner = async (on: boolean) => {
    if (!banner) return;
    const next = { ...banner, on };
    const ok = await ask({
      title: on ? "공지를 띄울까요?" : "공지를 내릴까요?",
      rows: on ? [["종류", TONES.find((t) => t.id === next.tone)!.label], ["문구", next.text], ...(next.link ? ([["링크", next.link]] as [string, string][]) : [])] : [["공지", saved?.text || "-"]],
      message: on ? "홈 화면 맨 위에 바로 보여요. 손님이 ✕로 닫으면 그 방문 동안은 안 보여요." : undefined,
      confirm: on ? "홈에 띄우기" : "내리기",
    });
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await call<{ banner: Banner }>("/api/admin/settings", { method: "POST", body: JSON.stringify({ key: "banner", value: next }) });
      setBanner(r.banner);
      setSaved(r.banner);
      setMsg({ ok: true, text: on ? "공지를 홈에 띄웠어요." : "공지를 내렸어요." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  };

  const saveHome = async () => {
    if (!home) return;
    const now = heroMode(home);
    const ok = await ask({
      title: "홈 첫 화면 주인공을 바꿀까요?",
      rows: [
        ["고른 것", heroLabel(home.hero)],
        ["지금 홈에 보일 것", now ? PRODUCTS[now].name : "주인공 없음 (연애 점괘 버튼이 맨 위)"],
      ],
      message: "손님 화면에는 15초 안에 바뀌어요.",
      confirm: "바꾸기",
    });
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await call<{ home: HomeSettings }>("/api/admin/settings", { method: "POST", body: JSON.stringify({ key: "home", value: home }) });
      setHome(r.home);
      setHomeSaved(r.home);
      setMsg({ ok: true, text: "홈 첫 화면 주인공을 바꿨어요." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  };

  const createCoupon = async () => {
    const coins = Number(c.coins);
    if (!(coins >= 1 && coins <= 100)) return setMsg({ ok: false, text: "쿠폰 냥은 1~100냥으로 넣어 주세요." });
    const expiresAt = c.expires ? new Date(`${c.expires}T23:59:59+09:00`).toISOString() : "";
    const ok = await ask({
      title: "쿠폰을 만들까요?",
      rows: [
        ["코드", c.code.trim().toUpperCase() || "자동으로 만들기 (8자리)"],
        ["주는 냥", `${coins}냥`],
        ["선착순", c.maxUses ? `${c.maxUses}명` : "제한 없음"],
        ["마감", c.expires ? `${c.expires} 밤 12시까지` : "없음"],
        ["받을 수 있는 회원", c.socialOnly ? "카카오·네이버·구글 가입" : "모든 회원"],
        ...(c.note ? ([["메모", c.note]] as [string, string][]) : []),
      ],
      message: "회원 한 명당 한 번만 받을 수 있어요. 만든 뒤에도 끄고 켤 수 있어요.",
      confirm: "쿠폰 만들기",
    });
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await call<{ code: string }>("/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify({ code: c.code, coins, maxUses: c.maxUses ? Number(c.maxUses) : null, expiresAt, socialOnly: c.socialOnly, note: c.note }),
      });
      setMsg({ ok: true, text: `쿠폰 ${r.code}를 만들었어요. 손님은 복주머니 → "쿠폰 코드가 있나요?"에 넣으면 돼요.` });
      setC({ code: "", coins: "1", maxUses: "", expires: "", socialOnly: true, note: "" });
      await loadCoupons();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  };

  const toggle = async (x: Coupon) => {
    const ok = await ask({ title: x.active ? "쿠폰을 끌까요?" : "쿠폰을 다시 켤까요?", rows: [["코드", x.code], ["받은 회원", `${x.used}명`]], confirm: x.active ? "끄기" : "켜기", danger: x.active });
    if (!ok) return;
    try {
      await call("/api/admin/coupons", { method: "PATCH", body: JSON.stringify({ code: x.code, active: !x.active }) });
      await loadCoupons();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  return (
    <div className="space-y-4">
      {dialog}
      {msg && <Note tone={msg.ok ? "ok" : "error"}>{msg.text}</Note>}

      <Section
        title="📢 홈 공지 · 이벤트 배너"
        sub="홈 화면 맨 위에 한 줄로 떠요. 점검 안내, 이벤트, 새 점괘 소식에 쓰세요."
        right={<span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${saved?.on ? "bg-peach/20 text-peach" : "bg-white/5 text-muted"}`}>{saved?.on ? "떠 있음" : "꺼짐"}</span>}
      >
        {!banner ? (
          <p className="text-[13px] text-muted">불러오는 중…</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setBanner({ ...banner, tone: t.id })}
                  className={`rounded-xl border py-2 text-[13px] font-semibold ${banner.tone === t.id ? "border-peach bg-peach/10 text-peach" : "border-line text-muted"}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <textarea
              value={banner.text}
              onChange={(e) => setBanner({ ...banner, text: e.target.value })}
              placeholder="예: 11월 13일 수능 응원! 합격 부적 무료로 써 준다냥 🧧"
              maxLength={120}
              rows={2}
              className={`${small} resize-none`}
            />
            <input value={banner.link} onChange={(e) => setBanner({ ...banner, link: e.target.value })} placeholder="링크 (선택, 예: /?game=exam 또는 https://…)" className={small} />
            {banner.text && (
              <div className="rounded-xl border border-line p-2.5">
                <p className="mb-1 text-[11px] text-muted">미리보기</p>
                <p className="text-[13px]">
                  {TONES.find((t) => t.id === banner.tone)!.icon} {banner.text}
                  {banner.link && <span className="ml-1 font-semibold text-peach underline">자세히</span>}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => saveBanner(true)} disabled={busy || !banner.text.trim()} className="btn-primary flex-1 py-2.5">
                {saved?.on ? "공지 바꾸기" : "홈에 띄우기"}
              </button>
              {saved?.on && (
                <button onClick={() => saveBanner(false)} disabled={busy} className={`${ghost} flex-1`}>
                  내리기
                </button>
              )}
            </div>
          </div>
        )}
      </Section>

      <Section
        title="🌟 홈 첫 화면 주인공"
        sub="홈 맨 위에 크게 띄울 점괘예요. 자동이면 12월~1월엔 신년운세, 그 밖엔 주인공 없이 연애 점괘 버튼이 맨 위예요."
        right={<span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[12px] font-bold text-peach">{homeSaved ? heroLabel(homeSaved.hero).replace(/ \(.*\)$/, "") : "…"}</span>}
      >
        {!home ? (
          <p className="text-[13px] text-muted">불러오는 중…</p>
        ) : (
          <div className="flex gap-2">
            <select value={home.hero} onChange={(e) => setHome({ hero: e.target.value as HomeSettings["hero"] })} className={small} aria-label="홈 첫 화면 주인공">
              {HEROES.map((h) => (
                <option key={h} value={h}>
                  {heroLabel(h)}
                </option>
              ))}
            </select>
            <button onClick={saveHome} disabled={busy || home.hero === homeSaved?.hero} className="btn-primary shrink-0 px-4 py-2">
              저장
            </button>
          </div>
        )}
      </Section>

      <Section title="🎟️ 쿠폰 만들기" sub="코드를 넣은 회원에게 냥을 줘요. 회원 한 명당 한 번. 인스타·카톡 이벤트에 쓰세요.">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] text-muted">
              코드 (비우면 자동)
              <input value={c.code} onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} placeholder="예: SUNEUNG" maxLength={24} className={`${small} tracking-wider`} />
            </label>
            <label className="text-[12px] text-muted">
              주는 냥
              <input value={c.coins} onChange={(e) => setC({ ...c, coins: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className={small} />
            </label>
            <label className="text-[12px] text-muted">
              선착순 (비우면 무제한)
              <input value={c.maxUses} onChange={(e) => setC({ ...c, maxUses: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="예: 100" className={small} />
            </label>
            <label className="text-[12px] text-muted">
              마감일 (비우면 없음)
              <input type="date" value={c.expires} onChange={(e) => setC({ ...c, expires: e.target.value })} className={small} />
            </label>
          </div>
          <input value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} placeholder="메모 (예: 인스타 11월 이벤트)" maxLength={60} className={small} />
          <label className="flex items-start gap-2 text-[12.5px] text-muted">
            <input type="checkbox" checked={c.socialOnly} onChange={(e) => setC({ ...c, socialOnly: e.target.checked })} className="mt-0.5" />
            <span>카카오·네이버·구글 가입 회원만 (이메일 계정은 여러 개 만들 수 있어서 막아 두는 게 안전해요)</span>
          </label>
          <button onClick={createCoupon} disabled={busy} className="btn-primary w-full py-2.5">
            다음: 확인하기
          </button>
        </div>
      </Section>

      <Section title="쿠폰 목록">
        <ul className="divide-y divide-line">
          {(coupons ?? []).map((x) => {
            const [label, cls] = state(x);
            return (
              <li key={x.code} className="py-2.5 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => copy(x.code)} className="min-w-0 truncate text-left font-mono text-[15px] font-bold tracking-wider" title="눌러서 복사">
                    {x.code} <span className="font-sans text-[11px] font-normal text-muted">{copied === x.code ? "복사됨" : "복사"}</span>
                  </button>
                  <span className={`shrink-0 text-[12px] font-bold ${cls}`}>{label}</span>
                </div>
                <p className="text-[12px] text-muted">
                  {x.coins}냥 · 받은 회원 {x.used}
                  {x.max_uses !== null ? `/${x.max_uses}` : ""}명 · {x.expires_at ? `${when(x.expires_at)}까지` : "마감 없음"} · {x.social_only ? "소셜 가입만" : "모든 회원"}
                  {x.note ? ` · ${x.note}` : ""}
                </p>
                <button onClick={() => toggle(x)} className="mt-1 rounded-lg border border-line px-2.5 py-1 text-[12px] text-muted">
                  {x.active ? "끄기" : "다시 켜기"}
                </button>
              </li>
            );
          })}
          {coupons && coupons.length === 0 && <li className="py-3 text-center text-[13px] text-muted">아직 쿠폰이 없어요.</li>}
        </ul>
      </Section>
    </div>
  );
}

type Action = { id: number; created_at: string; action: string; target: string | null; detail: string | null };

/** 작업 기록 탭: everything done from this page (and every 관리자 login), newest first. */
export function LogTab() {
  const [list, setList] = useState<Action[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  useEffect(() => {
    call<{ actions: Action[] }>("/api/admin/actions")
      .then((r) => setList(r.actions))
      .catch((e: Error) => setError(e.message));
  }, []);
  const kinds = [...new Set((list ?? []).map((a) => a.action))];
  const shown = (list ?? []).filter((a) => !filter || a.action === filter);
  return (
    <Section title="🗂️ 작업 기록" sub="환불, 냥 지급·회수, 가격·세일·공지·쿠폰 변경, 엑셀 내려받기, 관리자 로그인이 남아요. 모르는 로그인이 보이면 관리자 키를 바꾸세요.">
      {error && <p className="text-[13px] text-pink">{error}</p>}
      {kinds.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {["", ...kinds].map((k) => (
            <button key={k || "all"} onClick={() => setFilter(k)} className={`rounded-lg border px-2.5 py-1 text-[12px] ${filter === k ? "border-peach text-peach" : "border-line text-muted"}`}>
              {k || "전체"}
            </button>
          ))}
        </div>
      )}
      <ul className="divide-y divide-line">
        {shown.map((a) => (
          <li key={a.id} className="py-2 text-[13px]">
            <div className="flex justify-between gap-2">
              <span className={`font-bold ${/실패/.test(a.action) ? "text-pink" : ""}`}>{a.action}</span>
              <span className="shrink-0 text-[12px] text-muted">{when(a.created_at)}</span>
            </div>
            {a.target && <p className="truncate text-[12.5px]">{a.target}</p>}
            {a.detail && <p className="whitespace-pre-wrap break-words text-[12px] text-muted">{a.detail}</p>}
          </li>
        ))}
        {list && shown.length === 0 && <li className="py-3 text-center text-[13px] text-muted">기록이 없어요.</li>}
      </ul>
    </Section>
  );
}
