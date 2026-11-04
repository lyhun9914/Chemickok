import { NextResponse, type NextRequest } from "next/server";
import { adminOnly } from "@/services/server/admin";
import { getDb } from "@/services/server/db";

/** GET /api/admin/funnel?days=7&product=couple&status=crush — 이용 흐름 since `days - 1` days ago (KST; 1 = today). */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const q = req.nextUrl.searchParams;
  const days = Math.min(90, Math.max(1, Math.trunc(Number(q.get("days")) || 7)));
  const since = new Date(Date.now() + 9 * 3600e3 - (days - 1) * 864e5).toISOString().slice(0, 10);
  const product = q.get("product") || undefined;
  const status = (product === "couple" && q.get("status")) || undefined;
  return NextResponse.json({ since, funnel: await db.adminFunnel(since, product, status) });
}
