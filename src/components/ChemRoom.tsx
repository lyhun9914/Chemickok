"use client";

import { useCallback, useEffect, useState } from "react";
import { josa } from "@/lib/josa";
import { sound } from "@/lib/sound";
import { lifeLine, mergeRows } from "@/lib/when";
import { mineApi, roomApi, type ChemPairView, type MineRoom, type RoomView } from "@/services/apiClient";
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

/** the server said the room is gone (30일이 지났거나 지워짐), not just a dropped connection */
const isGone = (e: unknown) => e instanceof Error && e.message.includes("없거나");
type View = { at: "make" } | { at: "list" } | { at: "open"; id: string };

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
 * 💬 내 케미표 lists the rooms this person made or joined (their account, or the keys this browser kept).
 */
export function ChemRoom({ roomId }: { roomId?: string | null }) {
  const [view, setView] = useState<View>(roomId ? { at: "open", id: roomId } : { at: "make" });
  const open = (id: string) => setView({ at: "open", id });
  if (view.at === "list") return <RoomList onOpen={open} onMake={() => setView({ at: "make" })} />;
  if (view.at === "open") return <RoomScreen key={view.id} id={view.id} onNew={() => setView({ at: "make" })} onList={() => setView({ at: "list" })} />;
  return <RoomCreate onMade={open} onList={() => setView({ at: "list" })} />;
}

/** rooms this browser is in (it holds their keys) */
function myRoomIds(): string[] {
  try {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("nyang-room-")) out.push(k.slice("nyang-room-".length));
    }
    return out;
  } catch {
    return [];
  }
}

const rowOf = (id: string, v: RoomView): MineRoom => ({
  id,
  title: v.title,
  count: v.members.length,
  me: v.members[v.me]?.name ?? null,
  creator: v.creator,
  best: v.best ? { a: v.members[v.best.a].name, b: v.members[v.best.b].name, score: v.best.score } : null,
  createdAt: v.createdAt,
  expiresAt: v.expiresAt,
});

/**
 * The rooms this browser is still in, as 내 케미표 rows. Opening them logged in joins a guest's membership to the
 * account (the server does that on GET), so read these before the account's list. Dead keys are forgotten.
 */
export function localRoomRows(): Promise<MineRoom[]> {
  return Promise.all(
    myRoomIds()
      .slice(0, 20)
      .map((id) =>
        roomApi
          .get(id, readKey(id))
          .then((v) => {
            if (v.me < 0) saveKey(id, null); // taken out — forget the dead key
            return v.me >= 0 ? rowOf(id, v) : null;
          })
          .catch((e) => {
            if (isGone(e)) saveKey(id, null);
            return null;
          }),
      ),
  ).then((rows) => rows.filter((r): r is MineRoom => Boolean(r)));
}

/** 나 빼기 (by this browser's key, else by the account); `everything` = the maker deletes the whole room */
export async function leaveRoom(id: string, everything = false): Promise<{ deleted: boolean }> {
  const r = await roomApi.leave(id, readKey(id), everything);
  saveKey(id, null);
  return { deleted: Boolean(r.deleted) };
}
export const roomLink = (id: string) => `${window.location.origin}/room/${id}`;

/** 💬 내 케미표: back to a room without the link — the ones on the account (any device) and the ones this browser is in. */
function RoomList({ onOpen, onMake }: { onOpen: (id: string) => void; onMake: () => void }) {
  const me = useAppStore((s) => s.me);
  const [rows, setRows] = useState<MineRoom[] | null>(null);
  useEffect(() => {
    let off = false;
    localRoomRows()
      .then(async (local) => {
        const acct = me ? await mineApi.get().then((m) => m.rooms).catch(() => []) : [];
        if (!off) setRows(mergeRows(acct, local));
      })
      .catch(() => !off && setRows([]));
    return () => {
      off = true;
    };
  }, [me]);
  return (
    <div className="space-y-4">
      <button onClick={onMake} className="text-[13px] text-muted">
        ← 케미표 만들기
      </button>
      <p className="text-[16px] font-bold">💬 내 케미표</p>
      {!rows ? (
        <p className="animate-pulse py-8 text-center text-[14px] text-muted">케미표 찾는 중…</p>
      ) : rows.length ? (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <button onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left active:scale-[0.99]">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[14.5px] font-semibold">{r.title}</span>
                    {r.creator && <span className="shrink-0 rounded-sm bg-violet/30 px-1.5 py-0.5 text-[10.5px] font-bold">방장</span>}
                  </span>
                  <span className="mt-0.5 block break-keep text-[12.5px] text-ink/85">
                    {r.count < 2 ? `⏳ ${r.count}명 · 친구 기다리는 중` : `🟢 ${r.count}명${r.best ? ` · 최고의 짝꿍 ${r.best.a} & ${r.best.b} ${r.best.score}점` : ""}`}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted">{lifeLine(r.createdAt, r.expiresAt)}</span>
                </span>
                <span className="shrink-0 text-[12.5px] font-semibold text-peach">결과 보기 ›</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-5 text-center">
          <p className="text-[14px]">아직 만들거나 들어간 케미표가 없다냥 🐾</p>
          <button onClick={onMake} className="btn-primary w-full py-3.5">
            첫 케미표 만들기
          </button>
        </div>
      )}
      <p className="text-center text-[12px] text-muted">
        {me ? "로그인한 계정으로 넣은 케미표는 다른 기기에서도 여기 뜬다냥" : "로그인하면 케미표가 계정에 저장돼서 다른 기기에서도 본다냥"}
      </p>
    </div>
  );
}

