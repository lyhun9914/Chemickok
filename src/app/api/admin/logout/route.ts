import { NextResponse } from "next/server";
import { clearAdmin } from "@/services/server/admin";

/** POST /api/admin/logout */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAdmin(res);
  return res;
}
