import { toBlob } from "html-to-image";
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

export type ShareOutcome = "shared" | "copied" | "downloaded" | "cancelled" | "desktopImage";

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
  /** Renders a DOM node (the type card) to a PNG blob. */
  async captureCard(node: HTMLElement): Promise<Blob> {
    const blob = await toBlob(node, { pixelRatio: 3, cacheBust: true, style: { margin: "0" } });
    if (!blob) throw new Error("이미지 생성에 실패했어요.");
    return blob;
  },

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
          imageUrl: `${window.location.origin}/og.png`,
          link: { mobileWebUrl: opts.url, webUrl: opts.url },
        },
        buttons: [{ title: "나도 점괘 보기", link: { mobileWebUrl: opts.url, webUrl: opts.url } }],
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
   * Instagram has no web share API for stories; the best web flow is the OS share sheet with the
   * image file (mobile → Instagram → Story), else copy the image to clipboard, else download.
   */
  async shareImage(blob: Blob, fileName = "nyangsin-card.png"): Promise<ShareOutcome> {
    const file = new File([blob], fileName, { type: "image/png" });
    // PC: Instagram can't post stories from a browser, so hand over the image file instead of a flaky OS dialog.
    if (!isMobile()) {
      this.download(blob, fileName);
      return "desktopImage";
    }
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return "shared";
      } catch (e) {
        if ((e as Error).name === "AbortError") return "cancelled";
      }
    }
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        this.download(blob, fileName);
        return "copied";
      }
    } catch {
      /* fall through to download */
    }
    this.download(blob, fileName);
    return "downloaded";
  },

  download(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
