import type { AxisResult, ElementKey, FullReport, ReportSection, SajuSummary, TeaserReport } from "@/models/types";

export function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--pink)" />
            <stop offset="100%" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#ring)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black">{score}%</span>
        <span className="text-xs text-muted">궁합 지수</span>
      </div>
    </div>
  );
}

export function Card({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <article
      className={`fade-up rounded-3xl border border-line bg-surface p-5 ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </article>
  );
}

export function AxisBars({ axes }: { axes: AxisResult[] }) {
  return (
    <div className="space-y-4">
      {axes.map((a) => {
        const leftWins = a.leftPct >= 50;
        const pct = leftWins ? a.leftPct : 100 - a.leftPct;
        return (
          <div key={a.key}>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className={leftWins ? "font-bold text-pink" : "text-muted"}>{a.leftLabel}</span>
              <span className="text-muted">{a.title}</span>
              <span className={!leftWins ? "font-bold text-violet" : "text-muted"}>{a.rightLabel}</span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`absolute inset-y-0 rounded-full ${leftWins ? "left-0 bg-pink" : "right-0 bg-violet"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className={`mt-1 text-[11px] ${leftWins ? "text-left text-pink" : "text-right text-violet"}`}>{pct}%</p>
          </div>
        );
      })}
    </div>
  );
}

const ELEMENT_UI: Record<ElementKey, { label: string; color: string }> = {
  wood: { label: "목", color: "#4ade80" },
  fire: { label: "화", color: "#fb7185" },
  earth: { label: "토", color: "#fbbf24" },
  metal: { label: "금", color: "#e5e7eb" },
  water: { label: "수", color: "#60a5fa" },
};

