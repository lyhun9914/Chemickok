"use client";

import { useCallback, useEffect, useState } from "react";
import { josa } from "@/lib/josa";
import { sound } from "@/lib/sound";
import { roomApi, type ChemPairView, type RoomView } from "@/services/apiClient";
import { shareService } from "@/services/shareService";
import { useAppStore } from "@/store/useAppStore";
import { DateTimeSelects } from "./DateTimeSelects";
import { useSavedInfo } from "./InfoGate";
import { Say } from "./Nyang";

const inputCls = "w-full rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-pink/60";
const keyOf = (id: string) => `nyang-room-${id}`;
const readKey = (id: string) => {
  try {
    return localStorage.getItem(keyOf(id));
  } catch {
    return null;
  }
};
const saveKey = (id: string, key: string | null) => {
  try {
    if (key) localStorage.setItem(keyOf(id), key);
    else localStorage.removeItem(keyOf(id));
  } catch {
    /* storage unavailable: this browser just won't remember being in the room */
  }
};

/** Name + birthday, prefilled from the saved profile or this visit. */
function PersonFields({ name, setName, birth, setBirth }: { name: string; setName: (v: string) => void; birth: string; setBirth: (v: string) => void }) {
  return (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[13px] text-muted">단톡방에서 부르는 이름 (별명 OK)</span>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 10))} placeholder="예: 지민" className={inputCls} />
      </label>
      <div>
        <span className="mb-1.5 block text-[13px] text-muted">생년월일 (양력)</span>
        <DateTimeSelects type="date" initial={birth} onChange={setBirth} />
      </div>
    </>
  );
}

function usePerson() {
  const saved = useSavedInfo();
  const session = useAppStore((s) => s.input.me);
  const [name, setName] = useState(saved?.name ?? session.name ?? "");
  const [birth, setBirth] = useState(saved?.birthdate ?? session.birthdate ?? "");
  const ok = name.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(birth);
  return { name, setName, birth, setBirth, ok };
}

/**
 * 단톡방 케미표: make a room (or open one from a link), put yourself in, send the link to the group chat. Everyone who
 * joins shows up with their 일주 cat; every pair gets a 케미 score and the room gets its 짝꿍 · 앙숙 · 분위기 메이커.
 */
export function ChemRoom({ roomId }: { roomId?: string | null }) {
  const [id, setId] = useState<string | null>(roomId ?? null);
  return id ? <RoomScreen id={id} onNew={() => setId(null)} /> : <RoomCreate onMade={setId} />;
}

function RoomCreate({ onMade }: { onMade: (id: string) => void }) {
  const p = usePerson();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const make = async () => {
    if (!p.ok || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await roomApi.create(title.trim(), p.name.trim(), p.birth);
      saveKey(r.id, r.key);
      sound().play("stamp");
      onMade(r.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <Say mood="smug">단톡방 친구들 케미, 냥신이 한 장으로 정리해 준다냥. 방 이름이랑 네 정보부터 넣어라냥. 링크는 다음 화면에서 준다냥 🐾</Say>
      <label className="block">
        <span className="mb-1.5 block text-[13px] text-muted">방 이름</span>
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 20))} placeholder="예: 대학 동기 단톡방" className={inputCls} />
      </label>
      <PersonFields name={p.name} setName={p.setName} birth={p.birth} setBirth={p.setBirth} />
      {error && <p className="text-sm text-pink">{error}</p>}
      <button onClick={make} disabled={!p.ok || busy} className="btn-primary w-full py-4">
        {busy ? "케미표 만드는 중…" : "케미표 만들기 →"}
      </button>
      <p className="text-center text-[12px] leading-relaxed text-muted">
        생일은 케미 계산에만 쓰고 화면에 안 보여 준다냥.
        <br />
        케미표는 만든 날부터 30일 뒤 지워진다냥.
      </p>
    </div>
  );
}

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 864e5));
}

