/** "11.12" */
export const md = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
};
/** whole days until `iso` (0 on the last day) */
export const daysLeft = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 864e5));
/** "11.12 만듦 · 29일 남음" */
export const lifeLine = (created: string | undefined, expires: string) =>
  `${created ? `${md(created)} 만듦 · ` : ""}${daysLeft(expires) ? `${daysLeft(expires)}일 남음` : "오늘 사라짐"}`;
/** the account's rows first, then this browser's (no repeats), newest first */
export function mergeRows<T extends { id: string; createdAt?: string }>(acct: T[], local: T[]): T[] {
  const all = new Map<string, T>();
  for (const r of [...acct, ...local]) if (!all.has(r.id)) all.set(r.id, r);
  return [...all.values()].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}
