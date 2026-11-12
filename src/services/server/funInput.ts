import "server-only";
import { randomBytes } from "node:crypto";
import { kstDay } from "@/lib/kst";
import { computeSaju } from "@/engine/saju";

/** A short name typed by a visitor (케미표 · 퀴즈): trimmed, no control characters, 1–10 characters. */
export function cleanName(v: unknown): string | null {
  const s = String(v ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return s && [...s].length <= 10 ? s : null;
}

/** A 양력 birthday that the 사주 engine reads, from 1920 to today. */
export function cleanBirth(v: unknown): string | null {
  const s = String(v ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || s < "1920-01-01" || s > kstDay()) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null; // 2월 30일 같은 날
  return computeSaju(s) ? s : null;
}

/** Room / quiz ids in links, and the secret a member keeps to take themself out. */
export const newRoomId = () => randomBytes(6).toString("base64url");
export const newKey = () => randomBytes(12).toString("base64url");
export const isId = (v: unknown): v is string => typeof v === "string" && /^[\w-]{6,20}$/.test(v);
