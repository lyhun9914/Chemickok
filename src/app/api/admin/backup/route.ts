import { NextResponse, after, type NextRequest } from "next/server";
import { kstDay } from "@/lib/kst";
import { adminOnly } from "@/services/server/admin";
import { audit } from "@/services/server/audit";
import { getDb } from "@/services/server/db";

/**
 * GET /api/admin/backup — 전체 백업: members, 냥, payments, readings, gifts … as one JSON file. The free database plan
 * keeps no backups of its own, so the 관리자 downloads this now and then. It holds personal data: 관리자 only, never cached.
 */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const tables = await db.backupTables();
  const counts = Object.fromEntries(Object.entries(tables).map(([t, rows]) => [t, rows.length]));
  after(() => audit("백업 내려받기", null, Object.entries(counts).map(([t, n]) => `${t} ${n}`).join(", ")));
  const body = JSON.stringify({ app: "냥신 점괘", made_at: new Date().toISOString(), counts, tables });
  return new NextResponse(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="nyangsin-backup-${kstDay()}.json"`,
      "cache-control": "no-store",
    },
  });
}
