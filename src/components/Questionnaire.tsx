"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PARTNER_INTERVIEW, fill, selfInterview, optionOf, type InterviewQuestion } from "@/lib/interview";
import { josa } from "@/lib/josa";
import { GENDER_LABEL, MBTI_TYPES, MODE_OPTIONS, STATUS_OPTIONS } from "@/lib/questions";
import type { Gender, Mode, QuestionnaireInput, RelationshipStatus } from "@/models/types";
import { useAppStore } from "@/store/useAppStore";
import { Nyang, type Mood } from "./Nyang";

// ───────────── Script ─────────────

type Turn =
  | { kind: "mode" | "name" | "gender" | "birth" | "time" | "mbti" | "pname" | "pbirth" | "pmbti" | "status" | "end" }
  | { kind: "ritual"; id: "incense" | "orb" }
  | { kind: "q"; q: InterviewQuestion; part: "self" | "partner"; num: number };

function turnsFor(mode: Mode): Turn[] {
  const self: Turn[] = selfInterview(mode).map((q, i) => ({ kind: "q", q, part: "self", num: i + 1 }));
  const info: Turn[] = [{ kind: "mode" }, { kind: "name" }, { kind: "gender" }, { kind: "birth" }, { kind: "time" }, { kind: "mbti" }];
  if (mode === "solo") return [...info, { kind: "ritual", id: "incense" }, ...self, { kind: "end" }];
  const partner: Turn[] = PARTNER_INTERVIEW.map((q, i) => ({ kind: "q", q, part: "partner", num: i + 1 }));
  return [
    ...info,
    { kind: "pname" },
    { kind: "pbirth" },
    { kind: "pmbti" },
    { kind: "status" },
    { kind: "ritual", id: "incense" },
    ...self,
    { kind: "ritual", id: "orb" },
    ...partner,
    { kind: "end" },
  ];
}

interface Msg {
  key: string;
  who: "nyang" | "me";
  text: string;
  mood?: Mood;
  node?: React.ReactNode;
}

const ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

/** 띠 by 입춘 (Feb 4), matching the server's year pillar. */
function animalOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const year = m < 2 || (m === 2 && d < 4) ? y - 1 : y;
  return ANIMALS[(((year - 4) % 12) + 12) % 12];
}

const hasBatchim = (word: string) => josa(word, "이/가").endsWith("이");
/** "지민" → "지민이구냥", "수지" → "수지구냥" */
const iGuNyang = (name: string) => `${name}${hasBatchim(name) ? "이" : ""}구냥`;

function fmtDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}시${m ? ` ${m}분` : ""}`;
}

const STATUS_REACT: Record<RelationshipStatus, string> = {
  crush: "썸이구냥… 제일 궁금할 때다냥 😏",
  dating: "연애 중이구냥. 좋을 때다냥… 아마도?",
  slump: "권태기구냥. 냥신이 처방 제대로 해 주겠다냥.",
  breakup: "…끝났구냥. 그래도 여기 왔다는 건, 아직 다 안 끝났다는 거다냥.",
};

const n = (text: string, mood: Mood = "talk", node?: React.ReactNode) => ({ text, mood, node });

function asks(t: Turn, i: QuestionnaireInput): ReturnType<typeof n>[] {
  const p = i.partner.name || "그 사람";
  switch (t.kind) {
    case "mode":
      return [n("어서 오라냥. 여기는 냥신 상담소다냥 🐾", "smug"), n("오늘은 누구 연애를 봐 줄까냥?")];
    case "name":
      return [n("좋다냥. 먼저 이름부터 대라냥."), n("실명이면 이름 획수로 타고난 기운까지 봐 준다냥. 닉네임이면… 뭐, 그것도 괜찮다냥.", "smug")];
    case "gender":
      return [n("성별은?")];
    case "birth":
      return [n("생년월일을 대라냥. 양력으로.")];
    case "time":
      return [n("태어난 시간도 알면 시주(時柱)까지 본다냥. 모르면 '몰라' 눌러라냥.")];
    case "mbti":
      return [n("MBTI는? 냥신은 그런 거 없어도 다 보지만… 궁합표엔 쓸모가 있다냥.", "smug")];
    case "pname":
      return [n("이제 그 사람 차례다냥."), n("이름이 뭐냥?", "smug")];
    case "pbirth":
      return [n(`${p} 생일 알면 대라냥. 몰라도 된다냥. 둘의 일주 궁합만 못 볼 뿐이다냥.`)];
    case "pmbti":
      return [n(`${p}의 MBTI는?`)];
    case "status":
      return [n("둘이 지금 무슨 사이냥? 솔직하게.", "smug")];
    case "ritual":
      return t.id === "incense"
        ? [
            n("좋다냥. 이제부터 진짜 면담이다냥."),
            i.mode === "solo"
              ? n("냥신이 좀 이상한 걸 물어볼 거다냥. 왜 묻는지는 묻지 마라냥. 다 이유가 있다냥 😼", "smug")
              : n(`${p} 얘기 전에, 둘 사이에서 네가 어떤 사람인지부터 보겠다냥. 좀 이상한 걸 물어볼 거다냥. 다 이유가 있다냥 😼`, "smug"),
            n("향에 불을 붙여라냥."),
          ]
        : [
            n(`이제 ${p} 차례다냥.`),
            n(`눈 감고 ${josa(p, "을/를")} 떠올려라냥. 네가 본 그대로 답하면, 냥신이 그 기운을 읽겠다냥.`, "smug"),
          ];
    case "q":
      return t.q.ask.map((a) => n(fill(a, p), t.part === "partner" ? "smug" : "talk"));
    case "end":
      return [
        n("…됐다냥.", "wow"),
        n(i.mode === "solo" ? "네 기운이 다 보인다냥. 점괘를 뽑아 볼까냥?" : `너랑 ${p}의 기운이 다 보인다냥. 점괘를 뽑아 볼까냥?`, "smug"),
      ];
  }
}

/** What the user "said" for an answered turn. */
function answerOf(t: Turn, i: QuestionnaireInput): string {
  switch (t.kind) {
    case "mode":
      return MODE_OPTIONS.find((o) => o.id === i.mode)!.label;
    case "name":
      return i.me.name;
    case "gender":
      return GENDER_LABEL[i.me.gender];
    case "birth":
      return fmtDate(i.me.birthdate);
    case "time":
      return i.me.birthtime ? fmtTime(i.me.birthtime) : "몰라";
    case "mbti":
      return i.me.mbti || "몰라";
    case "pname":
      return i.partner.name;
    case "pbirth":
      return i.partner.birthdate ? fmtDate(i.partner.birthdate) : "몰라";
    case "pmbti":
      return i.partner.mbti || "몰라";
    case "status":
      return STATUS_OPTIONS.find((o) => o.id === i.status)!.label;
    case "ritual":
      return t.id === "incense" ? "🕯️ (향에 불을 붙였다)" : "🔮 (떠올렸다)";
    case "q": {
      const answers = t.part === "self" ? i.self : i.partnerObs;
      return fill(optionOf(t.part === "self" ? selfInterview(i.mode) : PARTNER_INTERVIEW, t.q.id, answers[t.q.id])?.label ?? "", i.partner.name);
    }
    case "end":
      return "";
  }
}

function reactsOf(t: Turn, i: QuestionnaireInput): ReturnType<typeof n>[] {
  const p = i.partner.name || "그 사람";
  switch (t.kind) {
    case "mode":
      return [i.mode === "solo" ? n("혼자 왔구냥. 오히려 좋다냥. 너를 샅샅이 보겠다냥.", "smug") : n("오호~ 그 사람이 있구냥? 둘 다 탈탈 털어 주겠다냥 😼", "smug")];
    case "name":
      return [n(`${iGuNyang(i.me.name)}. 이름에 뭔가 보인다냥…`, "wow")];
    case "birth":
      return [n(`${i.me.birthdate.slice(0, 4)}년생 ${animalOf(i.me.birthdate)}띠구냥. 오호… 벌써 좀 보인다냥.`, "wow")];
    case "time":
      return [i.me.birthtime ? n("시주까지 보겠다냥. 더 정확해지겠구냥.", "happy") : n("괜찮다냥. 년·월·일 세 기둥으로도 충분하다냥.")];
    case "mbti":
      return [i.me.mbti ? n(`${i.me.mbti}… 그럴 줄 알았다냥 😼`, "smug") : n("몰라도 된다냥. 냥신 눈이 더 정확하다냥.", "smug")];
    case "pname":
      return [n(`${iGuNyang(p)}… 흠.`, "smug")];
    case "pbirth":
      return [
        i.partner.birthdate
          ? n(`${animalOf(i.partner.birthdate)}띠구냥. 너랑은… 이따 말해 주겠다냥 🤐`, "wow")
          : n("괜찮다냥. 대신 질문으로 더 깊이 보겠다냥."),
      ];
    case "pmbti":
      return [i.partner.mbti ? n(`${i.partner.mbti}… 흠, 그렇구냥.`, "smug") : n("알겠다냥.")];
    case "status":
      return [n(STATUS_REACT[i.status], "smug")];
    case "ritual":
      return t.id === "incense"
        ? [n("…연기가 오른다냥. 시작하겠다냥.", "talk", <Incense />)]
        : [n(`…보인다냥. ${p}의 기운이.`, "wow", <Orb name={p} />)];
    case "q": {
      const qs = t.part === "self" ? selfInterview(i.mode) : PARTNER_INTERVIEW;
      const o = optionOf(qs, t.q.id, (t.part === "self" ? i.self : i.partnerObs)[t.q.id]);
      const out = o ? [n(o.react, o.mood ?? "smug")] : [];
      if (t.part === "self" && t.num === Math.ceil(selfInterview(i.mode).length / 2)) out.push(n("벌써 반 왔다냥. 착하다냥 🐾", "happy"));
      return out;
    }
    default:
      return [];
  }
}

function buildThread(turns: Turn[], step: number, input: QuestionnaireInput): { msgs: Msg[]; askStart: number } {
  const msgs: Msg[] = [];
  const push = (key: string, m: ReturnType<typeof n>) => msgs.push({ key, who: "nyang", ...m });
  turns.slice(0, step).forEach((t, ti) => {
    asks(t, input).forEach((m, k) => push(`${ti}a${k}`, m));
    msgs.push({ key: `${ti}me`, who: "me", text: answerOf(t, input) });
    reactsOf(t, input).forEach((m, k) => push(`${ti}r${k}`, m));
  });
  const askStart = msgs.length;
  const cur = turns[step];
  if (cur) asks(cur, input).forEach((m, k) => push(`${step}a${k}`, m));
  return { msgs, askStart };
}

// ───────────── Visuals ─────────────

function Incense() {
  return (
    <div className="relative mx-auto flex h-28 w-28 items-end justify-center" aria-hidden>
      <span className="smoke smoke-1" />
      <span className="smoke smoke-2" />
      <span className="smoke smoke-3" />
      <span className="flicker text-5xl">🕯️</span>
    </div>
  );
}

function Orb({ name }: { name: string }) {
  return (
    <div className="orb relative mx-auto flex h-28 w-28 items-center justify-center rounded-full" aria-hidden>
      <span className="relative text-sm font-bold text-white/90">{name}</span>
    </div>
  );
}

function NyangBubble({ msg, avatar }: { msg: Pick<Msg, "text" | "mood" | "node">; avatar: boolean }) {
  return (
    <div className="bubble-in flex items-end gap-2">
      <div className="w-10 shrink-0">{avatar && <Nyang mood={msg.mood ?? "talk"} size={40} />}</div>
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-bl-md bg-[#fff6ec] px-4 py-2.5 text-[15px] font-medium leading-relaxed text-[#2b1d16] shadow-sm">
          {msg.text}
        </div>
        {msg.node && <div className="mt-3">{msg.node}</div>}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-10 shrink-0">
        <Nyang mood="talk" size={40} />
      </div>
      <div className="rounded-2xl rounded-bl-md bg-[#fff6ec] px-4 py-3">
        <span className="typing-dots" aria-label="냥신이 말하는 중">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}

function MeBubble({ text }: { text: string }) {
  return (
    <div className="bubble-me flex justify-end">
      <div className="max-w-[78%] rounded-2xl rounded-br-md bg-gradient-to-r from-pink to-violet px-4 py-2.5 text-[15px] font-semibold leading-relaxed text-white shadow-sm">
        {text}
      </div>
    </div>
  );
}

// ───────────── Answer dock ─────────────

const chipCls =
  "chip-pop w-full rounded-2xl border border-white/15 bg-surface px-4 py-3 text-left text-[15px] font-medium transition active:scale-[0.98] active:border-pink";
const inputCls =
  "min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-pink/60";

function Chips({ items, onPick, cols = 1 }: { items: { id: string; label: string; sub?: string }[]; onPick: (id: string) => void; cols?: number }) {
  return (
    <div className={cols === 1 ? "space-y-2" : `grid gap-2 ${cols === 4 ? "grid-cols-4" : cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {items.map((it, k) => (
        <button
          key={it.id}
          onClick={() => onPick(it.id)}
          className={`${chipCls} ${cols > 1 ? "text-center" : ""} ${cols === 4 ? "px-1 py-2.5 text-[13px]" : ""}`}
          style={{ animationDelay: `${k * 55}ms` }}
        >
          {it.label}
          {it.sub && <span className="mt-0.5 block text-xs text-muted">{it.sub}</span>}
        </button>
      ))}
    </div>
  );
}

