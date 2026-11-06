import { NextResponse, type NextRequest } from "next/server";
import { adminOnly } from "@/services/server/admin";
import { getDb } from "@/services/server/db";

/** GET /api/admin/actions — 관리 작업 기록, newest first. */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  return NextResponse.json({ actions: await db.adminActions(200) });
}