/** One pair: names wrap (long nicknames stay readable), the label under them, the score on the right. `me`: show only the other person. */
function PairRow({ v, p, mark, me }: { v: RoomView; p: ChemPairView; mark?: boolean; me?: number }) {
  const a = v.members[p.a];
  const b = v.members[p.b];
  const other = me === p.a ? b : me === p.b ? a : null;
  return (
    <li className={`flex items-center gap-3 py-2.5 ${mark ? "text-peach" : ""}`}>
      <span className="min-w-0 flex-1">
        <span className="block break-keep text-[14px] leading-snug">
          {other ? (
            <>
              {other.icon} {other.name}
            </>
          ) : (
            <>
              {a.icon} {a.name} <span className="text-muted">↔</span> {b.icon} {b.name}
            </>
          )}
        </span>
        <span className="mt-0.5 block text-[12px] text-muted">{p.label}</span>
      </span>
      <span className="w-10 shrink-0 text-right text-[16px] font-extrabold">{p.score}</span>
    </li>
  );
}

function Highlight({ icon, title, who, score, line }: { icon: string; title: string; who: string; score?: number; line: string }) {
  return (
    <div className="rounded-2xl border border-violet/35 bg-white/[0.03] p-4">
      <p className="text-[12.5px] font-semibold text-muted">
        {icon} {title}
      </p>
      <p className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-[17px] font-extrabold">{who}</span>
        {score !== undefined && <span className="text-[20px] font-black text-peach">{score}</span>}
      </p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink/85">{line}</p>
    </div>
  );
}

