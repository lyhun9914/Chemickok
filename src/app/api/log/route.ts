import { after, type NextRequest } from "next/server";
import { reportError } from "@/services/server/errors";

/**
 * POST /api/log — an error seen in the browser: { source: "client" | "api", message, path, detail }. Sent with
 * sendBeacon (plain text), stored after the response so the page never waits on it.
 */
export async function POST(req: NextRequest) {
  const body = (await req.text().catch(() => "")).slice(0, 6000);
  let e: { source?: unknown; message?: unknown; path?: unknown; detail?: unknown } | null = null;
  try {
    e = JSON.parse(body);
  } catch {
    /* not JSON */
  }
  const message = typeof e?.message === "string" ? e.message.trim() : "";
  if (!e || !message) return new Response(null, { status: 204 });
  const ua = req.headers.get("user-agent") ?? "";
  if (/bot|crawler|spider/i.test(ua)) return new Response(null, { status: 204 });
  after(() =>
    reportError({
      source: e.source === "api" ? "api" : "client",
      message: message.slice(0, 500),
      path: typeof e.path === "string" ? e.path.slice(0, 300) : null,
      detail: typeof e.detail === "string" ? e.detail.slice(0, 2000) : null,
      ua: ua.slice(0, 300),
    }),
  );
  return new Response(null, { status: 204 });
}
