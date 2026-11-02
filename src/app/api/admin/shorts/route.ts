import { NextResponse, type NextRequest } from "next/server";
import { shortsData } from "@/engine/shorts";
import { adminOnly } from "@/services/server/admin";

/** GET /api/admin/shorts?day=yyyy-mm-dd — the day's 띠별 운세 and the 16유형, for the 쇼츠 studio. */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const day = req.nextUrl.searchParams.get("day") ?? undefined;
  if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "날짜 형식이 올바르지 않아요." }, { status: 400 });
  return NextResponse.json(shortsData(day));
}
