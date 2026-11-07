import "server-only";
import { ADMIN_TODOS, type TodoDone } from "@/lib/adminTodo";
import { getDb } from "./db";

const KEY = "admin_todo";

/** When each 관리자 할 일 was last done (ISO), by id. */
export async function readTodo(): Promise<TodoDone> {
  const db = getDb();
  if (!db) return {};
  const raw = (await db.getSettings())[KEY];
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([k, v]) => ADMIN_TODOS.some((t) => t.id === k) && typeof v === "string")) as TodoDone;
}

/** Marks one done now (or not done, `undo`). */
export async function markTodo(id: string, undo = false): Promise<TodoDone> {
  const db = getDb();
  if (!db || !ADMIN_TODOS.some((t) => t.id === id)) return readTodo();
  const done = await readTodo();
  if (undo) delete done[id];
  else done[id] = new Date().toISOString();
  await db.setSetting(KEY, done);
  return done;
}