function TextDock({ initial, placeholder, hint, onSend }: { initial: string; placeholder: string; hint?: string; onSend: (v: string) => void }) {
  const [v, setV] = useState(initial);
  const ok = v.trim() !== "";
  return (
    <form
      className="chip-pop"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSend(v.trim());
      }}
    >
      {hint && <p className="mb-2 text-xs text-peach">{hint}</p>}
      <div className="flex gap-2">
        <input className={inputCls} value={v} maxLength={12} placeholder={placeholder} autoFocus onChange={(e) => setV(e.target.value)} />
        <button disabled={!ok} className="btn-primary shrink-0 px-5">
          보내기
        </button>
      </div>
    </form>
  );
}

const selectCls =
  "min-w-0 flex-1 appearance-none rounded-2xl border border-line bg-surface-2 bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat py-3 pl-3 pr-7 text-center text-[15px] font-semibold text-ink outline-none focus:border-pink/60 invalid:text-muted";
const caret = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23a99cc8' stroke-width='2' fill='none'/%3E%3C/svg%3E\")" };

const range = (from: number, to: number) => Array.from({ length: Math.abs(to - from) + 1 }, (_, k) => (from <= to ? from + k : from - k));
const pad = (n: number) => String(n).padStart(2, "0");

function Select({ value, placeholder, options, onChange }: { value: string; placeholder: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <select required className={selectCls} style={caret} value={value} onChange={(e) => onChange(e.target.value)} aria-label={placeholder}>
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Birth date / time as native dropdowns (a scroll wheel on phones) instead of a calendar input. */
function PickerDock({
  type,
  initial,
  onSend,
  onUnknown,
}: {
  type: "date" | "time";
  initial: string;
  onSend: (v: string) => void;
  onUnknown?: () => void;
}) {
  const parts = initial ? initial.split(/[-:]/).map((x) => String(Number(x))) : [];
  const [a, setA] = useState(parts[0] ?? "");
  const [b, setB] = useState(parts[1] ?? "");
  const [c, setC] = useState(parts[2] ?? "");

  let selects: React.ReactNode;
  let value = "";
  if (type === "date") {
    const thisYear = new Date().getFullYear();
    const days = a && b ? new Date(Number(a), Number(b), 0).getDate() : 31;
    const day = c && Number(c) > days ? "" : c;
    value = a && b && day ? `${a}-${pad(Number(b))}-${pad(Number(day))}` : "";
    selects = (
      <>
        <Select value={a} placeholder="년" onChange={setA} options={range(thisYear, 1940).map((y) => ({ v: String(y), label: `${y}년` }))} />
        <Select value={b} placeholder="월" onChange={setB} options={range(1, 12).map((m) => ({ v: String(m), label: `${m}월` }))} />
        <Select value={day} placeholder="일" onChange={setC} options={range(1, days).map((d) => ({ v: String(d), label: `${d}일` }))} />
      </>
    );
  } else {
    value = a && b ? `${pad(Number(a))}:${pad(Number(b))}` : "";
    selects = (
      <>
        <Select
          value={a}
          placeholder="시"
          onChange={setA}
          options={range(0, 23).map((h) => ({ v: String(h), label: `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}시` }))}
        />
        <Select value={b} placeholder="분" onChange={setB} options={range(0, 59).map((m) => ({ v: String(m), label: `${m}분` }))} />
      </>
    );
  }

  return (
    <div className="chip-pop space-y-2">
      <div className="flex gap-2">{selects}</div>
      <button disabled={!value} onClick={() => onSend(value)} className="btn-primary w-full py-3.5">
        확인
      </button>
      {onUnknown && (
        <button onClick={onUnknown} className="w-full rounded-2xl border border-line py-2.5 text-sm text-muted">
          🤷 몰라
        </button>
      )}
    </div>
  );
}

// ───────────── Screen ─────────────

const delayFor = (m: Msg) => (m.who === "me" ? 140 : Math.min(420 + m.text.length * 20, 1500));

export function Questionnaire() {
  const s = useAppStore();
  const { step, setStep, setScreen, input } = s;
  const turns = useMemo(() => turnsFor(input.mode), [input.mode]);
  const cur = turns[Math.min(step, turns.length - 1)];
  const { msgs, askStart } = useMemo(() => buildThread(turns, Math.min(step, turns.length - 1), input), [turns, step, input]);

  // Messages before `revealed` are on screen; the rest appear one by one (냥신 "types" first).
  const [revealed, setRevealed] = useState(askStart);
  const prevStep = useRef(step);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step < prevStep.current) setRevealed(askStart);
    prevStep.current = step;
  }, [step, askStart]);

  useEffect(() => {
    if (revealed >= msgs.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), delayFor(msgs[revealed]));
    return () => clearTimeout(t);
  }, [revealed, msgs]);

  const done = revealed >= msgs.length;
  const typing = !done && msgs[revealed]?.who === "nyang";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [revealed, done]);

  const advance = () => setStep(step + 1);
  const p = input.partner.name || "그 사람";

  const qTurns = turns.filter((t) => t.kind === "q");
  const qDone = turns.slice(0, step).filter((t) => t.kind === "q").length;
  const inQ = cur.kind === "q" || (cur.kind === "ritual" && cur.id === "orb") || cur.kind === "end";
  const lastMood = [...msgs.slice(0, revealed)].reverse().find((m) => m.who === "nyang")?.mood ?? "smug";

  let dock: React.ReactNode = null;
  switch (cur.kind) {
    case "mode":
      dock = (
        <Chips
          items={MODE_OPTIONS.map((o) => ({ id: o.id, label: `${o.emoji} ${o.label}`, sub: o.desc }))}
          onPick={(id) => {
            s.setMode(id as Mode);
            advance();
          }}
        />
      );
      break;
    case "name":
      dock = (
        <TextDock
          initial={input.me.name}
          placeholder="예: 김지민"
          hint="💡 실제 성함을 넣으면 이름 획수 기운까지 분석해서 더 디테일해져요"
          onSend={(v) => {
            s.updateMe({ name: v });
            advance();
          }}
        />
      );
      break;
    case "gender":
      dock = (
        <Chips
          cols={3}
          items={(Object.keys(GENDER_LABEL) as Gender[]).map((g) => ({ id: g, label: GENDER_LABEL[g] }))}
          onPick={(g) => {
            s.updateMe({ gender: g as Gender });
            advance();
          }}
        />
      );
      break;
    case "birth":
    case "pbirth": {
      const me = cur.kind === "birth";
      dock = (
        <PickerDock
          type="date"
          initial={me ? input.me.birthdate : input.partner.birthdate}
          onSend={(v) => {
            (me ? s.updateMe : s.updatePartner)({ birthdate: v });
            advance();
          }}
          onUnknown={
            me
              ? undefined
              : () => {
                  s.updatePartner({ birthdate: "", birthtime: "" });
                  advance();
                }
          }
        />
      );
      break;
    }
    case "time":
      dock = (
        <PickerDock
          type="time"
          initial={input.me.birthtime ?? ""}
          onSend={(v) => {
            s.updateMe({ birthtime: v });
            advance();
          }}
          onUnknown={() => {
            s.updateMe({ birthtime: "" });
            advance();
          }}
        />
      );
      break;
    case "mbti":
    case "pmbti": {
      const set = cur.kind === "mbti" ? s.updateMe : s.updatePartner;
      dock = (
        <div className="space-y-2">
          <Chips
            cols={4}
            items={MBTI_TYPES.map((m) => ({ id: m, label: m }))}
            onPick={(m) => {
              set({ mbti: m });
              advance();
            }}
          />
          <button
            onClick={() => {
              set({ mbti: "" });
              advance();
            }}
            className="w-full rounded-2xl border border-line py-2.5 text-sm text-muted"
          >
            🤷 몰라
          </button>
        </div>
      );
      break;
    }
    case "pname":
      dock = (
        <TextDock
          initial={input.partner.name}
          placeholder="예: 태현"
          onSend={(v) => {
            s.updatePartner({ name: v });
            advance();
          }}
        />
      );
      break;
    case "status":
      dock = (
        <Chips
          cols={2}
          items={STATUS_OPTIONS.map((o) => ({ id: o.id, label: `${o.emoji} ${o.label}`, sub: o.desc }))}
          onPick={(id) => {
            s.setStatus(id as RelationshipStatus);
            advance();
          }}
        />
      );
      break;
    case "ritual":
      dock = (
        <button onClick={advance} className="btn-primary glow chip-pop w-full py-4 text-[16px]">
          {cur.id === "incense" ? "🕯️ 향 피우기" : `🔮 ${josa(p, "을/를")} 떠올렸다`}
        </button>
      );
      break;
    case "q": {
      const q = cur.q;
      const self = cur.part === "self";
      dock = (
        <Chips
          items={q.options.map((o) => ({ id: o.id, label: fill(o.label, p) }))}
          onPick={(id) => {
            if (self) s.setSelf(q.id, id);
            else s.setPartnerObs(q.id, id);
            advance();
          }}
        />
      );
      break;
    }
    case "end":
      dock = (
        <button onClick={() => setScreen("loading")} className="btn-primary glow shine chip-pop w-full py-4 text-[17px]">
          🔮 점괘 보기
        </button>
      );
      break;
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      {/* Header: the consultation room */}
      <header className="z-20 shrink-0 border-b border-line bg-bg/85 px-4 pb-3 pt-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen("landing")} className="py-1 pr-1 text-lg text-muted" aria-label="나가기">
            ✕
          </button>
          <div className="relative">
            <Nyang mood={typing ? "talk" : lastMood} size={38} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg bg-green-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-tight">냥신 상담소 · 1:1 면담</p>
            <p className="text-xs text-muted">{typing ? "냥신이 입력 중…" : inQ || qDone ? `질문 ${Math.min(qDone + 1, qTurns.length)} / ${qTurns.length}` : "기본 정보 확인 중"}</p>
          </div>
          <span className="flicker text-xl" aria-hidden>
            🕯️
          </span>
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink to-violet transition-all duration-700 ease-out"
            style={{ width: `${((step + 1) / turns.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Thread — tap to skip the typing */}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 pb-4 pt-5" onClick={() => !done && setRevealed(msgs.length)}>
        {msgs.slice(0, revealed).map((m, k) =>
          m.who === "me" ? (
            <MeBubble key={m.key} text={m.text} />
          ) : (
            <NyangBubble key={m.key} msg={m} avatar={k + 1 === revealed ? !typing : msgs[k + 1]?.who !== "nyang"} />
          ),
        )}
        {typing && <Typing />}
        <div ref={bottom} className="h-1" />
      </div>

      {/* Dock */}
      <div className="dock z-10 max-h-[58dvh] shrink-0 overflow-y-auto border-t border-line bg-bg/95 px-4 pb-5 pt-4">
        {done ? (
          <div key={step}>
            {dock}
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="mt-3 w-full text-center text-xs text-muted">
                ↩ 방금 답 고치기
              </button>
            )}
          </div>
        ) : (
          <p className="py-3 text-center text-xs text-muted/70">냥신이 말하는 중… (탭하면 넘어가요)</p>
        )}
      </div>
    </main>
  );
}
