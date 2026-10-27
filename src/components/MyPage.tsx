"use client";

import { useCallback, useEffect, useState } from "react";
import { MBTI_TYPES } from "@/lib/questions";
import type { Gender, PersonInput } from "@/models/types";
import { accountApi, type ReadingSummary } from "@/services/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { DateTimeSelects } from "./DateTimeSelects";
import { Nyang } from "./Nyang";

const fieldCls = "w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px] text-ink outline-none focus:border-pink/60";
const PROVIDER_LABEL: Record<string, string> = { kakao: "카카오", naver: "네이버", google: "구글", dev: "테스트" };

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
  const { me, setMe, setScreen, openSaved, reset } = useAppStore();
  const [readings, setReadings] = useState<ReadingSummary[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    accountApi
      .readings()
      .then((r) => setReadings(r.readings))
      .catch((e: Error) => setError(e.message));
  }, [me]);

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
    await accountApi.withdraw().catch(() => null);
    setMe(null);
    reset();
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

      <section className="mt-6">
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
                <span className="text-2xl">{r.mode === "solo" ? "🐾" : "💞"}</span>
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

      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">🪪 기본 정보</h2>
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmLeave(false)}>
          <div className="fade-up w-full max-w-[480px] rounded-t-3xl bg-surface p-6 pb-8" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold">정말 탈퇴할 거냥?</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              기본 정보와 점괘함의 점괘가 모두 바로 삭제되고 되돌릴 수 없어요. 결제 기록은 전자상거래법에 따라 5년간 회원 정보 없이 보관돼요.
            </p>
            <button onClick={withdraw} className="mt-5 w-full rounded-2xl bg-pink/90 py-3.5 font-bold text-white">
              탈퇴하기
            </button>
            <button onClick={() => setConfirmLeave(false)} className="mt-2 w-full py-3 text-sm text-muted">
              취소
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
