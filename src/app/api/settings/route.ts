import { NextResponse } from "next/server";
import { saleLive } from "@/lib/pricing";
import { getSettings } from "@/services/server/settings";

/** GET /api/settings — the live 가격 · 세일 (while it runs) · 공지 (when on), for the app to show. */
export async function GET() {
  const s = await getSettings();
  return NextResponse.json(
    { pricing: s.pricing, sale: saleLive(s.sale) ? s.sale : null, banner: s.banner.on ? s.banner : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
