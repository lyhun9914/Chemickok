import { NextResponse, type NextRequest } from "next/server";
import { adminOnly } from "@/services/server/admin";
import { getDb } from "@/services/server/db";
import { mailConfigured } from "@/services/server/mailer";

/** GET /api/admin/errors?hours=24 — 오류 기록, one row per kind; also says whether new kinds are mailed. */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const hours = Math.min(24 * 30, Math.max(1, Math.trunc(Number(req.nextUrl.searchParams.get("hours")) || 24)));
  const since = new Date(Date.now() - hours * 3600e3).toISOString();
  return NextResponse.json({ errors: await db.adminErrors(since), mail: Boolean(process.env.ADMIN_EMAIL) && mailConfigured() });
}

/** DELETE /api/admin/errors?fp=… — clears one kind (checked and fixed). */
export async function DELETE(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  const fp = req.nextUrl.searchParams.get("fp");
  if (!db || !fp) return NextResponse.json({ error: "지울 오류가 없어요." }, { status: 400 });
  await db.adminClearErrors(fp);
  return NextResponse.json({ ok: true });
}
