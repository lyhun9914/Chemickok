"use client";

import { useEffect, useState } from "react";
import { PRODUCTS } from "@/lib/config";
import { MODES, sellPack, type Pricing, type Sale } from "@/lib/pricing";
import type { FollowUp } from "@/lib/priceFollowUps";
import type { Mode } from "@/models/types";
import { Note, Section, call, ghost, small, useConfirm, won } from "./ui";

type Settings = { pricing: Pricing; sale: Sale; defaults: Pricing };
type PackForm = { id: string; coins: string; price: string; tag: string };

const toForm = (p: Pricing) => ({
  packs: p.packs.map((x) => ({ id: x.id, coins: String(x.coins), price: String(x.price), tag: x.tag ?? "" })),
  costs: Object.fromEntries(MODES.map((m) => [m, String(p.costs[m])])) as Record<Mode, string>,
});
const fromForm = (f: ReturnType<typeof toForm>): Pricing => ({
  packs: f.packs.map((x) => ({ id: x.id, coins: Number(x.coins), price: Number(x.price), ...(x.tag.trim() ? { tag: x.tag.trim() } : {}) })),
  costs: Object.fromEntries(MODES.map((m) => [m, Number(f.costs[m])])) as Record<Mode, number>,
});
/** datetime-local ⇄ ISO, in KST */
const toLocal = (iso: string) => (iso ? new Date(Date.parse(iso) + 9 * 3600e3).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(`${v}:00+09:00`).toISOString() : "");
const kstText = (iso: string) => (iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }) : "");

