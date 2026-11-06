/** KST calendar days (yyyy-mm-dd) and their UTC bounds. */
export const kstDay = (offsetDays = 0, now = Date.now()) => new Date(now + 9 * 3600e3 + offsetDays * 864e5).toISOString().slice(0, 10);
export const kstStart = (day: string) => new Date(`${day}T00:00:00+09:00`).toISOString();
export const kstEnd = (day: string) => new Date(Date.parse(`${day}T00:00:00+09:00`) + 864e5).toISOString();
export const isDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
