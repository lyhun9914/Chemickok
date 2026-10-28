import { KAKAO_JS_KEY } from "@/lib/config";
import { loadScript } from "@/lib/loadScript";

interface KakaoSDK {
  isInitialized(): boolean;
  init(key: string): void;
  Share: { sendDefault(opts: Record<string, unknown>): void };
}
declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

export type ShareOutcome = "shared" | "copied" | "cancelled" | "unsupported";

/** Phones and tablets (incl. iPadOS, which reports itself as a Mac). PC gets popup / download flows instead of OS share sheets. */
export function isMobile(): boolean {
  const ua = navigator.userAgent;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function siteUrl(): string {
  return window.location.origin + "/";
}

async function copyText(text: string): Promise<ShareOutcome> {
  await navigator.clipboard.writeText(text);
  return "copied";
}

export const shareService = {
  /** Load and init the Kakao SDK ahead of time, so the share popup opens inside the click (popup blockers allow only that). */
  async prepareKakao(): Promise<void> {
    if (!KAKAO_JS_KEY) return;
    await loadScript(KAKAO_SDK_URL);
    if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY);
  },

  /**
   * KakaoTalk share: opens the friend / chat picker (KakaoTalk app on mobile, a Kakao popup on PC).
   * Must be called synchronously from the click; call prepareKakao() on mount.
   */
  shareKakao(opts: { title: string; description: string; url: string }): Promise<ShareOutcome> {
    const Kakao = window.Kakao;
    if (Kakao?.isInitialized()) {
      Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: opts.title,
          description: opts.description,
          imageUrl: `${window.location.origin}/og.png?v=2`,
          link: { mobileWebUrl: opts.url, webUrl: opts.url },
        },
        buttons: [{ title: "점집 들어가기", link: { mobileWebUrl: opts.url, webUrl: opts.url } }],
      });
      return Promise.resolve("shared");
    }
    // SDK not ready (no key or blocked): OS share sheet on phones, link copy on PC.
    return isMobile() ? this.shareLink(opts) : copyText(`${opts.description}\n${opts.url}`);
  },

  async shareLink(opts: { title: string; description: string; url: string }): Promise<ShareOutcome> {
    if (navigator.share && isMobile()) {
      try {
        await navigator.share({ title: opts.title, text: opts.description, url: opts.url });
        return "shared";
      } catch (e) {
        if ((e as Error).name === "AbortError") return "cancelled";
      }
    }
    return copyText(`${opts.description}\n${opts.url}`);
  },

  /**
   * Instagram story: the OS share sheet with the story image (Instagram → 스토리). Must be called right in the tap
   * with the image already drawn, or the phone refuses to open the sheet.
   */
  shareStory(blob: Blob): Promise<ShareOutcome> {
    const file = new File([blob], "nyangsin-story.jpg", { type: blob.type || "image/jpeg" });
    if (!navigator.canShare?.({ files: [file] })) return Promise.resolve("unsupported");
    return navigator.share({ files: [file] }).then(
      () => "shared" as const,
      (e: Error) => (e.name === "AbortError" ? ("cancelled" as const) : ("unsupported" as const)),
    );
  },
};