function RoomCreate({ onMade, onList }: { onMade: (id: string) => void; onList: () => void }) {
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
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button onClick={make} disabled={!p.ok || busy} className="btn-primary py-4">
          {busy ? "만드는 중…" : "케미표 만들기 →"}
        </button>
        <button onClick={onList} className="rounded-2xl border border-violet/45 bg-white/[0.04] px-4 text-[14px] font-semibold">
          💬 내 케미표 보기
        </button>
      </div>
      <p className="text-center text-[12px] leading-relaxed text-muted">
        생일은 케미 계산에만 쓰고 화면에 안 보여 준다냥.
        <br />
        케미표는 만든 날부터 30일 뒤 지워진다냥. 만든 · 들어간 케미표는 💬 내 케미표에서 다시 본다냥.
      </p>
    </div>
  );
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

function RoomScreen({ id, onNew, onList }: { id: string; onNew: () => void; onList: () => void }) {
  const [v, setV] = useState<RoomView | null>(null);
  const [gone, setGone] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** the 나 빼기 / 지우기 confirm panel */
  const [ask, setAsk] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const p = usePerson();

  const load = useCallback(() => {
    roomApi
      .get(id, readKey(id))
      .then((r) => {
        setV(r);
        if (r.me < 0) saveKey(id, null); // taken out (or never in) — don't keep a dead key
      })
      .catch((e) => {
        if (isGone(e)) saveKey(id, null);
        setGone(e instanceof Error ? e.message : "케미표를 열 수 없다냥.");
      });
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
  /** 나 빼기 (by this browser's key, else by the account); `everything` = the maker deletes the whole room */
  const leave = async (everything: boolean) => {
    setBusy(true);
    setAskError(null);
    try {
      const r = await leaveRoom(id, everything);
      setAsk(false);
      if (r.deleted) return onList(); // deleted, or the last one out
      setNote("빠졌다냥. 내 이름과 생일은 바로 지웠다냥 🐾");
      load();
    } catch (e) {
      setAskError(e instanceof Error ? e.message : "다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };

  if (gone)
    return (
      <div className="space-y-4">
        <Say mood="wow">{gone}</Say>
        <button onClick={onNew} className="btn-primary w-full py-4">
          새 케미표 만들기
        </button>
        <button onClick={onList} className="w-full py-1 text-[13px] text-muted underline underline-offset-4">
          💬 내 케미표 보기
        </button>
      </div>
    );
  if (!v) return <p className="animate-pulse py-10 text-center text-[14px] text-muted">케미표 펼치는 중…</p>;

  const link = roomLink(id);
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
      <button onClick={onList} className="text-[13px] text-muted">
        ← 내 케미표 목록
      </button>
      <div className="text-center">
        <p className="font-ritual text-[22px] text-peach">{v.title}</p>
        <p className="mt-1 text-[12.5px] text-muted">
          {n}명 / 최대 {v.max}명 · {lifeLine(v.createdAt, v.expiresAt)}
        </p>
        {v.me >= 0 && <p className="mt-1 text-[12px] font-semibold text-ink/80">{v.creator ? "👑 내가 만든 방" : "🐾 내가 들어간 방"}</p>}
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

      <p className="text-center text-[12px] leading-relaxed text-muted">생일은 케미 계산에만 쓰고 화면에 안 보여 준다냥 · 재미로 보는 케미다냥</p>
      <button onClick={onNew} className="w-full rounded-xl border border-line py-3 text-[14px] font-semibold">
        다른 단톡방 케미표 새로 만들기
      </button>
      {v.me >= 0 &&
        (ask ? (
          <div className="rounded-2xl border border-pink/40 bg-pink/[0.06] p-4 text-center">
            <p className="text-[13.5px] font-semibold leading-relaxed">
              {v.creator
                ? "방장이다냥. 나만 빠지면 방은 남고, 통째로 지우면 모두의 이름 · 생일과 링크가 사라진다냥."
                : "이 케미표에서 나를 뺄까냥? 내 이름과 생일이 바로 지워진다냥."}
            </p>
            {askError && <p className="mt-1 text-[12.5px] text-pink">{askError}</p>}
            <div className={`mt-3 grid gap-2 ${v.creator ? "grid-cols-3" : "grid-cols-2"}`}>
              <button onClick={() => setAsk(false)} disabled={busy} className="rounded-xl border border-line py-2.5 text-[13px]">
                그냥 둘래
              </button>
              <button onClick={() => leave(false)} disabled={busy} className="rounded-xl border border-pink/50 py-2.5 text-[13px] font-semibold">
                {v.creator ? "나만 빠지기" : busy ? "빼는 중…" : "나 빼기"}
              </button>
              {v.creator && (
                <button onClick={() => leave(true)} disabled={busy} className="rounded-xl bg-pink/80 py-2.5 text-[13px] font-bold text-white">
                  {busy ? "지우는 중…" : "통째로 지우기"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <button onClick={() => setAsk(true)} className="w-full py-1 text-[12.5px] text-muted underline underline-offset-4">
            {v.creator ? "🗑️ 케미표 지우기 · 나 빼기" : "이 케미표에서 나 빼기"}
          </button>
        ))}
    </div>
  );
}
