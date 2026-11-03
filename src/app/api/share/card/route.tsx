import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { readCard, type StoryShare } from "@/lib/handoff";
import { isFortuneCard } from "@/models/types";

/**
 * GET /api/share/card?c=… — the picture on a KakaoTalk 점괘 card: the sender's own result (연애 유형 · 궁합 ·
 * 사주·운세 headline), drawn from the same packed card the link opens. 800×800, cached for good (the URL is the card).
 */

const SIZE = 800;
const GOLD = "#e9c779";
const HANJI = "#efe2c2";
const MUTED = "#b9a888";

/** A Google font cut down to just these characters, as TTF (the only kind the image renderer reads besides OTF/WOFF). */
async function font(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Emoji are drawn as images; the text fonts only need the rest. */
const plain = (s: string) => s.replace(/\p{Extended_Pictographic}|️|‍/gu, "");
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Splits at the space nearest the middle, so a long name breaks between words (the renderer would cut mid-word). */
function balance(s: string, max: number): string[] {
  if (s.length <= max) return [s];
  const mid = s.length / 2;
  let at = -1;
  for (let k = 0; k < s.length; k++) if (s[k] === " " && (at < 0 || Math.abs(k - mid) < Math.abs(at - mid))) at = k;
  return at < 0 ? [s] : [s.slice(0, at), s.slice(at + 1)];
}

function lines(share: StoryShare): { top: string; emoji: string; title: string; sub: string; chip: string; note: string } {
  const { card, me, partner } = share;
  if (isFortuneCard(card)) {
    const slip = [card.slipLabel, card.slipValue].filter(Boolean).join(" · ");
    return { top: card.label, emoji: card.emoji, title: card.headline, sub: card.sub, chip: slip || card.slipText, note: slip ? card.slipText : "" };
  }
  return {
    top: card.couple && partner ? `${me} × ${partner} · 연애 궁합` : `${me}의 연애 팔자`,
    emoji: card.myType.emoji,
    title: card.myType.name,
    sub: card.myType.tagline,
    chip: card.couple ? `우리 궁합 ${card.couple.matchScore}점` : `찰떡 상대 · ${card.match.bestType.emoji} ${card.match.bestType.name}`,
    note: card.couple ? card.couple.coupleTitle : "",
  };
}

export async function GET(req: NextRequest) {
  const share = readCard(req.nextUrl.searchParams.get("c") ?? "");
  if (!share) return new Response("not a card", { status: 400 });
  const l = lines(share);
  const cta = "눌러서 나도 점괘 보기";
  const brand = "냥신 점괘";
  const [ritual, sans] = await Promise.all([
    font("Song+Myung", plain(brand + l.title)),
    font("Noto+Sans+KR:wght@700", plain(`${l.top}${l.sub}${l.chip}${l.note}${cta}→×·…0123456789점`)),
  ]);
  const fonts = [
    ritual && { name: "Ritual", data: ritual, weight: 400 as const, style: "normal" as const },
    sans && { name: "Sans", data: sans, weight: 700 as const, style: "normal" as const },
  ].filter((f) => !!f);
  const titleLines = balance(cut(l.title, 22), 10);
  const titleSize = titleLines.some((x) => x.length > 10) ? 54 : titleLines.length > 1 ? 66 : 76;
  // Emoji come from a CDN as the image renders; if that fails, the card is drawn without them rather than not at all.
  const t = (s: string, emoji: boolean) => (emoji ? s : plain(s).replace(/\s{2,}/g, " ").trim());

  const card = (emoji: boolean) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 40,
        background: "radial-gradient(circle at 50% 30%, #4a1d14 0%, #1d0f0a 60%, #120906 100%)",
        fontFamily: "Sans",
        color: HANJI,
      }}
    >
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          border: `3px solid ${GOLD}`,
          borderRadius: 36,
          padding: "40px 44px 36px",
          background: "rgba(20, 10, 6, 0.55)",
        }}
      >
        <div style={{ display: "flex", fontFamily: "Ritual", fontSize: 34, color: GOLD }}>{t(`🐾 ${brand}`, emoji)}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", fontSize: 30, color: MUTED, textAlign: "center" }}>{cut(t(l.top, emoji), 24)}</div>
          {emoji && <div style={{ display: "flex", fontSize: 128, marginTop: 14, lineHeight: 1 }}>{l.emoji}</div>}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Ritual", fontSize: titleSize, marginTop: 18, color: HANJI, lineHeight: 1.15 }}>
            {titleLines.map((x) => (
              <div key={x} style={{ display: "flex" }}>
                {t(x, emoji)}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 28, marginTop: 16, color: MUTED, lineHeight: 1.4 }}>
            {balance(cut(t(l.sub, emoji), 44), 22).map((x) => (
              <div key={x} style={{ display: "flex" }}>
                {x}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 26,
              padding: "12px 28px",
              borderRadius: 999,
              background: "#8e2219",
              color: "#f6e3b8",
              fontSize: 30,
              textAlign: "center",
              maxWidth: 660,
            }}
          >
            {cut(t(l.chip, emoji), 26)}
          </div>
          {l.note && <div style={{ display: "flex", fontSize: 26, marginTop: 14, color: HANJI, textAlign: "center" }}>{cut(t(l.note, emoji), 30)}</div>}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: GOLD }}>{cta} →</div>
      </div>
    </div>
  );

  for (const emoji of [true, false]) {
    try {
      const png = await new ImageResponse(card(emoji), { width: SIZE, height: SIZE, fonts }).arrayBuffer();
      // the URL is the card, so a whole one keeps; one drawn without emoji is retried soon
      const age = emoji && fonts.length === 2 ? "31536000, immutable" : "600";
      return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": `public, max-age=${age}` } });
    } catch {
      /* next: without emoji */
    }
  }
  return new Response("could not draw the card", { status: 500 });
}
