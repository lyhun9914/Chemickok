"use client";

import { useRef } from "react";
import {
  GENDER_LABEL,
  LIKERT_LABELS,
  MBTI_TYPES,
  MODE_OPTIONS,
  PARTNER_QUESTIONS,
  SELF_QUESTIONS,
  STATUS_OPTIONS,
  fillPartner,
  type LikertQuestion,
} from "@/lib/questions";
import type { Gender, Mode, PersonInput } from "@/models/types";
import { useAppStore } from "@/store/useAppStore";
import { Say, type Mood } from "./Nyang";

type Step =
  | { kind: "mode" | "me" | "partner" | "status" | "intro1" | "intro2" }
  | { kind: "self" | "obs"; q: LikertQuestion; num: number };

function stepsFor(mode: Mode): Step[] {
  const self: Step[] = SELF_QUESTIONS.map((q, i) => ({ kind: "self", q, num: i + 1 }));
  if (mode === "solo") {
    return [{ kind: "mode" }, { kind: "me" }, { kind: "intro1" }, ...self];
  }
  const obs: Step[] = PARTNER_QUESTIONS.map((q, i) => ({ kind: "obs", q, num: i + 1 }));
  return [
    { kind: "mode" },
    { kind: "me" },
    { kind: "partner" },
    { kind: "status" },
    { kind: "intro1" },
    ...self,
    { kind: "intro2" },
    ...obs,
  ];
}

