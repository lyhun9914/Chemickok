import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt (memory-hard) with a per-password salt, stored as scrypt$N$r$p$salt$hash.
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

const derive = (password: string, salt: Buffer, n = N, r = R, p = P) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (e, key) => (e ? reject(e) : resolve(key))),
  );

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${(await derive(password, salt)).toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = (stored ?? "").split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const got = await derive(password, Buffer.from(salt, "base64url"), Number(n), Number(r), Number(p));
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** 8–64 characters with at least one letter and one digit. */
export const passwordOk = (pw: unknown): pw is string => typeof pw === "string" && pw.length >= 8 && pw.length <= 64 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
