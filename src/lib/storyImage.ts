import { isFortuneCard, type ShareableCard, type StoryCard } from "@/models/types";

/**
 * The Instagram / Threads story image (1080×1920), drawn straight onto a canvas: one big result line, the 냥신 himself
 * large in the middle, a hanji slip with the detail, and a "너도 해보라냥" call to action with the site address.
 * Everything sits between y 250 and 1670: the story app's own bars cover the top and bottom 250px.
 * Drawing takes a few milliseconds, unlike screenshotting the DOM, which froze phones for seconds.
 */
const W = 1080;
const H = 1920;
/** story apps draw their bars over the top and bottom 250px */
export const STORY_SAFE = 250;
const RITUAL = "'Song Myung', 'Nanum Myeongjo', serif";
const SANS = "'Pretendard Variable', Pretendard, system-ui, sans-serif";
const EMOJI = `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
const GOLD = "#e0b866";
const CREAM = "#f7e6bd";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Words into lines no wider than `maxW` (a single long word still gets its own line). */
function linesOf(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** The biggest font (from `max` down to `min`) at which `text` fits `maxLines` lines of `maxW`. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, max: number, min: number, maxW: number, maxLines: number) {
  for (let px = max; ; px -= 4) {
    ctx.font = font(px);
    const lines = linesOf(ctx, text, maxW);
    const wide = lines.some((l) => ctx.measureText(l).width > maxW);
    const ok = lines.length <= maxLines && !wide;
    if (ok || px <= min) return { px, lines: lines.slice(0, maxLines), ok };
  }
}

/** The 냥신 SVG as an image, at twice the size it's drawn so it stays sharp. */
async function catImage(svg: SVGSVGElement | null, px: number): Promise<HTMLImageElement | null> {
  const el = svg ?? document.querySelector<SVGSVGElement>('svg[aria-label="냥신"]');
  if (!el) return null;
  let xml = new XMLSerializer().serializeToString(el).replace(/width="\d+"/, `width="${px * 2}"`).replace(/height="\d+"/, `height="${px * 2}"`);
  if (!xml.includes("xmlns=")) xml = xml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

/** What goes on the card, for a love reading (궁합 or 연애 유형) or a 사주·운세 one. */
function contentOf(card: ShareableCard, me: string, partner: string) {
  if (isFortuneCard(card))
    return { eyebrow: card.label, hook: card.headline, sub: card.sub, emoji: card.emoji, slip: { label: card.slipLabel, value: card.slipValue, text: card.slipText } };
  const t = card as StoryCard;
  if (t.couple)
    return {
      eyebrow: `${me} · ${partner} 궁합`,
      hook: `궁합 ${t.couple.matchScore}점`,
      sub: t.couple.coupleTitle,
      emoji: t.myType.emoji,
      slip: { label: `${me}의 연애 유형`, value: undefined, text: `${t.myType.emoji} ${t.myType.name}` },
    };
  return {
    eyebrow: `${me}의 연애 유형은`,
    hook: t.myType.name,
    sub: `“${t.myType.tagline}”`,
    emoji: t.myType.emoji,
    slip: { label: "냥신이 점지한 인연", value: undefined, text: `${t.match.bestType.emoji} ${t.match.bestType.name}` },
  };
}

export async function drawStoryImage(card: ShareableCard, myName: string, partnerName: string, cat: SVGSVGElement | null = null): Promise<Blob> {
  const c = contentOf(card, myName, partnerName);
  await Promise.all([document.fonts?.load(`80px ${RITUAL}`), document.fonts?.load(`700 40px ${SANS}`)].map((p) => p?.catch(() => null)));
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  const glowAt = (x: number, y: number, r0: number, r1: number, from: string, to: string) => {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };

  // Room: soot black, red haze from the top, candlelight behind the cat, embers, vignette.
  ctx.fillStyle = "#0b0605";
  ctx.fillRect(0, 0, W, H);
  glowAt(W / 2, -120, 60, 1000, "rgba(160,34,26,0.55)", "rgba(160,34,26,0)");
  glowAt(W / 2, 1010, 40, 760, "rgba(255,160,70,0.34)", "rgba(255,150,60,0)");
  glowAt(W / 2, H + 80, 40, 900, "rgba(255,140,50,0.28)", "rgba(255,140,50,0)");
  for (let i = 0; i < 60; i++) {
    const x = (i * 397) % W;
    const y = (i * 911) % H;
    const r = 1.5 + ((i * 7) % 5);
    const eg = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    eg.addColorStop(0, `rgba(255,190,100,${0.12 + ((i * 13) % 35) / 100})`);
    eg.addColorStop(1, "rgba(255,140,60,0)");
    ctx.fillStyle = eg;
    ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  }
  glowAt(W / 2, H / 2, H * 0.32, H * 0.78, "rgba(0,0,0,0)", "rgba(0,0,0,0.7)");

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Eyebrow: who and what, in a thin brass pill.
  ctx.font = `600 38px ${SANS}`;
  const ew = Math.min(W - 160, ctx.measureText(c.eyebrow).width + 96);
  roundRect(ctx, (W - ew) / 2, 262, ew, 72, 36);
  ctx.fillStyle = "rgba(224,184,102,0.10)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(224,184,102,0.55)";
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.fillText(c.eyebrow, W / 2, 312, W - 220);

  // Hook: the result, on one line if it fits big enough (no lone word on a second line), else two.
  const hookFont = (px: number) => `${px}px ${RITUAL}`;
  const one = fit(ctx, c.hook, hookFont, 128, 96, W - 140, 1);
  const hook = one.ok ? one : fit(ctx, c.hook, hookFont, 128, 84, W - 140, 2);
  const lh = Math.round(hook.px * 1.12);
  let y = 384 + hook.px;
  ctx.fillStyle = CREAM;
  ctx.shadowColor = "rgba(240,150,60,0.6)";
  ctx.shadowBlur = 36;
  hook.lines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * lh));
  ctx.shadowBlur = 0;
  y += (hook.lines.length - 1) * lh;

  // Sub line: one line under a two-line hook, so neither reaches the cat.
  const sub = fit(ctx, c.sub, (px) => `500 ${px}px ${SANS}`, 44, 32, W - 200, hook.lines.length > 1 ? 1 : 2);
  ctx.fillStyle = "#d6c3a0";
  const subLh = Math.round(sub.px * 1.3);
  sub.lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 88 + i * subLh, W - 160));
  const textEnd = y + 88 + (sub.lines.length - 1) * subLh + 16;

  // The 냥신, big and centered on a candle-lit disc with a brass ring; the reading's emoji as a seal on the ring.
  // centered in the room left between the text and the slip: bigger when the hook took one line
  // the slip below takes a second line for a long text, and then starts higher
  const slipFont = (px: number) => `700 ${px}px ${SANS}`;
  ctx.font = `68px ${RITUAL}`;
  const valueW = c.slip.value ? ctx.measureText(c.slip.value).width + 32 : 0;
  const slipW = W - 240 - 88 - valueW;
  const slipOne = fit(ctx, c.slip.text, slipFont, 44, 34, slipW, 1);
  const slip = slipOne.ok ? slipOne : fit(ctx, c.slip.text, slipFont, 38, 28, slipW, 2);
  const slipLh = Math.round(slip.px * 1.3);
  const sh = 124 + (slip.lines.length - 1) * slipLh;
  const sy = 1476 - sh;
  const R = Math.min(300, Math.round((sy - textEnd) / 2 - 44));
  const cy = Math.round((textEnd + sy) / 2);
  ctx.beginPath();
  ctx.arc(W / 2, cy, R, 0, Math.PI * 2);
  const disc = ctx.createRadialGradient(W / 2, cy - 60, 30, W / 2, cy, R);
  disc.addColorStop(0, "rgba(255,196,120,0.42)");
  disc.addColorStop(0.65, "rgba(120,40,20,0.35)");
  disc.addColorStop(1, "rgba(40,12,8,0.6)");
  ctx.fillStyle = disc;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(224,184,102,0.85)";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, cy, R + 22, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(224,184,102,0.35)";
  ctx.stroke();
  const size = Math.round(R * 1.84);
  const img = await catImage(cat, size);
  if (img) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    ctx.drawImage(img, W / 2 - size / 2, cy - size / 2 - 10, size, size);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  const bx = W / 2 + R * Math.cos(Math.PI / 4);
  const by = cy + R * Math.sin(Math.PI / 4);
  ctx.beginPath();
  ctx.arc(bx, by, 64, 0, Math.PI * 2);
  ctx.fillStyle = "#a3261b";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 5;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.font = `64px ${EMOJI}`;
  ctx.textBaseline = "middle";
  ctx.fillText(c.emoji, bx, by + 4);
  ctx.textBaseline = "alphabetic";

  // Hanji slip: the detail (찰떡 인연 · 연애 유형 · the reading's own slip).
  const sx = 120;
  const sw = W - 240;
  roundRect(ctx, sx, sy, sw, sh, 20);
  const paper = ctx.createLinearGradient(0, sy, 0, sy + sh);
  paper.addColorStop(0, "#efe2c2");
  paper.addColorStop(1, "#dac79e");
  ctx.fillStyle = paper;
  ctx.fill();
  // centered like the rest, unless a value sits on the right
  const tx = c.slip.value ? sx + 44 : W / 2;
  ctx.textAlign = c.slip.value ? "left" : "center";
  ctx.font = `600 32px ${SANS}`;
  ctx.fillStyle = "#7a5330";
  ctx.fillText(c.slip.label, tx, sy + 46, sw - 88);
  if (c.slip.value) {
    ctx.font = `68px ${RITUAL}`;
    ctx.fillStyle = "#8e1f17";
    ctx.textAlign = "right";
    ctx.fillText(c.slip.value, sx + sw - 44, sy + 94);
  }
  ctx.font = slipFont(slip.px);
  ctx.fillStyle = "#2a1a10";
  ctx.textAlign = c.slip.value ? "left" : "center";
  slip.lines.forEach((l, i) => ctx.fillText(l, tx, sy + 98 + i * slipLh, slipW));
  ctx.textAlign = "center";

  // Call to action and the address, ending above the bottom safe area.
  const bw = 700;
  const bh = 96;
  const btnY = 1502;
  roundRect(ctx, (W - bw) / 2, btnY, bw, bh, bh / 2);
  const btn = ctx.createLinearGradient((W - bw) / 2, 0, (W + bw) / 2, 0);
  btn.addColorStop(0, "#c2361f");
  btn.addColorStop(1, "#e2702f");
  ctx.fillStyle = btn;
  ctx.shadowColor = "rgba(226,112,47,0.55)";
  ctx.shadowBlur = 40;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,220,160,0.7)";
  ctx.stroke();
  ctx.font = `700 50px ${SANS}`;
  ctx.fillStyle = "#fff6e6";
  ctx.fillText("너도 해보라냥  →", W / 2, btnY + bh / 2 + 18);
  ctx.font = `600 38px ${SANS}`;
  ctx.fillStyle = GOLD;
  ctx.fillText(window.location.host, W / 2, H - STORY_SAFE - 8);

  // JPEG keeps it ~10x smaller than PNG, so the share sheet opens fast.
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("이미지 생성에 실패했어요."))), "image/jpeg", 0.92));
}
