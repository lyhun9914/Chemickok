import type { QuestionnaireInput } from "@/models/types";
import { isFortune } from "./config";
import { FORTUNE_INTERVIEW } from "./fortuneQuestions";
import { CUSTOM_MAX, UNKNOWN_ANSWER, customText, isCustom, partnerInterview, selfInterview, type InterviewQuestion } from "./interview";

/**
 * Whether `a` still answers `q` the way the server takes it: one of its options, "잘 모르겠어", or (love
 * questions) a typed answer. An answer kept from before the questions changed (an old tab, or one saved in this
 * browser session) can point at an option that no longer exists.
 */
export function answers(q: InterviewQuestion, a: string | undefined, typed = true): boolean {
  if (a === UNKNOWN_ANSWER) return true;
  if (isCustom(a)) {
    const t = customText(a).trim();
    return typed && t.length > 0 && t.length <= CUSTOM_MAX;
  }
  return q.options.some((o) => o.id === a);
}

/** The questions of this interview that still need an answer. */
export function unanswered(i: QuestionnaireInput): InterviewQuestion[] {
  if (isFortune(i.mode)) return FORTUNE_INTERVIEW[i.mode].filter((q) => !answers(q, i.self?.[q.id], false));
  const self = selfInterview(i.mode, i.status).filter((q) => !answers(q, i.self?.[q.id]));
  const partner = i.mode === "couple" ? partnerInterview(i.status).filter((q) => !answers(q, i.partnerObs?.[q.id])) : [];
  return [...self, ...partner];
}
