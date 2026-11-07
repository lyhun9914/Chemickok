/**
 * 테스트용 사이트: the `dev` branch's preview deployment (or a local build with NYANG_STAGE=test). It has its own
 * database, fake payments and a test login, and installs as its own app ("냥신 테스트") beside the real one.
 * Server-side only: read where the page is built (layout, manifest, robots).
 */
export const IS_TEST = process.env.VERCEL_ENV === "preview" || process.env.NYANG_STAGE === "test";
