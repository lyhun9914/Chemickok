"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PARTNER_INTERVIEW, UNKNOWN_ANSWER, UNKNOWN_LABEL, answerLabel, fill, isCustom, selfInterview, optionOf, type InterviewQuestion } from "@/lib/interview";
import { josa } from "@/lib/josa";
import { GENDER_LABEL, MBTI_TYPES, MODE_OPTIONS, STATUS_OPTIONS } from "@/lib/questions";
import { FORTUNE_INTERVIEW } from "@/lib/fortuneQuestions";
import type { FortuneMode, Gender, Mode, QuestionnaireInput, RelationshipStatus } from "@/models/types";
import { isFortune, productOf } from "@/lib/config";
import { useAppStore } from "@/store/useAppStore";
import { DateTimeSelects } from "./DateTimeSelects";
import { flareCandles } from "./Backdrop";
import { Nyang, type Mood } from "./Nyang";

// ───────────── Script ─────────────

type Turn =
  | { kind: "mode" | "name" | "gender" | "birth" | "time" | "mbti" | "pname" | "pbirth" | "pmbti" | "status" | "end" }
  | { kind: "ritual"; id: "incense" | "orb" }
  | { kind: "q"; q: InterviewQuestion; part: "self" | "partner"; num: number };

/** The questions for a product: the love interview, or the 사주·운세 consultation (lib/fortuneQuestions). */
const selfQs = (mode: Mode): InterviewQuestion[] => (isFortune(mode) ? FORTUNE_INTERVIEW[mode] : selfInterview(mode));

/**
 * `saved`: 기본 정보 is already known (logged in, or "다른 사람이랑 궁합" after a reading), so name/birth/MBTI
 * aren't asked again. `modeKnown`: the product was picked on the landing page; 냥신 still greets in that turn.
 */
