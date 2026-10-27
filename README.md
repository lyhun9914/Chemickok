# 🐾 냥신 연애 점집 (Love Chemistry & Mind Report)

Mobile-first viral web app hosted by **냥신**, a cat fortune-teller in a 갓 who reads your love life in a sulky "~냥" voice. Solo & couple modes: 사주 원국 + MBTI + love-style test → a chat-style reading revealed one line at a time (tap "그래서? 👉", flip a card) → 복채 990원 paywall → full report → share card. Free 10-second mini games on the landing page: 오늘의 연애운 and 이름 궁합 (획수).

**No AI, no database.** Results come from a deterministic rule engine (same answers → same result), so serving costs stay near zero no matter how viral it gets.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Zustand · Toss Payments v2 (hook) · Kakao JS SDK (hook) · html-to-image · deployed on Vercel

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```
Works with zero configuration (test-mode payment unlocks instantly). See `.env.example` for Toss/Kakao keys.

## User flow
1. Landing → **🕯️ 냥신과 1:1 면담 시작** — the whole questionnaire is a chat with 냥신 (`src/components/Questionnaire.tsx`): typing bubbles, answer chips, a reaction to every answer, incense/crystal-ball rituals.
2. Choose a mode: **🙋 나 혼자 보기 (솔로)** or **💞 그 사람과 궁합 보기** (연애 중·썸·짝사랑·권태기·이별 후)
3. **Interview** — different question sets per mode (`src/lib/interview.ts`):
   - Solo (14): 카페 자리, 자기 전 마지막 화면, 소개팅 사진에서 먼저 보는 곳, 단톡 무반응, 약속 없는 토요일, "누가 너 좋아한대", 전 연인 사진, 어릴 때 혼나던 방식, 떠오르는 색 …
   - Couple (14 about you *in this relationship* + 10 about the partner): 그 사람 카톡 답장 속도, 술자리 밤 12시, 처음 보는 이름의 알림, 기념일, 아직 못 한 말, 그 사람 전 연인 얘기, 미래 … / 그 사람의 카톡 말투, 폰 두는 방식, 취했을 때, SNS …
   Scoring weights and the "왜 물었냐면" decoding are server-only (`src/engine/content/decode.ts`): 4 axes + hidden 미련 · 질투 · 자기 의심.
4. **Solo** — Free: type, axes, 사주·일간·이름 기운, 색 × 사주, 2 decoded answers, hidden gauges, 찰떡 궁합, 이번 달 연애운.
   Paid: 찰떡/피해야 할 사람 (share-to-unlock), 답변 14개 전체 해석, 반복 패턴 + 숨은 지수 해석, 다음 연애 시나리오, 처방전 6장, 길일.
   **Couple** — Free: above + couple score/title, partner type, MBTI 궁합.
   Paid: 속마음 (share-to-unlock), 그 사람이 보내지 못한 편지, 그 사람 행동 8가지 해석, 케미, 위기, 내 답변 전체 해석, 처방전, 길일.
5. Pay 990원 (test mode by default) or share to unlock one section; the share card adapts to the mode.

## 냥신 & mini games
- Mascot: `src/components/Nyang.tsx` (SVG, 4 moods) with `Say` (speech bubble with typing dots) and `FlipCard`.
- Result reading: `src/components/ResultView.tsx` builds a list of beats; each tap reveals the next line + card, ending in the 복채 paywall. Paid sections get a 냥신 intro line.
- 오늘의 연애운: `src/engine/daily.ts` + `POST /api/daily` (today's day stem vs. the user's day master).
- 이름 궁합: `src/lib/nameCompat.ts` (client-side stroke-count pyramid).

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
│  ├─ api/daily/route.ts           # POST: 오늘의 연애운
│  ├─ api/payment/confirm/route.ts # POST: test / toss / share → rebuilds the report from the answers
│  └─ payment/{success,fail}/      # Toss redirect targets
├─ engine/ (server-only)
│  ├─ saju.ts  profile.ts  mbti.ts  analyze.ts  daily.ts
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

## 회원 (로그인 · 내 점괘함)
- Login with Kakao / Naver / Google (`src/services/server/oauth.ts`, routes under `src/app/api/auth/[provider]/`) — plain OAuth 2.0 code flow, signed `httpOnly` session cookie (`AUTH_SECRET`).
- Login is asked **at payment** (free reading needs no account); "로그인 없이 결제" still works. After the redirect the payment sheet reopens.
- Stored in Supabase via the server-only secret key (`src/services/server/db.ts`, schema in `supabase/migrations/0001_accounts.sql`, RLS on with no policies):
  `users` (provider id, nickname, 기본 정보), `readings` (paid teaser + report + display names only), `payments` (5-year record, unlinked on 탈퇴).
- 내 점괘함 (`src/components/MyPage.tsx`): saved readings, edit 기본 정보, logout, 회원 탈퇴. With a saved profile the interview skips name/birth/MBTI.
- No auth env vars → no login buttons, nothing stored (the original stateless flow). `AUTH_DEV_LOGIN=1` locally adds a 🧪 test login with an in-memory DB.