function ProgressBar({ step, total, kind }: { step: number; total: number; kind: Step["kind"] }) {
  const pct = ((step + 1) / total) * 100;
  const part =
    kind === "self" || kind === "intro1" ? "PART 1 · 나의 연애 성향" : kind === "obs" || kind === "intro2" ? "PART 2 · 그 사람 관찰" : "기본 정보";
  return (
    <div className="px-5 pt-5">
      <div className="mb-2 flex justify-between text-xs text-muted">
        <span>{part}</span>
        <span>
          {step + 1} / {total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink to-violet transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-pink/60";

function PersonStep({
  title,
  person,
  optionalBirth,
  onChange,
}: {
  title: React.ReactNode;
  person: PersonInput;
  optionalBirth?: boolean;
  onChange: (p: Partial<PersonInput>) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold leading-snug">{title}</h2>
      <label className="block">
        <span className="mb-2 block text-sm text-muted">이름 (닉네임 OK)</span>
        <input
          className={inputCls}
          value={person.name}
          maxLength={12}
          placeholder="예: 지민"
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </label>
      <div>
        <span className="mb-2 block text-sm text-muted">성별</span>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onChange({ gender: g })}
              className={`rounded-xl border py-3 text-sm font-medium transition ${
                person.gender === g ? "border-pink bg-pink/15 text-ink" : "border-line bg-surface-2 text-muted"
              }`}
            >
              {GENDER_LABEL[g]}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm text-muted">
          생년월일 (양력){optionalBirth && <span className="text-xs"> · 모르면 비워두세요</span>}
        </span>
        <input
          type="date"
          className={inputCls}
          value={person.birthdate}
          min="1940-01-01"
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => onChange({ birthdate: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm text-muted">
          태어난 시간 <span className="text-xs">(선택 · 시주까지 보면 더 정확해요)</span>
        </span>
        <input
          type="time"
          className={inputCls}
          value={person.birthtime ?? ""}
          onChange={(e) => onChange({ birthtime: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm text-muted">
          MBTI <span className="text-xs">(선택 · MBTI 궁합까지 알려드려요)</span>
        </span>
        <select
          className={`${inputCls} appearance-none`}
          value={person.mbti ?? ""}
          onChange={(e) => onChange({ mbti: e.target.value })}
        >
          <option value="">모르겠어요 / 건너뛰기</option>
          {MBTI_TYPES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const DOT_SIZES = ["h-12 w-12", "h-10 w-10", "h-8 w-8", "h-10 w-10", "h-12 w-12"];
const DOT_COLORS = ["border-violet", "border-violet/70", "border-white/30", "border-pink/70", "border-pink"];
const DOT_FILL = ["bg-violet", "bg-violet/70", "bg-white/40", "bg-pink/70", "bg-pink"];

function Likert({ value, onPick }: { value?: number; onPick: (v: number) => void }) {
  return (
    <div className="mt-10">
      <div className="flex items-center justify-between px-1">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            aria-label={LIKERT_LABELS[v - 1]}
            onClick={() => onPick(v)}
            className={`flex items-center justify-center rounded-full border-2 transition active:scale-90 ${DOT_SIZES[v - 1]} ${
              DOT_COLORS[v - 1]
            } ${value === v ? DOT_FILL[v - 1] : "bg-transparent"}`}
          >
            {value === v && <span className="text-sm font-bold text-white">✓</span>}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs">
        <span className="text-violet">전혀 아니다</span>
        <span className="text-pink">매우 그렇다</span>
      </div>
    </div>
  );
}

function PartIntro({ part, title, desc, tip }: { part: string; title: string; desc: string; tip: string }) {
  return (
    <div className="flex flex-col items-center pt-10 text-center">
      <span className="rounded-full border border-pink/30 bg-pink/10 px-3 py-1 text-xs font-semibold text-pink">{part}</span>
      <h2 className="mt-5 text-2xl font-bold leading-snug">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">{desc}</p>
      <div className="mt-8 w-full rounded-2xl bg-white/[0.04] p-4 text-left text-sm leading-relaxed">
        <p className="mb-1 font-semibold">💡 정확도를 높이는 팁</p>
        <p className="text-muted">{tip}</p>
      </div>
    </div>
  );
}

const SELF_LINES: [string, Mood][] = [
  ["솔직하게 답해라냥. 냥신은 거짓말 다 안다냥 😼", "smug"],
  ["흠… 이건 중요하다냥.", "talk"],
  ["오호, 벌써 좀 보인다냥.", "wow"],
  ["이거 은근 뜨끔하지냥?", "smug"],
  ["첫 느낌대로 고르라냥. 고민하면 거짓말이 섞인다냥.", "talk"],
  ["반 넘게 왔다냥. 착하다냥.", "happy"],
  ["…계속하라냥.", "smug"],
  ["이 질문에서 많이들 멈칫한다냥.", "talk"],
  ["거의 다 보인다냥. 조금만 더.", "wow"],
  ["흐음… 그렇구냥.", "smug"],
  ["두 개 남았다냥!", "happy"],
  ["마지막이다냥. 신중하게.", "talk"],
];

function lineFor(cur: Step, pName: string, solo: boolean): [string, Mood] {
  switch (cur.kind) {
    case "mode":
      return ["누구 연애가 궁금하냥? 골라라냥.", "smug"];
    case "me":
      return ["네 생년월일부터 내놔라냥. 태어난 시간까지 알면 더 잘 보인다냥.", "talk"];
    case "partner":
      return [`${pName === "그 사람" ? "그 사람" : pName} 정보도 내놔라냥. 생일 모르면… 뭐, 대충 보겠다냥.`, "smug"];
    case "status":
      return ["둘이 지금 무슨 사이냥? 솔직하게 말해라냥.", "talk"];
    case "intro1":
      return [solo ? "이제 너를 들여다보겠다냥. 지난 연애나 썸을 떠올리며 답해라냥." : "이제 너부터 들여다보겠다냥. 각오해라냥.", "smug"];
    case "intro2":
      return [`이제 ${pName} 얘기다냥. 네가 본 그대로 답해라냥.`, "talk"];
    case "self":
      return SELF_LINES[(cur.num - 1) % SELF_LINES.length];
    case "obs":
      return cur.num === 8
        ? ["마지막이다냥! 점괘 볼 준비 됐냥?", "happy"]
        : cur.num % 3 === 0
          ? ["기억 안 나면 '보통'도 괜찮다냥.", "talk"]
          : [`${pName}는 어떻냥?`, "smug"];
  }
}

export function Questionnaire() {
  const s = useAppStore();
  const { step, setStep, setScreen, input } = s;
  const advancing = useRef(false);

  const steps = stepsFor(input.mode);
  const cur = steps[Math.min(step, steps.length - 1)];
  const solo = input.mode === "solo";
  const pName = input.partner.name || "그 사람";

  const canNext = (() => {
    if (cur.kind === "me") return input.me.name.trim() !== "" && input.me.birthdate !== "";
    if (cur.kind === "partner") return input.partner.name.trim() !== "";
    if (cur.kind === "self") return Boolean(input.self[cur.q.id]);
    if (cur.kind === "obs") return Boolean(input.partnerObs[cur.q.id]);
    return true;
  })();

  const next = () => {
    advancing.current = false;
    if (step < steps.length - 1) setStep(step + 1);
    else setScreen("loading");
  };
  const back = () => (step === 0 ? setScreen("landing") : setStep(step - 1));

  // Single-choice steps auto-advance for a snappy, test-like rhythm.
  const choose = (fn: () => void) => {
    fn();
    if (advancing.current) return;
    advancing.current = true;
    setTimeout(next, 230);
  };

  let body: React.ReactNode;
  let showNext = true;

  switch (cur.kind) {
    case "mode":
      showNext = false;
      body = (
        <div className="space-y-5">
          <h2 className="text-2xl font-bold leading-snug">
            어떤 결과가 <span className="text-gradient">궁금하세요?</span>
          </h2>
          <div className="space-y-3">
            {MODE_OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => choose(() => s.setMode(o.id))}
                className={`flex w-full items-center gap-4 rounded-3xl border p-5 text-left transition active:scale-[0.98] ${
                  input.mode === o.id ? "border-pink bg-pink/15" : "border-line bg-surface"
                }`}
              >
                <span className="text-4xl">{o.emoji}</span>
                <span>
                  <span className="block text-lg font-bold">{o.label}</span>
                  <span className="block text-sm text-muted">{o.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      );
      break;
    case "me":
      body = (
        <PersonStep
          title={<>먼저 <span className="text-gradient">나</span>에 대해 알려주세요</>}
          person={input.me}
          onChange={s.updateMe}
        />
      );
      break;
    case "partner":
      body = (
        <PersonStep
          title={<>궁금한 <span className="text-gradient">그 사람</span>은요?</>}
          person={input.partner}
          optionalBirth
          onChange={s.updatePartner}
        />
      );
      break;
    case "status":
      showNext = false;
      body = (
        <div className="space-y-5">
          <h2 className="text-2xl font-bold leading-snug">
            {pName}님과 지금 <span className="text-gradient">어떤 사이</span>예요?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {STATUS_OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => choose(() => s.setStatus(o.id))}
                className={`rounded-2xl border p-4 text-left transition active:scale-[0.97] ${
                  input.status === o.id ? "border-pink bg-pink/15" : "border-line bg-surface"
                }`}
              >
                <div className="text-3xl">{o.emoji}</div>
                <div className="mt-2 font-bold">{o.label}</div>
                <div className="text-xs text-muted">{o.desc}</div>
              </button>
            ))}
          </div>
        </div>
      );
      break;
    case "intro1":
      body = (
        <PartIntro
          part={`PART 1 · ${SELF_QUESTIONS.length}문항`}
          title="나의 연애 성향 진단"
          desc="애착 이론과 갈등 대처 유형을 참고한 문항으로 관계 주도성·감정 표현·갈등 대처·애착 스타일 4가지 축을 측정해요."
          tip={
            solo
              ? "지금 연애 중이 아니라면 지난 연애나 썸을 떠올려 답해 주세요. 오래 고민하지 말고 첫 느낌대로 고르는 게 가장 정확해요."
              : "'이래야 한다'가 아니라 실제로 내가 하는 행동을 떠올리세요. 오래 고민하지 말고 첫 느낌대로 고르는 게 가장 정확해요."
          }
        />
      );
      break;
    case "intro2":
      body = (
        <PartIntro
          part={`PART 2 · ${PARTNER_QUESTIONS.length}문항`}
          title={`${pName}님 관찰 진단`}
          desc={`지금까지 본 ${pName}님의 행동을 떠올리며 답해 주세요. 이 응답으로 ${pName}님의 유형과 숨은 속마음을 분석해요.`}
          tip="잘 모르겠는 문항은 '보통이다'를 골라도 괜찮아요. 최근 한두 달의 모습을 기준으로 떠올려 보세요."
        />
      );
      break;
    case "self":
    case "obs": {
      showNext = false;
      const q = cur.q;
      const isSelf = cur.kind === "self";
      const value = isSelf ? input.self[q.id] : input.partnerObs[q.id];
      body = (
        <div className="pt-6">
          <p className="text-sm font-semibold text-pink">Q{cur.num}.</p>
          <h2 className="mt-2 min-h-[5.5rem] text-[22px] font-bold leading-snug">{fillPartner(q.text, pName)}</h2>
          <Likert value={value} onPick={(v) => choose(() => (isSelf ? s.setSelf(q.id, v) : s.setPartnerObs(q.id, v)))} />
        </div>
      );
      break;
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <ProgressBar step={step} total={steps.length} kind={cur.kind} />
      <div className="px-5 pt-2">
        <button onClick={back} className="py-2 text-sm text-muted" aria-label="이전">
          ← 이전
        </button>
      </div>
      <div key={step} className="step-enter flex-1 px-5 pb-6 pt-2">
        <div className="mb-5">
          <Say mood={lineFor(cur, pName, solo)[1]}>{lineFor(cur, pName, solo)[0]}</Say>
        </div>
        {body}
      </div>
      {showNext && (
        <div className="sticky bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-6 pt-4">
          <button onClick={next} disabled={!canNext} className="btn-primary w-full py-4 text-base">
            {cur.kind === "intro1" || cur.kind === "intro2" ? "시작하기" : "다음"}
          </button>
        </div>
      )}
    </main>
  );
}