function turnsFor(mode: Mode, saved: boolean): Turn[] {
  const self: Turn[] = selfQs(mode).map((q, i) => ({ kind: "q", q, part: "self", num: i + 1 }));
  if (isFortune(mode)) {
    // The chart needs name · gender (대운 direction) · birth; no MBTI. 재회운 also asks who the ex is.
    const info: Turn[] = saved ? [{ kind: "mode" }] : [{ kind: "mode" }, { kind: "name" }, { kind: "gender" }, { kind: "birth" }, { kind: "time" }];
    const ex: Turn[] = mode === "reunion" ? [{ kind: "pname" }, { kind: "pbirth" }] : [];
    return [...info, ...ex, { kind: "ritual", id: "incense" }, ...self, { kind: "end" }];
  }
  const info: Turn[] = saved
    ? [{ kind: "mode" }]
    : [{ kind: "mode" }, { kind: "name" }, { kind: "gender" }, { kind: "birth" }, { kind: "time" }, { kind: "mbti" }];
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

/** 사주·운세 lines, per product. {p} is the ex (재회운). */
const FORTUNE_SCRIPT: Record<FortuneMode, { intro: string; welcome: [string, Mood]; ritual: string[]; end: string }> = {
  saju: {
    intro: "사주는 태어난 해·달·날·시, 여덟 글자로 본다냥. 한 글자만 틀려도 풀이가 틀어진다냥.",
    welcome: ["좋다냥. 여덟 글자, 하나도 안 빼고 읽어 주겠다냥.", "smug"],
    ritual: ["원국을 세웠다냥.", "이제 점집에서 묻는 걸 그대로 묻겠다냥. 맞히려고 묻는 게 아니다냥. 네 사주랑 맞춰 보려고 묻는 거다냥 😼"],
    end: "원국이랑 네 답이 다 맞춰졌다냥. 감정서를 펼쳐 볼까냥?",
  },
  daeun: {
    intro: "대운은 10년마다 갈아타는 운의 물줄기다냥. 생일과 성별로 방향과 대운수가 정해진다냥.",
    welcome: ["좋다냥. 지나온 10년, 앞으로 올 10년, 다 짚어 주겠다냥.", "smug"],
    ritual: ["대운수를 셌다냥.", "지나온 날부터 묻겠다냥. 지나온 게 맞아야 앞날도 믿을 수 있는 법이다냥 😼"],
    end: "지나온 대운이랑 네 답이 맞아떨어진다냥. 인생 그래프를 펼쳐 볼까냥?",
  },
  reunion: {
    intro: "그 사람이랑 다시 이어질지, 언제 어떻게 연락해야 하는지 보겠다냥.",
    welcome: ["…다시 만나고 싶구냥. 얼굴에 다 써 있다냥.", "wow"],
    ritual: ["{p}… 이름을 들으니 끈이 하나 보인다냥.", "헤어진 얘기, 아픈 데까지 묻겠다냥. 솔직해야 날짜가 정확해진다냥 😼"],
    end: "너랑 {p} 사이의 끈이 다 보인다냥. 감정서를 펼쳐 볼까냥?",
  },
  spouse: {
    intro: "네 사주의 배우자 자리에 누가 앉아 있는지 보겠다냥.",
    welcome: ["좋다냥. 네 짝이 지금 어디서 뭘 하고 있는지 보자냥 😼", "smug"],
    ritual: ["배우자 자리를 펼쳤다냥.", "몇 가지만 묻겠다냥. 네가 끌리는 사람과 네가 결혼할 사람은 다를 수 있다냥 😼"],
    end: "배우자 자리에 앉은 사람이 보인다냥. 감정서를 펼쳐 볼까냥?",
  },
};

interface Ctx {
  saved: boolean;
  modeKnown: boolean;
}

function asks(t: Turn, i: QuestionnaireInput, { saved, modeKnown }: Ctx): ReturnType<typeof n>[] {
  const p = i.partner.name || "그 사람";
  if (isFortune(i.mode)) {
    const f = FORTUNE_SCRIPT[i.mode];
    switch (t.kind) {
      case "mode":
        return [
          saved ? n(`${iGuNyang(i.me.name)}. 또 왔냥? …올 줄 알았다냥 🕯️`, "happy") : n("…왔구냥. 앉아라냥. 여기서 거짓말하면 촛불이 먼저 안다냥 🕯️", "smug"),
          n(`오늘은 ${iGuNyang(`'${productOf(i.mode).name}'`)}. ${f.intro}`),
          ...(saved ? [n("생년월일은 기억하고 있으니 바로 시작하겠다냥.")] : []),
        ];
      case "name":
        return [n("좋다냥. 먼저 이름부터 대라냥."), n("감정서 맨 위에 적을 이름이다냥.", "smug")];
      case "gender":
        return [n("성별은? 대운이 도는 방향이 성별로 갈린다냥.")];
      case "birth":
        return [n("생년월일을 대라냥. 양력으로."), n("음력 생일이면 양력으로 바꿔서 넣어라냥. 하루만 달라도 일주가 바뀐다냥.", "smug")];
      case "time":
        return [n("태어난 시간을 알면 시주(時柱)까지, 여덟 글자를 다 본다냥. 모르면 '몰라' 눌러라냥. 여섯 글자로도 본다냥.")];
      case "pname":
        return [n("이제 그 사람 차례다냥."), n("헤어진 그 사람, 이름이 뭐냥?", "smug")];
      case "pbirth":
        return [n(`${p} 생일 알면 대라냥. 두 사람 일간 궁합까지 본다냥. 몰라도 된다냥.`)];
      case "ritual":
        return [...f.ritual.map((l, k) => n(fill(l, p), k ? "smug" : "talk")), n("향에 불을 붙여라냥.")];
      case "end":
        return [n("…됐다냥.", "wow"), n(fill(f.end, p), "smug")];
    }
  }
  switch (t.kind) {
    case "mode": {
      const hello = saved ? n(`${iGuNyang(i.me.name)}. 또 왔냥? …올 줄 알았다냥 🕯️`, "happy") : n("…왔구냥. 앉아라냥. 여기서 거짓말하면 촛불이 먼저 안다냥 🕯️", "smug");
      if (modeKnown) {
        return [hello, n(`오늘은 ${iGuNyang(`'${productOf(i.mode).name}'`)}. ${saved ? "생년월일은 기억하고 있으니 바로 시작하겠다냥." : "좋다냥, 몇 가지만 물어보겠다냥."}`)];
      }
      return [hello, n(saved ? "생년월일은 기억하고 있으니 바로 시작하겠다냥. 오늘은 누구 연애를 봐 줄까냥?" : "오늘은 누구 연애를 봐 줄까냥?")];
    }
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
function answerOf(t: Turn, i: QuestionnaireInput, { modeKnown }: Ctx): string {
  switch (t.kind) {
    case "mode":
      return modeKnown ? "🕯️ 좋아, 시작하자" : MODE_OPTIONS.find((o) => o.id === i.mode)!.label;
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
      return fill(answerLabel(t.part === "self" ? selfQs(i.mode) : PARTNER_INTERVIEW, t.q.id, answers[t.q.id]), i.partner.name);
    }
    case "end":
      return "";
  }
}

const UNKNOWN_REACTS = ["모르는 것도 답이다냥. 따로 적어 두겠다냥.", "흠, 모르겠다… 그것도 의미가 있다냥.", "괜찮다냥. 냥신이 그 빈칸까지 읽겠다냥."];

const CUSTOM_REACTS = [
  "오호… 보기에 없는 답이구냥. 이런 게 진짜 정보다냥 😼",
  "흠… 직접 썼구냥. 냥신이 한 글자씩 꼼꼼히 읽겠다냥.",
  "그렇구냥… 이건 따로 메모해 두겠다냥 📝",
  "네 말로 들으니까 더 잘 보인다냥.",
];

function reactsOf(t: Turn, i: QuestionnaireInput): ReturnType<typeof n>[] {
  const p = i.partner.name || "그 사람";
  switch (t.kind) {
    case "mode":
      if (isFortune(i.mode)) return [n(...FORTUNE_SCRIPT[i.mode].welcome)];
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
      return [n(i.mode === "reunion" ? `${iGuNyang(p)}… 흠, 아직 끈이 붙어 있다냥.` : `${iGuNyang(p)}… 흠.`, "smug")];
    case "pbirth":
      if (i.mode === "reunion")
        return [i.partner.birthdate ? n(`${animalOf(i.partner.birthdate)}띠구냥. 두 사람 일간을 나란히 놓고 보겠다냥.`, "wow") : n("괜찮다냥. 네 사주와 네 답으로 보겠다냥.")];
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
      const qs = t.part === "self" ? selfQs(i.mode) : PARTNER_INTERVIEW;
      const a = (t.part === "self" ? i.self : i.partnerObs)[t.q.id];
      const o = optionOf(qs, t.q.id, a);
      const out =
        a === UNKNOWN_ANSWER
          ? [n(UNKNOWN_REACTS[t.num % UNKNOWN_REACTS.length], "talk")]
          : isCustom(a)
            ? [n(CUSTOM_REACTS[(a.length + t.num) % CUSTOM_REACTS.length], "wow")]
            : o
              ? [n(o.react, o.mood ?? "smug")]
              : [];
      if (t.part === "self" && t.num === Math.ceil(selfQs(i.mode).length / 2)) out.push(n("벌써 반 왔다냥. 착하다냥 🐾", "happy"));
      return out;
    }
    default:
      return [];
  }
}

function buildThread(turns: Turn[], step: number, input: QuestionnaireInput, ctx: Ctx): { msgs: Msg[]; askStart: number } {
  const msgs: Msg[] = [];
  const push = (key: string, m: ReturnType<typeof n>) => msgs.push({ key, who: "nyang", ...m });
  turns.slice(0, step).forEach((t, ti) => {
    asks(t, input, ctx).forEach((m, k) => push(`${ti}a${k}`, m));
    msgs.push({ key: `${ti}me`, who: "me", text: answerOf(t, input, ctx) });
    reactsOf(t, input).forEach((m, k) => push(`${ti}r${k}`, m));
  });
  const askStart = msgs.length;
  const cur = turns[step];
  if (cur) asks(cur, input, ctx).forEach((m, k) => push(`${step}a${k}`, m));
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
        <div className="rounded-2xl rounded-bl-md hanji px-4 py-2.5 text-[15px] font-medium leading-relaxed text-[#2b1d16] shadow-sm">
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
      <div className="rounded-2xl rounded-bl-md hanji px-4 py-3">
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
      <div className="max-w-[78%] rounded-2xl rounded-br-md border border-violet/50 bg-gradient-to-b from-[#8e2219] to-[#5a120d] px-4 py-2.5 text-[15px] font-semibold leading-relaxed text-[#f6e3b8] shadow-sm">
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

/** Answer chips plus "잘 모르겠어". */
function QuestionDock({ options, onAnswer }: { options: { id: string; label: string }[]; onAnswer: (a: string) => void }) {
  return (
    <div className="space-y-2">
      <Chips items={options} onPick={onAnswer} />
      <button
        onClick={() => onAnswer(UNKNOWN_ANSWER)}
        className="chip-pop w-full rounded-2xl border border-dashed border-white/20 px-4 py-3 text-[14px] font-medium text-muted active:scale-[0.98]"
        style={{ animationDelay: `${options.length * 55}ms` }}
      >
        {UNKNOWN_LABEL}
      </button>
    </div>
  );
}

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
  const [value, setValue] = useState(initial);
  return (
    <div className="chip-pop space-y-2">
      <DateTimeSelects type={type} initial={initial} onChange={setValue} />
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
  const profile = useAppStore((st) => st.me?.profile);
  const preset = useAppStore((st) => st.preset);
  // Skip the info questions only when the interview actually holds the 기본 정보 (saved profile or carried over).
  const saved = Boolean(input.me.name && input.me.birthdate) && (preset.me || Boolean(profile && profile.name === input.me.name && profile.birthdate === input.me.birthdate));
  const modeKnown = preset.mode;
  const turns = useMemo(() => turnsFor(input.mode, saved), [input.mode, saved]);
  const cur = turns[Math.min(step, turns.length - 1)];
  const { msgs, askStart } = useMemo(
    () => buildThread(turns, Math.min(step, turns.length - 1), input, { saved, modeKnown }),
    [turns, step, input, saved, modeKnown],
  );

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

  const [leaving, setLeaving] = useState(false);
  const advance = () => {
    flareCandles();
    setStep(step + 1);
  };
  // Each step pulls the camera a little closer to the altar (see Backdrop).
  useEffect(() => {
    document.documentElement.style.setProperty("--progress", String(Math.min(1, (step + 1) / turns.length)));
  }, [step, turns.length]);
  const p = input.partner.name || "그 사람";
  const fortune = isFortune(input.mode);

  const qTurns = turns.filter((t) => t.kind === "q");
  const qDone = turns.slice(0, step).filter((t) => t.kind === "q").length;
  const inQ = cur.kind === "q" || (cur.kind === "ritual" && cur.id === "orb") || cur.kind === "end";
  const lastMood = [...msgs.slice(0, revealed)].reverse().find((m) => m.who === "nyang")?.mood ?? "smug";

  let dock: React.ReactNode = null;
  switch (cur.kind) {
    case "mode":
      dock = modeKnown ? (
        <button onClick={advance} className="btn-primary glow chip-pop w-full py-4 text-[16px]">
          🕯️ 좋아, 시작하자
        </button>
      ) : (
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
          hint={fortune ? "💡 감정서에 이 이름이 적혀요" : "💡 실제 성함을 넣으면 이름 획수 기운까지 분석해서 더 디테일해져요"}
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
          cols={fortune ? 2 : 3}
          items={(Object.keys(GENDER_LABEL) as Gender[]).filter((g) => !fortune || g !== "other").map((g) => ({ id: g, label: GENDER_LABEL[g] }))}
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
        <QuestionDock
          options={q.options.map((o) => ({ id: o.id, label: fill(o.label, p) }))}
          onAnswer={(a) => {
            if (self) s.setSelf(q.id, a);
            else s.setPartnerObs(q.id, a);
            advance();
          }}
        />
      );
      break;
    }
    case "end":
      dock = (
        <button onClick={() => setScreen("loading")} className="btn-primary glow shine chip-pop w-full py-4 text-[17px]">
          {fortune ? "📜 감정 결과 보기" : "🔮 점괘 보기"}
        </button>
      );
      break;
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      {/* Header: the consultation room */}
      <header className="z-20 shrink-0 border-b border-line bg-bg/80 px-4 pb-3 pt-3 md:bg-bg/55 md:backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => (step > 1 ? setLeaving(true) : setScreen("landing"))} className="py-1 pr-1 text-lg text-muted" aria-label="나가기">
            ✕
          </button>
          <div className="relative">
            <Nyang mood={typing ? "talk" : lastMood} size={38} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg bg-pink shadow-[0_0_6px_var(--pink)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-ritual text-[16px] leading-tight">{fortune ? `냥신 점집 · ${productOf(input.mode).name} 감정` : "냥신 점집 · 촛불 앞 면담"}</p>
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

      {leaving && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={() => setLeaving(false)}>
          <div className="chip-pop w-full max-w-[480px] rounded-t-3xl border border-line bg-surface p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-ritual text-[19px]">면담을 그만두겠냥?</p>
            <p className="mt-2 text-sm text-muted">지금 나가면 여기까지 답한 게 사라진다냥.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setScreen("landing")} className="rounded-2xl border border-line py-3 text-sm text-muted">
                그만 나갈래
              </button>
              <button onClick={() => setLeaving(false)} className="btn-primary py-3 text-sm">
                계속할래
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dock */}
      <div className="dock z-10 max-h-[58dvh] shrink-0 overflow-y-auto border-t border-line bg-bg/90 px-4 pb-5 pt-4 md:bg-bg/70 md:backdrop-blur-md">
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
