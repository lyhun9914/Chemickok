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

export type ShareOutcome = "shared" | "copied" | "downloaded" | "cancelled";

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

  async shareKakao(opts: { title: string; description: string; url: string }): Promise<ShareOutcome> {
    if (KAKAO_JS_KEY) {
      await loadScript(KAKAO_SDK_URL);
      const Kakao = window.Kakao;
      if (Kakao) {
        if (!Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY);
        Kakao.Share.sendDefault({
          objectType: "feed",
          content: {
            title: opts.title,
            description: opts.description,
            imageUrl: `${window.location.origin}/og.png`,
            link: { mobileWebUrl: opts.url, webUrl: opts.url },
          },
          buttons: [{ title: "나도 테스트하기", link: { mobileWebUrl: opts.url, webUrl: opts.url } }],
        });
        return "shared";
      }
    }
    // No Kakao key configured: fall back to the OS share sheet (Kakao appears there on mobile).
    return this.shareLink(opts);
  },

  async shareLink(opts: { title: string; description: string; url: string }): Promise<ShareOutcome> {
    if (navigator.share) {
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
  async shareImage(blob: Blob, fileName = "love-chemistry-card.png"): Promise<ShareOutcome> {
    const file = new File([blob], fileName, { type: "image/png" });
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
