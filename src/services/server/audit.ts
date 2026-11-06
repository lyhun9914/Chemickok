import "server-only";
import { getDb } from "./db";

/** 관리 작업 기록: what the 관리자 did (환불, 냥 지급, 가격·세일·공지·쿠폰). Never blocks the action itself. */
export async function audit(action: string, target: string | null, detail: string | null): Promise<void> {
  try {
    await getDb()?.audit(action, target?.slice(0, 200) ?? null, detail?.slice(0, 1000) ?? null);
  } catch (e) {
    console.error("audit failed", e);
  }
}
