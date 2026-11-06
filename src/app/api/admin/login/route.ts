import { NextResponse, after, type NextRequest } from "next/server";
import { audit } from "@/services/server/audit";
import { adminConfigured, adminKeyMatches, isAdmin, setAdmin } from "@/services/server/admin";

/** GET /api/admin/login — { configured, admin }: whether ADMIN_KEY is set and this browser is signed in. */
export async function GET(req: NextRequest) {
  return NextResponse.json({ configured: adminConfigured(), admin: isAdmin(req) });
}

/** POST /api/admin/login { key } */
export async function POST(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: "ADMIN_KEY가 설정되지 않았어요." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { key?: string } | null;
  // a wrong key costs a second, so the key can't be guessed quickly
  if (!adminKeyMatches(String(body?.key ?? ""))) {
    after(() => audit("관리자 로그인 실패", req.headers.get("x-forwarded-for")?.split(",")[0] ?? null, req.headers.get("user-agent")));
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ error: "관리자 키가 맞지 않아요." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  setAdmin(res);
  after(() => audit("관리자 로그인", req.headers.get("x-forwarded-for")?.split(",")[0] ?? null, req.headers.get("user-agent")));
  return res;
}