/** 가격 · 세일 탭: 충전 묶음, 점괘별 냥, 충전 세일. Each save shows before → after and asks once more. */
export function PricesTab() {
  const [s, setS] = useState<Settings | null>(null);
  const [form, setForm] = useState<ReturnType<typeof toForm> | null>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  /** 가격을 바꾼 뒤 사이트 밖에서 같이 고칠 곳 (인스타 DM 답변, 릴스 캡션, 토스) */
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [ask, dialog] = useConfirm();

  const load = async () => {
    const r = await call<Settings>("/api/admin/settings");
    setS(r);
    setForm(toForm(r.pricing));
    setSale(r.sale);
  };
  useEffect(() => {
    load().catch((e: Error) => setMsg({ ok: false, text: e.message }));
  }, []);

  if (!s || !form || !sale) return <p className="py-6 text-center text-muted">불러오는 중…</p>;

  const save = async (key: "pricing" | "sale", value: unknown, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await call<Settings & { followUps?: FollowUp[] }>("/api/admin/settings", { method: "POST", body: JSON.stringify({ key, value }) });
      if (key === "pricing") setFollowUps(r.followUps ?? []);
      setS({ ...r, defaults: s.defaults });
      setForm(toForm(r.pricing));
      setSale(r.sale);
      setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  };

  const savePricing = async () => {
    const next = fromForm(form);
    const cur = s.pricing;
    const rows: [string, string][] = [];
    const ids = new Set([...cur.packs.map((p) => p.id), ...next.packs.map((p) => p.id)]);
    for (const id of ids) {
      const a = cur.packs.find((p) => p.id === id);
      const b = next.packs.find((p) => p.id === id);
      const t = (p?: { coins: number; price: number; tag?: string }) => (p ? `${p.coins}냥 ${won(p.price)}${p.tag ? ` · ${p.tag}` : ""}` : "없음");
      if (t(a) !== t(b)) rows.push([`묶음 ${b?.coins ?? a?.coins}냥`, `${t(a)} → ${t(b)}`]);
    }
    for (const m of MODES) if (cur.costs[m] !== next.costs[m]) rows.push([PRODUCTS[m].name, `${cur.costs[m]}냥 → ${next.costs[m]}냥`]);
    if (!rows.length) return setMsg({ ok: false, text: "바뀐 게 없어요." });
    const ok = await ask({
      title: "가격을 바꿀까요?",
      rows,
      message: "저장하면 바로 손님 화면에 반영돼요. 이미 충전한 냥과 열어 둔 점괘는 그대로예요. 토스 심사 중이라면 심사 때 보여 준 가격은 되도록 유지하세요.",
      confirm: "바꾼 가격 적용하기",
    });
    if (ok) await save("pricing", next, "가격을 바꿨어요. 손님 화면에 바로 반영돼요.");
  };

  const saveSale = async (on: boolean) => {
    const next = { ...sale, on };
    const what = [next.discountPct ? `${next.discountPct}% 할인` : "", next.bonusPct ? `냥 ${next.bonusPct}% 더` : ""].filter(Boolean).join(" · ") || "없음";
    const ok = await ask({
      title: on ? "세일을 켤까요?" : "세일을 끌까요?",
      rows: on
        ? [
            ["이름", next.label || "충전 세일"],
            ["혜택", what],
            ["시작", next.from ? kstText(next.from) : "지금 바로"],
            ["끝", next.to ? kstText(next.to) : "직접 끌 때까지"],
          ]
        : [["세일", `${sale.label || "충전 세일"} 끝내기`]],
      confirm: on ? "세일 켜기" : "세일 끄기",
      danger: false,
    });
    if (ok) await save("sale", next, on ? "세일을 켰어요." : "세일을 껐어요.");
  };

  const setPack = (i: number, k: keyof PackForm, v: string) => setForm({ ...form, packs: form.packs.map((p, j) => (j === i ? { ...p, [k]: k === "tag" ? v : v.replace(/\D/g, "") } : p)) });
  const unit = Number(form.packs[0]?.price) / Number(form.packs[0]?.coins) || 0;
  const salePreview = s.pricing.packs.map((p) => sellPack(p, { ...sale, on: true, from: "", to: "" }));

  return (
    <div className="space-y-4">
      {dialog}
      {msg && <Note tone={msg.ok ? "ok" : "error"}>{msg.text}</Note>}
      {followUps.length > 0 && (
        <Section
          title={`📌 같이 고칠 곳 ${followUps.length}개`}
          sub="사이트 화면은 저절로 바뀌었어요. 사이트 밖에 적어 둔 가격은 직접 고쳐야 해요. 같은 내용을 관리자 메일로도 보냈어요."
          right={
            <button onClick={() => setFollowUps([])} className={ghost}>
              다 고쳤어요
            </button>
          }
        >
          <ol className="space-y-3">
            {followUps.map((f, i) => (
              <li key={i} className="rounded-xl border border-line p-3">
                <p className="text-[14px] font-semibold">
                  {i + 1}. {f.where}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.why}</p>
                {f.text && (
                  <div className="mt-2 rounded-lg bg-black/30 p-2.5">
                    <p className="select-all text-[13px] leading-relaxed">{f.text}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(f.text!).then(
                          () => setCopied(i),
                          () => setCopied(null),
                        );
                      }}
                      className={`${ghost} mt-2 w-full`}
                    >
                      {copied === i ? "✓ 복사했어요" : "새 문구 복사"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section title="🪙 충전 묶음" sub="손님이 사는 냥 묶음과 가격이에요. 가격은 10원 단위예요. 할인율은 첫 묶음(낱개) 가격 기준이에요.">
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1.4fr_1.2fr_auto] gap-1.5 px-0.5 text-[11.5px] text-muted">
            <span>냥</span>
            <span>가격(원)</span>
            <span>딱지</span>
            <span className="w-7" />
          </div>
          {form.packs.map((p, i) => {
            const per = Number(p.price) / Number(p.coins);
            const off = unit && per ? Math.round((1 - per / unit) * 100) : 0;
            return (
              <div key={p.id}>
                <div className="grid grid-cols-[1fr_1.4fr_1.2fr_auto] items-center gap-1.5">
                  <input value={p.coins} onChange={(e) => setPack(i, "coins", e.target.value)} inputMode="numeric" className={small} aria-label="냥" />
                  <input value={p.price} onChange={(e) => setPack(i, "price", e.target.value)} inputMode="numeric" className={small} aria-label="가격" />
                  <input value={p.tag} onChange={(e) => setPack(i, "tag", e.target.value)} placeholder="예: 인기" maxLength={12} className={small} aria-label="딱지" />
                  <button
                    onClick={() => setForm({ ...form, packs: form.packs.filter((_, j) => j !== i) })}
                    disabled={form.packs.length <= 1}
                    className="w-7 text-[16px] text-muted disabled:opacity-30"
                    aria-label="묶음 빼기"
                  >
                    ✕
                  </button>
                </div>
                <p className="px-0.5 pt-0.5 text-[11px] text-muted">
                  냥당 {per ? won(Math.round(per)) : "-"}
                  {off > 0 ? ` · ${off}% 할인` : ""}
                </p>
              </div>
            );
          })}
          {form.packs.length < 8 && (
            <button onClick={() => setForm({ ...form, packs: [...form.packs, { id: `p${Date.now().toString(36)}`, coins: "", price: "", tag: "" }] })} className={`${ghost} w-full`}>
              + 묶음 추가
            </button>
          )}
        </div>
      </Section>

      <Section title="📜 점괘마다 드는 냥" sub="전체 풀이를 열 때 드는 냥이에요. 비회원 바로 결제 가격은 같은 냥 수의 묶음 가격을 따라가요.">
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <label key={m} className="text-[12.5px] text-muted">
              {PRODUCTS[m].emoji} {PRODUCTS[m].name}
              <div className="mt-0.5 flex items-center gap-1.5">
                <input
                  value={form.costs[m]}
                  onChange={(e) => setForm({ ...form, costs: { ...form.costs, [m]: e.target.value.replace(/\D/g, "") } })}
                  inputMode="numeric"
                  className={small}
                />
                <span className="text-ink">냥</span>
              </div>
            </label>
          ))}
        </div>
      </Section>

      <div className="flex gap-2">
        <button onClick={savePricing} disabled={busy} className="btn-primary flex-[2] py-3">
          가격 저장하기
        </button>
        <button onClick={() => setForm(toForm(s.pricing))} className={`${ghost} flex-1`}>
          되돌리기
        </button>
      </div>
      <button onClick={() => setForm(toForm(s.defaults))} className="w-full text-center text-[12px] text-muted underline">
        처음 가격으로 채우기 (저장해야 적용)
      </button>

      <Section
        title="🎉 충전 세일"
        sub="기간을 정해 충전 묶음을 싸게 팔거나 냥을 더 줘요. 끝나는 때가 지나면 저절로 꺼져요."
        right={<span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${s.sale.on ? "bg-pink/20 text-pink" : "bg-white/5 text-muted"}`}>{s.sale.on ? "켜짐" : "꺼짐"}</span>}
      >
        <div className="space-y-2">
          <input value={sale.label} onChange={(e) => setSale({ ...sale, label: e.target.value })} placeholder="세일 이름 (예: 수능 응원 세일)" maxLength={30} className={small} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] text-muted">
              할인 (%)
              <input value={String(sale.discountPct || "")} onChange={(e) => setSale({ ...sale, discountPct: Number(e.target.value.replace(/\D/g, "")) || 0 })} inputMode="numeric" placeholder="0" className={small} />
            </label>
            <label className="text-[12px] text-muted">
              냥 더 주기 (%)
              <input value={String(sale.bonusPct || "")} onChange={(e) => setSale({ ...sale, bonusPct: Number(e.target.value.replace(/\D/g, "")) || 0 })} inputMode="numeric" placeholder="0" className={small} />
            </label>
            <label className="text-[12px] text-muted">
              시작 (비우면 지금)
              <input type="datetime-local" value={toLocal(sale.from)} onChange={(e) => setSale({ ...sale, from: fromLocal(e.target.value) })} className={small} />
            </label>
            <label className="text-[12px] text-muted">
              끝 (비우면 계속)
              <input type="datetime-local" value={toLocal(sale.to)} onChange={(e) => setSale({ ...sale, to: fromLocal(e.target.value) })} className={small} />
            </label>
          </div>
          {(sale.discountPct > 0 || sale.bonusPct > 0) && (
            <div className="rounded-xl bg-black/25 p-2.5 text-[12.5px]">
              <p className="mb-1 text-muted">세일 중 손님에게 보이는 값</p>
              {salePreview.map((p) => (
                <p key={p.id}>
                  {p.coins}냥{p.bonus ? <b className="text-pink"> +{p.bonus}</b> : ""} ·{" "}
                  {p.price < p.basePrice ? (
                    <>
                      <span className="text-muted line-through">{won(p.basePrice)}</span> <b>{won(p.price)}</b>
                    </>
                  ) : (
                    won(p.price)
                  )}
                </p>
              ))}
              {sale.bonusPct > 0 && <p className="mt-1 text-[11px] text-muted">보너스 냥은 묶음별로 내림해요. 1냥 묶음에 50%면 0냥이에요.</p>}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => saveSale(true)} disabled={busy} className="btn-primary flex-1 py-2.5">
              {s.sale.on ? "세일 내용 저장" : "세일 켜기"}
            </button>
            {s.sale.on && (
              <button onClick={() => saveSale(false)} disabled={busy} className={`${ghost} flex-1`}>
                세일 끄기
              </button>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
