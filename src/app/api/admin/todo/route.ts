import { NextResponse, type NextRequest } from "next/server";
import { adminOnly } from "@/services/server/admin";
import { markTodo, readTodo } from "@/services/server/todo";

/** GET /api/admin/todo — when each 관리자 할 일 was last done. */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  return NextResponse.json({ done: await readTodo() }, { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/admin/todo { id, undo? } — 완료 (or take it back). */
export async function POST(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { id?: unknown; undo?: unknown } | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "할 일을 골라 주세요." }, { status: 400 });
  return NextResponse.json({ done: await markTodo(body.id, body.undo === true) });
}
