import type { Instrumentation } from "next";

/** Server errors (a route that threw, a page that failed to render) go to the 관리자 오류 기록 too. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("./services/server/errors");
  const e = err instanceof Error ? err : new Error(String(err));
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : "";
  const ua = request.headers["user-agent"];
  await reportError({
    source: "server",
    message: e.message || "서버 오류",
    path: `${request.method} ${request.path}`,
    detail: [`${context.routeType} · ${context.routePath}`, digest && `digest ${digest}`, e.stack?.split("\n").slice(0, 8).join("\n")].filter(Boolean).join("\n"),
    ua: Array.isArray(ua) ? ua[0] : (ua ?? null),
  });
};