export function SajuChart({ saju }: { saju: SajuSummary }) {
  const total = Object.values(saju.elements).reduce((s, n) => s + n, 0);
  // Traditional order is right-to-left: 시 일 월 년
  const pillars = [...saju.pillars].reverse();
  return (
    <div>
      <div className={`grid gap-2 ${pillars.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {pillars.map((p) => (
          <div
            key={p.label}
            className={`rounded-2xl border p-2.5 text-center ${p.label === "일주" ? "border-pink/60 bg-pink/10" : "border-line bg-white/[0.03]"}`}
          >
            <div className="text-[11px] text-muted">{p.label}</div>
            <div className="mt-1 font-serif text-2xl leading-tight tracking-widest">{p.hanja}</div>
            <div className="text-xs text-muted">{p.hangul}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 mb-2 text-xs text-muted">오행 분포</p>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
        {(Object.keys(saju.elements) as ElementKey[]).map((el) =>
          saju.elements[el] ? (
            <div key={el} style={{ width: `${(saju.elements[el] / total) * 100}%`, background: ELEMENT_UI[el].color }} />
          ) : null,
        )}
      </div>
      <div className="mt-2 flex justify-between text-xs">
        {(Object.keys(saju.elements) as ElementKey[]).map((el) => (
          <span key={el} className={el === saju.lacking ? "font-bold text-peach" : "text-muted"}>
            <span style={{ color: ELEMENT_UI[el].color }}>●</span> {ELEMENT_UI[el].label} {saju.elements[el]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PersonalReading({ teaser, myName }: { teaser: TeaserReport; myName: string }) {
  const { personal } = teaser;
  return (
    <div className="space-y-4">
      {personal.dayMasterReading && (
        <Card>
          <p className="text-xs font-semibold text-muted">🀄 일간(日干) 해석</p>
          <p className="mt-2 text-[15px] leading-relaxed">{personal.dayMasterReading}</p>
        </Card>
      )}
      <Card delay={0.05}>
        <p className="text-xs font-semibold text-muted">
          {teaser.myType.emoji} {myName}님의 연애 성향
        </p>
        <p className="mt-2 text-[16px] font-bold leading-snug">{personal.signature}</p>
        {personal.traits.map((t) => (
          <p key={t} className="mt-3 text-[15px] leading-relaxed text-ink/90">
            {t}
          </p>
        ))}
      </Card>
      {personal.quote && (
        <Card delay={0.1} className="border-pink/30">
          <p className="text-xs font-semibold text-pink">📌 {myName}님의 답변에서 읽힌 것</p>
          <p className="mt-3 rounded-xl bg-white/[0.04] p-3 text-sm leading-relaxed text-muted">
            「{personal.quote.question}」
            <br />→ <b className="text-ink">{personal.quote.answer}</b>
          </p>
          <p className="mt-3 text-[15px] leading-relaxed">{personal.quote.reading}</p>
        </Card>
      )}
      <Card delay={0.15}>
        <p className="text-xs font-semibold text-muted">😳 혹시 이런 적 있지 않나요?</p>
        <ul className="mt-3 space-y-2.5">
          {personal.scenes.map((s) => (
            <li key={s} className="flex gap-2 text-[15px] leading-relaxed">
              <span className="text-pink">✔</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function SectionCard({ icon, section, delay }: { icon: string; section: ReportSection; delay: number }) {
  return (
    <Card delay={delay}>
      <div className="mb-2 text-2xl">{icon}</div>
      <h3 className="text-xs font-semibold tracking-wide text-muted">{section.title}</h3>
      <p className="mt-1 text-[17px] font-bold leading-snug">{section.headline}</p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink/90">{section.body}</p>
      <ul className="mt-4 space-y-2">
        {section.bullets.map((b) => (
          <li key={b} className="rounded-xl bg-white/[0.04] px-3 py-2 text-sm leading-relaxed">
            {b}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function HiddenMindCard({ section }: { section: ReportSection }) {
  return <SectionCard icon="🔒" section={section} delay={0} />;
}

export function FullReportView({ report }: { report: FullReport }) {
  const { luck } = report;
  return (
    <div className="space-y-4">
      <Card>
        <p className="mb-3 text-xs font-semibold text-muted">📊 세부 궁합 지표</p>
        <div className="space-y-3">
          {report.subScores.map((s) => (
            <div key={s.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{s.label}</span>
                <span className="font-bold">{s.score}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-pink to-violet" style={{ width: `${s.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <SectionCard icon="💖" section={report.overall} delay={0.05} />
      <SectionCard icon="🔒" section={report.hiddenMind} delay={0.1} />
      <SectionCard icon="🔥" section={report.chemistry} delay={0.15} />
      <SectionCard icon="⚡" section={report.crisis} delay={0.2} />
      <Card delay={0.25}>
        <div className="mb-2 text-2xl">🔮</div>
        <h3 className="text-xs font-semibold tracking-wide text-muted">{luck.title}</h3>
        <p className="mt-1 text-[17px] font-bold leading-snug">{luck.headline}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/90">{luck.body}</p>
        {luck.luckyDays.length > 0 && (
          <div className="mt-4 rounded-2xl border border-peach/30 bg-peach/5 p-3">
            <p className="text-xs font-semibold text-peach">📅 이번 달 연애 길일</p>
            <ul className="mt-2 space-y-1 text-sm">
              {luck.luckyDays.map((d) => (
                <li key={d}>· {d}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          {[
            ["행운의 컬러", luck.luckyColor],
            ["행운의 장소", luck.luckyPlace],
            ["행운의 아이템", luck.luckyItem],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-violet/10 p-2.5">
              <div className="text-muted">{k}</div>
              <div className="mt-1 font-semibold leading-snug">{v}</div>
            </div>
          ))}
        </div>
        <ol className="mt-4 space-y-2">
          {luck.actionItems.map((a) => (
            <li key={a} className="text-sm leading-relaxed">
              {a}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

const LOCKED = {
  hiddenMind: { icon: "🔒", title: "상대방이 말하지 않는 진짜 속마음 & 섭섭한 점" },
  chemistry: { icon: "🔥", title: "두 사람의 스킨십 / 속궁합 & 멘탈 케미 폭발 지점" },
  crisis: { icon: "🔮", title: "결정적 이별 예방책 & 개운(開運) 공략 가이드 (이번 달 길일 포함)" },
};

// Placeholder text only — the real paid content never reaches the browser before unlock.
const DUMMY =
  "이 사람은 겉으로는 무심해 보여도 속으로는 생각보다 훨씬 많이 신경 쓰고 있어요. 특히 최근에 섭섭했던 순간은 바로 그때인데요, 사실 진짜 이유는";

export function LockedCard({ kind, onClick }: { kind: keyof typeof LOCKED; onClick: () => void }) {
  const s = LOCKED[kind];
  return (
    <button onClick={onClick} className="relative block w-full overflow-hidden rounded-3xl border border-line bg-surface p-5 text-left">
      <div className="flex items-center gap-2">
        <span className="text-xl">{s.icon}</span>
        <h3 className="text-[15px] font-bold">{s.title}</h3>
      </div>
      <p className="locked-text mt-3 text-sm leading-relaxed text-muted" aria-hidden>
        {DUMMY}
      </p>
      <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-gradient-to-t from-surface to-transparent pb-3">
        <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold">🔐 잠금 해제하고 보기</span>
      </div>
    </button>
  );
}
