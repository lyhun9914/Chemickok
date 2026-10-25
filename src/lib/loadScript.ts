const pending = new Map<string, Promise<void>>();

/** Injects a third-party <script> once and resolves when it has loaded. */
export function loadScript(src: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  const existing = pending.get(src);
  if (existing) return existing;
  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      pending.delete(src);
      reject(new Error(`스크립트 로드 실패: ${src}`));
    };
    document.head.appendChild(el);
  });
  pending.set(src, p);
  return p;
}
