# 💘 연애 케미 & 속마음 리포트 (Love Chemistry & Mind Report)

Mobile-first viral web app with solo & couple modes: 사주 원국 + MBTI + love-style test → free reading → 990원 paywall → full report → share card.

**No AI, no database.** Results come from a deterministic rule engine (same answers → same result), so serving costs stay near zero no matter how viral it gets.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Zustand · Toss Payments v2 (hook) · Kakao JS SDK (hook) · html-to-image · deployed on Vercel

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```
Works with zero configuration (test-mode payment unlocks instantly). See `.env.example` for Toss/Kakao keys.

## User flow
1. Landing → **무료로 내 연애 유형 테스트하기**
2. Choose a mode: **🙋 나 혼자 보기 (솔로)** or **💞 그 사람과 궁합 보기** (연애 중·썸·짝사랑·권태기·이별 후)
3. **Solo** (15 steps): 내 정보 (+ MBTI, optional) → PART 1 성향 12문항
   - Free: my type (16 types), 4 axes, 사주 원국 & 띠, 일간 해석, answer quote-back, scenes, **찰떡 궁합** (best type · MBTI · 띠), **이번 달 연애운 %**
   - Paid: 나와 맞는 사람 vs 피해야 할 사람 (share-to-unlock), 연애 패턴 & 실수, 이번 달 연애운 & 인연 길일
4. **Couple** (27 steps): 내 정보 → 상대 정보 (+ both MBTIs) → 관계 상태 → PART 1 (12) → PART 2 그 사람 관찰 (8)
   - Free: everything above + couple score/title/summary, partner type, **MBTI 궁합** (e.g. INFP × ENFJ = 천생연분)
   - Paid: 종합 궁합, 속마음 (share-to-unlock), 스킨십/멘탈 케미, 위기 & 이별 예방책, 개운 & 길일
5. Pay 990원 (test mode by default) or share to unlock one section; the share card adapts to the mode.

## How the "소름 돋게 맞는" effect is built
| Technique | Where |
|---|---|
| Real saju math: 년·월·일·시주 (입춘/절입일 기준, 자시 23:30), 오행 분포, 일간 해석, 띠 | `src/engine/saju.ts`, `content/free.ts` |
| Compatibility rules: 천간합, 상생/상극, 일지 육합·충, 띠 삼합·육합·충 | `saju.ts`, `analyze.ts` |
| Lucky dates and this month's flow (월운 vs 일지) computed for the current month | `saju.ts#luckyDays`, `#monthRelation` |
| 4 axes × 3 items with reverse-keyed questions; wording changes with intensity | `profile.ts`, `content/free.ts#TRAITS` |
| Quote-back of the most decisive answer + specific everyday scenes | `QUOTE_READING`, `SCENES` |
| Best / worst match type derived from my axes; popular MBTI 궁합표 | `analyze.ts#bestTypeCode`, `mbti.ts` |
| Advice tailored to the chosen 고민 | `content/solo.ts`, `content/paid.ts` |

To tune copy, edit `src/engine/content/free.ts` (free reading), `content/solo.ts` (solo report), `content/paid.ts` (couple report) and `src/engine/mbti.ts`.

## Architecture

```
src/
├─ app/
│  ├─ page.tsx                     # landing → form → loading → result
│  ├─ api/analyze/route.ts         # POST: free teaser + inputHash
│  ├─ api/payment/confirm/route.ts # POST: test / toss / share → rebuilds the report from the answers
│  └─ payment/{success,fail}/      # Toss redirect targets
├─ engine/ (server-only)
│  ├─ saju.ts  profile.ts  mbti.ts  analyze.ts
│  └─ content/free.ts  content/solo.ts  content/paid.ts
├─ components/                     # Questionnaire, ResultView, ReportCards, PaymentModal, ShareUnlockPanel, Footer, ...
├─ services/                       # PaymentService (isTestMode, Toss hook), shareService, apiClient
├─ store/useAppStore.ts            # Zustand, persisted to sessionStorage (survives the PG redirect)
└─ lib/                            # questions, config (business info), josa (Korean particles)
```

**Paywall without a database:** paid copy lives only on the server (`engine/` is `server-only`). The free API returns the teaser plus `inputHash`; the Toss `orderId` starts with that hash. On confirm, the server re-validates the answers, checks the hash prefix, confirms with Toss (which refuses a second confirm of the same payment), and rebuilds the report. Payment records live in the Toss dashboard.

## Going live
1. Set `NEXT_PUBLIC_PAYMENT_TEST_MODE=false` **and** `PAYMENT_TEST_MODE=false`, plus `NEXT_PUBLIC_TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY`. Register `/payment/success` and `/payment/fail` in the Toss console and verify the v2 parameters in `PaymentService.requestTossPayment` against current Toss docs.
2. Set `NEXT_PUBLIC_KAKAO_JS_KEY` (register the domain in Kakao Developers) and `NEXT_PUBLIC_SITE_URL`.
3. Vercel's Hobby plan is non-commercial; move to Pro (or another host) before charging.
4. "Share to unlock" is honor-based (one section only).
5. Have the 이용약관 / 개인정보처리방침 (`components/LegalModal.tsx`) reviewed. Business info lives in `src/lib/config.ts`.

## Scripts
`npm run dev` · `npm run build` · `npm start`
