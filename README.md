# 💘 연애 케미 & 속마음 리포트 (Love Chemistry & Mind Report)

Mobile-first viral MVP: free compatibility teaser → 990원 paywall → AI-generated full report → share card.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Zustand · Supabase (Postgres, Seoul) · Anthropic SDK (Claude, structured JSON output) · Toss Payments v2 (hook) · Kakao JS SDK (hook) · html-to-image

## Quick start

```bash
cd love-chemistry
npm install
cp .env.example .env.local   # then fill SUPABASE_SECRET_KEY (required); ANTHROPIC_API_KEY is optional
npm run dev                  # http://localhost:3000
```

`SUPABASE_SECRET_KEY` is required (Supabase dashboard → Chemickok-Seoul → Project Settings → API Keys → Secret key). Without `ANTHROPIC_API_KEY` a **sample (mock) report** is used instead of Claude, and **test-mode payment** unlocks instantly.

### Manual test flow
1. Landing → **무료로 기본 케미 테스트 시작하기**
2. Fill in 6 steps (me, partner, relationship status, 3 questions; choice steps auto-advance)
3. Loading screen (≥3.5s, rotating messages) → teaser: score, couple title, 2-line summary, bomb types, blurred locked sections
4. **990원으로 전체 리포트 보기** → tick the refund-policy checkbox → pay. In test mode this unlocks immediately (a dashed 🧪 TEST MODE banner shows).
5. Share: **카카오톡**, **인스타그램 스토리** (renders the type card to a PNG, then share sheet / clipboard / download)
6. Referral: **친구에게 990원 테스트 추천하고 무료로 보기** copies `/?ref=<reportId>`. Open it in another browser/incognito window and finish the test there; the original report then shows **무료로 전체 리포트 열기**.

## Architecture

```
src/
├─ app/
│  ├─ page.tsx                    # screen switcher (landing → form → loading → result)
│  ├─ api/report/route.ts         # POST: generateReport() → stores full report, returns teaser only
│  ├─ api/payment/confirm/route.ts# POST: verify test / Toss / referral → returns full report
│  ├─ api/referral/route.ts       # GET: referral count for a report
│  └─ payment/{success,fail}/     # Toss redirect targets
├─ components/                    # Landing, Questionnaire, LoadingScreen, ResultView, PaymentModal,
│                                 # ReportCards, ShareCard, ShareButtons, ReferralPanel, Footer, LegalModal
├─ services/
│  ├─ PaymentService.ts           # isTestMode flag, mock purchase, window.TossPayments hook
│  ├─ shareService.ts             # Kakao share, Web Share, PNG capture
│  ├─ apiClient.ts
│  └─ server/                     # server-only
│     ├─ prompt.ts                # system prompt (counselor persona) + user prompt builder
│     ├─ reportGenerator.ts       # Claude call with structured output, mock fallback
│     ├─ mockReport.ts            # deterministic offline report
│     ├─ reportStore.ts           # Supabase-backed report/referral store (public.love_reports)
│     ├─ supabase.ts              # server-only client (secret key)
│     └─ tossConfirm.ts           # Toss 결제 승인 API
├─ store/useAppStore.ts           # Zustand (persisted to sessionStorage to survive PG redirect)
├─ models/types.ts                # input types + Zod ReportSchema (= the JSON the AI must return)
└─ lib/                           # questions, zodiac flavor, config, script loader
```

**Paywall integrity:** the full report is generated once and kept on the server. The browser only gets the teaser until `/api/payment/confirm` succeeds; the blurred cards show placeholder text, so locked content can't be read from DevTools.

### AI generation
`services/server/reportGenerator.ts` calls `client.beta.messages.parse()` with `ReportSchema` as the output format, so the response is validated JSON that maps straight onto the UI cards. Defaults: `claude-opus-5-5`, effort `low` (keeps wait times short; set `ANTHROPIC_EFFORT=medium` for richer text). The system prompt is cached. Server-side refusal fallback (`fallbacks: "default"`) is enabled. If Claude refuses or the call fails, the user gets the mock report, so the funnel never dead-ends.

The prompt lives in `services/server/prompt.ts`: a witty, slightly sarcastic but empathetic Korean counselor ("케미 박사"), with guardrails against sexual content in the 속궁합 section, no pushing reunions after a breakup, and flagging safety red flags.

## Going live: checklist

1. **Payments**: set `NEXT_PUBLIC_PAYMENT_TEST_MODE=false` **and** `PAYMENT_TEST_MODE=false`, plus `NEXT_PUBLIC_TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY`. Flow: `PaymentService.requestTossPayment()` → Toss checkout → `/payment/success` → server confirm → unlock. Kakao Pay is routed through Toss easy-pay (`easyPay: "KAKAOPAY"`). Register `/payment/success` and `/payment/fail` URLs in the Toss console. Verify the exact v2 parameters against the Toss docs before launch.
2. **Database**: set `SUPABASE_URL` / `SUPABASE_SECRET_KEY` in your hosting env. The privacy policy promises deletion of report data within 30 days, so schedule a cleanup, e.g. pg_cron: `delete from love_reports where created_at < now() - interval '30 days'` (keep payment records you need for 5-year e-commerce retention in a separate table). Referrals are counted per completed test, so add abuse checks (IP/device) before relying on them at scale.
3. **Kakao**: set `NEXT_PUBLIC_KAKAO_JS_KEY` and register your domain in Kakao Developers. Set `NEXT_PUBLIC_SITE_URL` so OG and share images resolve.
4. **Abuse limits**: add rate limiting to `/api/report` (every call costs an LLM request).
5. Review the 이용약관 / 개인정보처리방침 text in `components/LegalModal.tsx` with counsel. It is a reasonable draft, not legal advice.

## Scripts
`npm run dev` · `npm run build` · `npm start`