function RoomScreen({ id, onNew }: { id: string; onNew: () => void }) {
  const [v, setV] = useState<RoomView | null>(null);
  const [gone, setGone] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = usePerson();

  const load = useCallback(() => {
    roomApi
      .get(id, readKey(id))
      .then((r) => {
        setV(r);
        if (r.me < 0) saveKey(id, null); // taken out (or never in) — don't keep a dead key
      })
      .catch((e) => setGone(e instanceof Error ? e.message : "케미표를 열 수 없다냥."));
  }, [id]);
  useEffect(() => {
    load();
    shareService.prepareKakao().catch(() => null);
  }, [load]);

  const join = async () => {
    if (!p.ok || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await roomApi.join(id, p.name.trim(), p.birth);
      saveKey(id, r.key);
      sound().play("stamp");
      setV(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };
  const leave = async () => {
    const key = readKey(id);
    if (!key || !window.confirm("이 케미표에서 나를 뺄까냥? 내 이름과 생일이 바로 지워진다냥.")) return;
    await roomApi.leave(id, key).catch(() => null);
    saveKey(id, null);
    setNote("빠졌다냥. 내 정보는 지웠다냥 🐾");
    load();
  };

  if (gone)
    return (
      <div className="space-y-4">
        <Say mood="wow">{gone}</Say>
        <button onClick={onNew} className="btn-primary w-full py-4">
          새 케미표 만들기
        </button>
      </div>
    );
  if (!v) return <p className="animate-pulse py-10 text-center text-[14px] text-muted">케미표 펼치는 중…</p>;

  const link = `${window.location.origin}/?room=${id}`;
  const n = v.members.length;
  const share = () =>
    shareService
      .shareKakao({
        title: `🐾 ${v.title} 케미표`,
        description: `생일만 넣으면 우리 방 궁합표가 나온다냥. 지금 ${n}명 들어왔다냥!`,
        url: link,
        buttons: [{ title: "나도 넣기", url: link }],
      })
      .then((o) => o === "copied" && setNote("링크를 복사했다냥. 단톡방에 붙여 넣어라냥 📋"));
  const copy = () =>
    navigator.clipboard
      ?.writeText(link)
      .then(() => setNote("링크를 복사했다냥 📋"))
      .catch(() => setNote(link));
  const mine = v.me >= 0 ? v.pairs.filter((x) => x.a === v.me || x.b === v.me) : [];
  const name = (i: number) => v.members[i].name;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-ritual text-[22px] text-peach">{v.title}</p>
        <p className="mt-1 text-[12.5px] text-muted">
          {n}명 / 최대 {v.max}명 · {daysLeft(v.expiresAt)}일 뒤 사라짐
        </p>
      </div>

      {v.me < 0 && (
        <div className="space-y-3 rounded-2xl border border-peach/40 bg-white/[0.03] p-4">
          <Say mood="happy">{n ? `${josa(v.members[0].name, "이/가")} 만든 케미표다냥. 너도 넣으면 우리 방 궁합이 나온다냥!` : "너도 넣어라냥!"}</Say>
          <PersonFields name={p.name} setName={p.setName} birth={p.birth} setBirth={p.setBirth} />
          {error && <p className="text-sm text-pink">{error}</p>}
          <button onClick={join} disabled={!p.ok || busy || n >= v.max} className="btn-primary w-full py-4">
            {n >= v.max ? `${v.max}명이 꽉 찼다냥` : busy ? "넣는 중…" : "나도 넣기 →"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={share} className="rounded-xl bg-[#FEE500] py-3 text-[14px] font-bold text-[#191600]">
          단톡방에 링크 보내기
        </button>
        <button onClick={copy} className="rounded-xl border border-line py-3 text-[14px] font-semibold">
          링크 복사
        </button>
      </div>
      {note && <p className="fade-up break-all text-center text-xs text-peach">{note}</p>}

      {n < 2 ? (
        <Say mood="talk">친구가 한 명이라도 들어오면 케미가 나온다냥. 위 버튼으로 단톡방에 링크를 보내라냥 📨</Say>
      ) : (
        <>
          <div className="grid gap-3">
            {v.best && (
              <Highlight icon="💞" title="최고의 짝꿍" who={`${name(v.best.a)} & ${name(v.best.b)}`} score={v.best.score} line={v.best.line} />
            )}
            {v.rival ? (
              <Highlight icon="😼" title="투닥투닥 앙숙" who={`${name(v.rival.a)} & ${name(v.rival.b)}`} score={v.rival.score} line={v.rival.line} />
            ) : (
              n >= 3 && <Highlight icon="🕊️" title="앙숙" who="없음" line="부딪히는 짝이 없다냥. 평화로운 방이다냥." />
            )}
            {v.mood && (
              <Highlight icon="🎉" title="분위기 메이커" who={name(v.mood.member)} score={v.mood.avg} line={`누구랑 붙여도 케미가 좋다냥. 평균 ${v.mood.avg}점, 이 방의 접착제다냥.`} />
            )}
            {v.carer && (
              <Highlight icon="🍚" title="엄마 고양이" who={name(v.carer.member)} line={`${v.carer.count}명의 기운을 키워 주는 사주다냥. 다 챙기느라 바쁘다냥.`} />
            )}
          </div>

          {mine.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-[14px] font-bold">🐾 나랑 케미</p>
              <ul className="mt-1 divide-y divide-line">
                {mine.map((x) => (
                  <PairRow key={`${x.a}-${x.b}`} v={v} p={x} me={v.me} />
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[14px] font-bold">📊 케미 순위</p>
            <ul className="mt-1 divide-y divide-line">
              {v.pairs.slice(0, all ? undefined : 6).map((x) => (
                <PairRow key={`${x.a}-${x.b}`} v={v} p={x} mark={v.me >= 0 && (x.a === v.me || x.b === v.me)} />
              ))}
            </ul>
            {v.pairs.length > 6 && !all && (
              <button onClick={() => setAll(true)} className="mt-1 w-full py-1 text-center text-[12px] text-muted underline underline-offset-2">
                전체 {v.pairs.length}쌍 보기
              </button>
            )}
          </div>
        </>
      )}

      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-[14px] font-bold">🐈 들어온 사람</p>
        <ul className="mt-2 space-y-2">
          {v.members.map((m, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                {m.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-bold">
                  {m.name}
                  {i === v.me && <span className="ml-1.5 rounded-sm bg-pink px-1.5 py-0.5 align-middle text-[10.5px] font-bold text-white">나</span>}
                </span>
                <span className="block text-[12.5px] text-muted">
                  {m.cat}
                  {m.animal ? ` · ${m.animal}띠` : ""}
                  {m.role ? ` · ${m.role}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-[12px] leading-relaxed text-muted">
        생일은 케미 계산에만 쓰고 화면에 안 보여 준다냥 · 재미로 보는 케미다냥
        {v.me >= 0 && (
          <>
            <br />
            <button onClick={leave} className="mt-1 underline underline-offset-2">
              이 케미표에서 나 빼기
            </button>
          </>
        )}
      </p>
      <button onClick={onNew} className="w-full py-1 text-[13px] text-muted underline underline-offset-4">
        다른 단톡방 케미표 새로 만들기
      </button>
    </div>
  );
}
