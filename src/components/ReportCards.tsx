import { Say } from "./Nyang";
import type {
  AxisResult,
  ElementKey,
  FullReport,
  LockedPreview,
  LuckSection,
  MatchTeaser,
  MbtiPair,
  PersonalReading as PersonalReadingT,
  ReportSection,
  SajuSummary,
  TeaserReport,
} from "@/models/types";

export function ScoreRing({ score, label = "궁합 지수" }: { score: number; label?: string }) {
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
        <span className="text-xs text-muted">{label}</span>
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

export function DayMasterCard({ personal }: { personal: PersonalReadingT }) {
  if (!personal.dayMasterReading) return null;
  return (
    <Card>
      <p className="text-xs font-semibold text-muted">🀄 일간(日干) 해석</p>
      <p className="mt-2 text-[15px] leading-relaxed">{personal.dayMasterReading}</p>
      {personal.nameReading && (
        <>
          <p className="mt-4 text-xs font-semibold text-muted">📛 이름에 담긴 기운</p>
          <p className="mt-2 text-[15px] leading-relaxed">{personal.nameReading}</p>
        </>
      )}
      {personal.elementReading && (
        <>
          <p className="mt-4 text-xs font-semibold text-muted">☯️ 오행으로 본 연애 기질</p>
          <p className="mt-2 text-[15px] leading-relaxed">{personal.elementReading}</p>
        </>
      )}
    </Card>
  );
}

export function TwoFacesCard({ personal, myName }: { personal: PersonalReadingT; myName: string }) {
  return (
    <Card className="border-violet/30">
      <p className="text-xs font-semibold text-violet">🌗 남들은 모르는 {myName}님의 두 얼굴</p>
      <p className="mt-3 text-[16px] font-bold leading-relaxed">{personal.twoFaces.outer},</p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink/90">{personal.twoFaces.inner}</p>
    </Card>
  );
}

export function TraitsCard({ teaser, myName }: { teaser: TeaserReport; myName: string }) {
  const { personal } = teaser;
  return (
    <Card>
      <p className="text-xs font-semibold text-muted">
        {teaser.myType.emoji} {myName}님의 연애 성향 상세 분석
      </p>
      <p className="mt-2 text-[16px] font-bold leading-snug">{personal.signature}</p>
      <div className="mt-4">
        <AxisBars axes={teaser.axes} />
      </div>
      <div className="mt-6 space-y-5">
        {personal.traits.map((t, i) => (
          <div key={t.title}>
            <p className="text-sm font-semibold">
              <span className="text-pink">0{i + 1}</span> {t.title} · <span className="text-pink">{t.label} {t.pct}%</span>
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink/90">{t.text}</p>
            {personal.scenes[i] && (
              <p className="mt-2 rounded-xl bg-white/[0.04] px-3 py-2 text-sm leading-relaxed text-muted">😳 {personal.scenes[i]}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function QuoteCard({ personal, myName }: { personal: PersonalReadingT; myName: string }) {
  if (!personal.quote) return null;
  return (
    <Card className="border-pink/30">
      <p className="text-xs font-semibold text-pink">📌 {myName}님의 답변에서 읽힌 것</p>
      <p className="mt-3 rounded-xl bg-white/[0.04] p-3 text-sm leading-relaxed text-muted">
        「{personal.quote.question}」
        <br />→ <b className="text-ink">{personal.quote.answer}</b>
      </p>
      <p className="mt-3 text-[15px] leading-relaxed">{personal.quote.reading}</p>
    </Card>
  );
}

export function SectionCard({ icon, section, delay = 0 }: { icon: string; section: ReportSection; delay?: number }) {
  return (
    <Card delay={delay}>
      <div className="mb-2 text-2xl">{icon}</div>
      <h3 className="text-xs font-semibold tracking-wide text-muted">{section.title}</h3>
      <p className="mt-1 text-[17px] font-bold leading-snug">{section.headline}</p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink/90">{section.body}</p>
      <ul className="mt-4 space-y-2">
        {section.bullets.map((b) => (
          <li key={b} className="whitespace-pre-line rounded-xl bg-white/[0.04] px-3 py-2 text-sm leading-relaxed">
            {b}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LuckCard({ luck }: { luck: LuckSection }) {
  return (
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
  );
}

/** intros: 냥신's line shown before each section (keyed by section id, "luck" for the luck card). */
export function FullReportView({ report, intros = {} }: { report: FullReport; intros?: Record<string, string> }) {
  return (
    <div className="space-y-4">
      {report.subScores.length > 0 && (
        <Card>
          <p className="mb-3 text-xs font-semibold text-muted">📊 세부 지표</p>
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
      )}
      {report.sections.map((s, i) => (
        <div key={s.id} className="space-y-3">
          {intros[s.id] && <Say mood={i % 2 ? "smug" : "talk"}>{intros[s.id]}</Say>}
          <SectionCard icon={s.icon} section={s.section} delay={0.05 * (i + 1)} />
        </div>
      ))}
      {report.luck && (
        <div className="space-y-3">
          {intros.luck && <Say mood="happy">{intros.luck}</Say>}
          <LuckCard luck={report.luck} />
        </div>
      )}
    </div>
  );
}

/** Free "who suits me" card. */
export function MatchCard({ match, myName }: { match: MatchTeaser; myName: string }) {
  return (
    <Card className="border-pink/30">
      <p className="text-xs font-semibold text-pink">💘 {myName}님과 찰떡인 사람</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-4xl">{match.bestType.emoji}</span>
        <div>
          <p className="text-[17px] font-bold leading-snug">{match.bestType.name}</p>
          <p className="text-sm text-muted">{match.bestType.tagline}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/[0.04] p-3">
          <p className="text-xs text-muted">찰떡 MBTI</p>
          <p className="mt-1 font-bold">{match.bestMbti.length ? match.bestMbti.join(" · ") : "MBTI 입력 시 공개"}</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] p-3">
          <p className="text-xs text-muted">찰떡 띠</p>
          <p className="mt-1 font-bold">{match.goodAnimals.length ? match.goodAnimals.map((a) => `${a}띠`).join(" · ") : "-"}</p>
        </div>
      </div>
      {match.myMbti && match.myMbtiLine && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <b className="text-ink">{match.myMbti}</b>의 연애: {match.myMbtiLine}
        </p>
      )}
    </Card>
  );
}

export function MbtiPairLine({ pair }: { pair: MbtiPair }) {
  return (
    <div className="mt-3 rounded-2xl border border-violet/30 bg-violet/10 p-4 text-left">
      <p className="text-xs font-semibold text-violet">🧬 MBTI 궁합</p>
      <p className="mt-1 font-bold">
        {pair.pair} = {pair.level}
        {pair.level === "천생연분" ? " 💯" : ""}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{pair.line}</p>
    </div>
  );
}

// Blurred filler only — the real paid text never reaches the browser before unlock; the visible
// tease is the real opening line, truncated on the server.
const DUMMY = "그런데 진짜 이유는 따로 있어요. 이건 지금까지 아무도 말해 주지 않았던 부분인데, 사실은";

export function LockedCard({ preview, onClick, compact = false }: { preview: LockedPreview; onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="relative block w-full overflow-hidden rounded-3xl border border-pink/25 bg-surface p-5 text-left transition active:scale-[0.99]"
    >
      <div className="flex items-start gap-2">
        <span className="text-xl">{preview.icon}</span>
        <h3 className="text-[15px] font-bold leading-snug">{preview.title}</h3>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed">
        <span className="text-ink/90">{preview.tease}</span>{" "}
        <span className="locked-text text-muted" aria-hidden>
          {DUMMY}
        </span>
      </p>
      {!compact && (
        <p className="locked-text mt-1 text-sm leading-relaxed text-muted" aria-hidden>
          {DUMMY}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted">🔒 {preview.count}개의 분석이 가려져 있어요</span>
        <span className="rounded-full bg-pink/20 px-3 py-1 text-xs font-bold text-pink">열어 보기 →</span>
      </div>
    </button>
  );
}
