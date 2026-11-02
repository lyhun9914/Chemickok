"use client";

import { useEffect, useState } from "react";
import { josa } from "@/lib/josa";
import type { PairResult, QuestionnaireInput } from "@/models/types";
import { type PairView, pairApi } from "@/services/apiClient";
import { siteUrl } from "@/services/shareService";
import { useAppStore } from "@/store/useAppStore";
import { enterThroughDoors } from "./Backdrop";
import { BottomSheet, ShareLinkButtons } from "./BottomSheet";
import { Say } from "./Nyang";

/** 맞궁합 초대장 links I sent, so opening one later shows "아직 답이 없다냥" instead of the invitation. */
const SENT_KEY = "nyang-pairs-sent";
const sentIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]");
  } catch {
    return [];
  }
};
const remember = (id: string) => {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify([id, ...sentIds()].slice(0, 30)));
  } catch {
    /* storage unavailable */
  }
};
export const pairLink = (id: string) => `${siteUrl()}?pair=${id}`;

function Bar({ label, value, tone = "from-pink to-peach" }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <div className="flex justify-between text-[12.5px]">
        <span className="text-muted">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/** The 맞궁합 itself: score, both types, who knows whom better, surprises, where they differ. */
export function PairResultView({ r }: { r: PairResult }) {
  const { a, b } = r.names;
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-pink/40 bg-gradient-to-b from-[#2a1210] to-surface p-5 text-center">
        <p className="text-[12px] tracking-[0.3em] text-violet">둘이 직접 답한 맞궁합</p>
        <p className="mt-2 text-[15px] font-bold">
          {a} 💞 {b}
        </p>
        <p className="mt-1 text-[44px] font-extrabold leading-none text-peach">{r.score}</p>
        <p className="mt-2 text-[15px] font-bold">{r.title}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
          {(
            [
              [a, r.types.a],
              [b, r.types.b],
            ] as const
          ).map(([n, t]) => (
            <div key={n} className="rounded-2xl bg-black/25 p-3">
              <p className="text-[11.5px] text-muted">{n}</p>
              <p className="mt-1 text-2xl">{t.emoji}</p>
              <p className="mt-1 font-bold leading-snug">{t.name}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-line bg-surface p-4">
        {r.sub.map((s) => (
          <Bar key={s.label} label={s.label} value={s.score} />
        ))}
      </div>

      <div className="space-y-2.5 rounded-2xl border border-violet/35 bg-surface p-4">
        <p className="text-[14.5px] font-bold">🔍 서로 얼마나 알고 있을까</p>
        <Bar label={`${josa(a, "이/가")} 아는 ${b}`} value={r.know.aKnowsB} tone="from-violet to-peach" />
        <Bar label={`${josa(b, "이/가")} 아는 ${a}`} value={r.know.bKnowsA} tone="from-violet to-peach" />
        <p className="text-[13px] text-peach">{r.know.line}</p>
      </div>

      {r.surprises.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-2 text-[14.5px] font-bold">😳 몰랐던 반전</p>
          <ul className="space-y-2 text-[13.5px] leading-relaxed">
            {r.surprises.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="mb-2 text-[14.5px] font-bold">🧭 다른 점과 맞추는 법</p>
        <ul className="space-y-2 text-[13.5px] leading-relaxed text-muted">
          {r.gaps.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** On a couple result: send the other person a 신청서 so the 맞궁합 is drawn from both people's own answers. */
export function PairInviteCard({ input }: { input: QuestionnaireInput }) {
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = input.me.name;
  const p = input.partner.name || "그 사람";
  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await pairApi.create(input);
      remember(r.id);
      setId(r.id);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="mt-8 rounded-3xl border border-pink/40 bg-gradient-to-b from-[#2a1210] to-surface p-5">
      <p className="text-[16px] font-bold">💌 {p}한테 궁합 신청서 보내기</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        지금 궁합은 네가 본 {p}로 낸 거다냥. {josa(p, "이/가")} 직접 답하면 <b className="text-ink">둘이 낸 답으로 맞궁합</b>이 나오고, 누가 누구를 더 잘 아는지까지 나온다냥. (무료)
      </p>
      {id ? (
        <div className="mt-4 space-y-2">
          <ShareLinkButtons
            label="카카오톡으로 신청서 보내기"
            title={`💌 ${me}님이 보낸 궁합 신청서`}
            description={`${me}님이 너랑 궁합을 보고 싶어 한다냥. 네가 직접 답하면 둘의 맞궁합이 나온다냥 (3분 · 무료)`}
            url={pairLink(id)}
          />
          <p className="text-center text-[12px] text-muted">{josa(p, "이/가")} 답하면 이 링크에서 결과가 열린다냥. 링크는 30일 동안 살아 있다냥.</p>
        </div>
      ) : (
        <>
          <button onClick={create} disabled={busy} className="btn-primary mt-4 w-full py-3.5 text-[15px]">
            {busy ? "신청서 쓰는 중…" : "💌 신청서 만들기"}
          </button>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted/80">
            신청서를 만들면 내 이름·생년월일과 면담 답이 30일 동안 보관돼요. 상대가 답해야 맞궁합이 나오기 때문이에요.
          </p>
        </>
      )}
      {error && <p className="mt-2 text-sm text-pink">{error}</p>}
    </div>
  );
}

/** On the reading of someone who answered a 신청서: the 맞궁합, and sending it back. */
export function PairAnsweredCard({ view, id }: { view: PairView; id: string }) {
  const [open, setOpen] = useState(false);
  if (!view.result) return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fade-up mb-5 flex w-full items-center gap-3 rounded-2xl border border-pink/50 bg-pink/10 p-4 text-left active:scale-[0.98]"
      >
        <span className="text-3xl">💞</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">
            {view.from}님 신청서에 답했다냥 · 맞궁합 {view.result.score}점
          </span>
          <span className="mt-0.5 block text-xs text-muted">둘이 직접 낸 답으로 본 결과 · 누가 누구를 더 잘 알까</span>
        </span>
        <span aria-hidden>→</span>
      </button>
      <BottomSheet open={open} title="💞 맞궁합" onClose={() => setOpen(false)}>
        <PairResultView r={view.result} />
        <div className="mt-5">
          <ShareLinkButtons
            label={`${view.from}님한테 결과 보내기`}
            title={`💞 ${view.result.names.a} × ${view.result.names.b} 맞궁합 ${view.result.score}점`}
            description={view.result.know.line}
            url={pairLink(id)}
          />
        </div>
      </BottomSheet>
    </>
  );
}

/** Opened from a 신청서 link: the invitation, "still waiting" for the sender, or the 맞궁합. */
export function PairSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const me = useAppStore((s) => s.me);
  const startInterview = useAppStore((s) => s.startInterview);
  const [view, setView] = useState<PairView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  useEffect(() => {
    if (!id) return;
    setView(null);
    setError(null);
    setMine(sentIds().includes(id));
    pairApi
      .get(id)
      .then(setView)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const answer = () => {
    if (!id || !view) return;
    onClose();
    enterThroughDoors(() =>
      startInterview({
        mode: "couple",
        me: me?.profile,
        partner: { name: view.from, gender: view.fromGender },
        status: view.status,
        pair: { id, from: view.from },
      }),
    );
  };

  return (
    <BottomSheet open={id !== null} title="💌 궁합 신청서" onClose={onClose}>
      {error ? (
        <Say mood="wow">{error} 보낸 사람한테 새로 보내 달라고 해라냥.</Say>
      ) : !view ? (
        <p className="py-8 text-center text-sm text-muted">신청서를 펼치는 중…</p>
      ) : view.result ? (
        <>
          <PairResultView r={view.result} />
          <div className="mt-5">
            <ShareLinkButtons
              label="결과 카톡으로 보내기"
              title={`💞 ${view.result.names.a} × ${view.result.names.b} 맞궁합 ${view.result.score}점`}
              description={view.result.know.line}
              url={pairLink(id!)}
            />
          </div>
        </>
      ) : mine ? (
        <div className="space-y-4">
          <Say mood="smug">아직 {josa(view.to, "이/가")} 답하지 않았다냥. 한 번 더 찔러 봐라냥 😼</Say>
          <ShareLinkButtons
            label="신청서 다시 보내기"
            title={`💌 ${view.from}님이 보낸 궁합 신청서`}
            description={`${view.from}님이 너랑 궁합을 보고 싶어 한다냥. 네가 직접 답하면 둘의 맞궁합이 나온다냥 (3분 · 무료)`}
            url={pairLink(id!)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <Say mood="smug">
            {view.from}님이 너랑 궁합을 보고 싶어 한다냥. {view.from}님은 이미 답했다냥. 네가 직접 답하면 <b>둘이 낸 답으로 맞궁합</b>을 보고, 누가 누구를 더 잘 아는지도 알려 주겠다냥.
          </Say>
          <ul className="space-y-1.5 rounded-2xl border border-line p-4 text-[13.5px]">
            <li>💞 둘이 낸 답으로 본 맞궁합 점수</li>
            <li>🔍 {view.from}님이 아는 너 vs 진짜 너</li>
            <li>😳 서로 몰랐던 반전</li>
          </ul>
          <button onClick={answer} className="btn-primary w-full py-4 text-[16px]">
            답하러 가기 (3분 · 무료) →
          </button>
          <p className="text-center text-[11.5px] text-muted/80">네 답과 생년월일은 맞궁합을 위해 30일 동안 보관된다냥.</p>
        </div>
      )}
    </BottomSheet>
  );
}
