import { isFortuneCard, type ShareableCard, type StoryCard } from "@/models/types";

/**
 * The Instagram-story image (1080×1920), drawn straight onto a canvas: a lacquered talisman card in a dark,
 * candle-lit frame. Drawing takes a few milliseconds, unlike screenshotting the DOM, which froze phones for
 * seconds and sometimes failed (cross-origin font CSS).
 */
const W = 1080;
const H = 1920;
const RITUAL = "'Song Myung', 'Nanum Myeongjo', serif";
const SANS = "'Pretendard Variable', Pretendard, system-ui, sans-serif";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Centered text that wraps to `maxW`; returns the y after the last line. */
function wrapCenter(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, lineH: number, maxLines = 3) {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  lines.slice(0, maxLines).forEach((l, i) => ctx.fillText(l, cx, y + i * lineH));
  return y + Math.min(lines.length, maxLines) * lineH;
}

/** Left-aligned text on at most two lines (the hanji slip, clear of the seal). */
function wrapLeft(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
}

/** 냥신 mascot: reuse the SVG already on the page. */
async function catImage(): Promise<HTMLImageElement | null> {
  const svg = document.querySelector('svg[aria-label="냥신"]');
  if (!svg) return null;
  const xml = new XMLSerializer().serializeToString(svg).replace(/width="\d+"/, 'width="240"').replace(/height="\d+"/, 'height="240"');
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml.includes("xmlns=") ? xml : xml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'))}`;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

export async function drawStoryImage(card: ShareableCard, myName: string, partnerName: string): Promise<Blob> {
  // 사주·대운·재회·배우자 cards carry their own lines; love cards are drawn from the type and the match.
  const f = isFortuneCard(card) ? card : null;
  const teaser = card as StoryCard;
  await Promise.all([document.fonts?.load(`80px ${RITUAL}`), document.fonts?.load(`40px ${SANS}`)].map((p) => p?.catch(() => null)));
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;

  // Room: soot black, candlelight from below, red haze above, vignette.
  ctx.fillStyle = "#0a0605";
  ctx.fillRect(0, 0, W, H);
  let g = ctx.createRadialGradient(W / 2, H * 1.02, 50, W / 2, H, H * 0.75);
  g.addColorStop(0, "rgba(255,150,60,0.35)");
  g.addColorStop(1, "rgba(255,150,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W / 2, -100, 50, W / 2, 0, 900);
  g.addColorStop(0, "rgba(150,30,24,0.4)");
  g.addColorStop(1, "rgba(150,30,24,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // drifting embers
  for (let i = 0; i < 70; i++) {
    const x = (i * 397) % W;
    const y = (i * 911) % H;
    const r = 1.5 + ((i * 7) % 5);
    const eg = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    eg.addColorStop(0, `rgba(255,180,90,${0.15 + ((i * 13) % 40) / 100})`);
    eg.addColorStop(1, "rgba(255,140,60,0)");
    ctx.fillStyle = eg;
    ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  }
  g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#c9a25a";
  ctx.font = `44px ${RITUAL}`;
  ctx.fillText("神   골목 끝 점집   神", W / 2, 190);

  // Card: lacquer frame, brass rim, dark inner panel with a warm glow.
  const cx = 110;
  const cy = 260;
  const cw = W - 220;
  const ch = 1380;
  roundRect(ctx, cx, cy, cw, ch, 56);
  g = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
  g.addColorStop(0, "#3a1a0e");
  g.addColorStop(0.55, "#140806");
  g.addColorStop(1, "#2a0d08");
  ctx.fillStyle = g;
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 60;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(201,162,90,0.75)";
  ctx.stroke();
  roundRect(ctx, cx + 26, cy + 26, cw - 52, ch - 52, 36);
  g = ctx.createRadialGradient(W / 2, cy + 520, 40, W / 2, cy + 520, 700);
  g.addColorStop(0, "#3a2214");
  g.addColorStop(1, "#0e0807");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(201,162,90,0.35)";
  ctx.stroke();

  ctx.font = `34px ${RITUAL}`;
  ctx.fillStyle = "#c9a25a";
  ctx.textAlign = "left";
  ctx.fillText("神", cx + 52, cy + 92);
  ctx.textAlign = "right";
  ctx.fillText("占", cx + cw - 52, cy + 92);
  ctx.textAlign = "center";

  const cat = await catImage();
  if (cat) ctx.drawImage(cat, W / 2 - 150, cy + 50, 64, 64);
  ctx.font = `36px ${RITUAL}`;
  ctx.fillStyle = "#c9a25a";
  ctx.fillText("냥 신   점 괘", W / 2 + 30, cy + 96);

  ctx.font = `34px ${SANS}`;
  ctx.fillStyle = "#a8977e";
  ctx.fillText(f ? f.label : `${myName}의 연애 팔자`, W / 2, cy + 200);

  // Emoji in a brass ring with candle glow.
  const ey = cy + 400;
  g = ctx.createRadialGradient(W / 2, ey, 20, W / 2, ey, 200);
  g.addColorStop(0, "rgba(255,170,80,0.45)");
  g.addColorStop(1, "rgba(255,120,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(W / 2 - 220, ey - 220, 440, 440);
  ctx.beginPath();
  ctx.arc(W / 2, ey, 140, 0, Math.PI * 2);
  g = ctx.createRadialGradient(W / 2, ey, 10, W / 2, ey, 140);
  g.addColorStop(0, "rgba(255,180,90,0.3)");
  g.addColorStop(1, "rgba(60,15,8,0.85)");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(201,162,90,0.8)";
  ctx.stroke();
  ctx.font = `150px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(f ? f.emoji : teaser.myType.emoji, W / 2, ey + 8);
  ctx.textBaseline = "alphabetic";

  ctx.font = `92px ${RITUAL}`;
  ctx.fillStyle = "#f3dfae";
  ctx.shadowColor = "rgba(230,140,50,0.55)";
  ctx.shadowBlur = 30;
  let y = wrapCenter(ctx, f ? f.headline : teaser.myType.name, W / 2, ey + 270, cw - 140, 104, 2);
  ctx.shadowBlur = 0;
  ctx.font = `40px ${SANS}`;
  ctx.fillStyle = "#c8b79a";
  y = wrapCenter(ctx, f ? f.sub : `“${teaser.myType.tagline}”`, W / 2, y + 20, cw - 160, 54, 2);
  const meta = f
    ? f.meta
    : [teaser.myType.code, teaser.match.myMbti, teaser.saju && `${teaser.saju.dayMaster.hangul}${teaser.saju.dayMaster.hanja}일간`].filter(Boolean).join("  ·  ");
  ctx.font = `30px ${SANS}`;
  ctx.fillStyle = "#8f7d63";
  ctx.fillText(meta, W / 2, y + 30);

  // Hanji slip with the match or the couple score, and a red seal.
  const sx = cx + 70;
  const sw = cw - 140;
  const sh = f ? 260 : teaser.couple ? 270 : 230;
  const sy = cy + ch - sh - 90;
  roundRect(ctx, sx, sy, sw, sh, 16);
  g = ctx.createLinearGradient(0, sy, 0, sy + sh);
  g.addColorStop(0, "#e9dcbd");
  g.addColorStop(1, "#d6c49c");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.textAlign = "left";
  if (f) {
    ctx.font = `32px ${SANS}`;
    ctx.fillStyle = "#6b4a2a";
    ctx.fillText(f.slipLabel, sx + 44, sy + 70);
    if (f.slipValue) {
      ctx.font = `76px ${RITUAL}`;
      ctx.fillStyle = "#8e1f17";
      ctx.textAlign = "right";
      ctx.fillText(f.slipValue, sx + sw - 120, sy + 92);
      ctx.textAlign = "left";
    }
    ctx.font = `bold 40px ${SANS}`;
    ctx.fillStyle = "#2a1a10";
    wrapLeft(ctx, f.slipText, sx + 44, sy + 160, sw - 190, 54);
  } else if (teaser.couple) {
    ctx.font = `32px ${SANS}`;
    ctx.fillStyle = "#6b4a2a";
    ctx.fillText(`${myName} · ${partnerName} 궁합`, sx + 44, sy + 70);
    ctx.font = `84px ${RITUAL}`;
    ctx.fillStyle = "#8e1f17";
    ctx.textAlign = "right";
    ctx.fillText(`${teaser.couple.matchScore}점`, sx + sw - 120, sy + 92);
    ctx.textAlign = "left";
    ctx.font = `bold 40px ${SANS}`;
    ctx.fillStyle = "#2a1a10";
    // Long couple titles wrap onto a second line, clear of the seal in the corner.
    const words = teaser.couple.coupleTitle.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(t).width > sw - 190 && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, sx + 44, sy + 160 + i * 54));
  } else {
    ctx.font = `32px ${SANS}`;
    ctx.fillStyle = "#6b4a2a";
    ctx.fillText("냥신이 점지한 인연", sx + 44, sy + 64);
    ctx.font = `52px ${RITUAL}`;
    ctx.fillStyle = "#2a1a10";
    ctx.fillText(`${teaser.match.bestType.emoji} ${teaser.match.bestType.name}`, sx + 44, sy + 136);
    ctx.font = `30px ${SANS}`;
    ctx.fillStyle = "#6b4a2a";
    ctx.fillText(
      [teaser.match.bestMbti.join("·"), teaser.match.goodAnimals.slice(0, 2).map((a) => `${a}띠`).join("·")].filter(Boolean).join("  |  "),
      sx + 44,
      sy + 190,
    );
  }
  ctx.save();
  ctx.translate(sx + sw - 30, sy + sh - 10);
  ctx.rotate(0.14);
  roundRect(ctx, -70, -70, 140, 140, 14);
  ctx.fillStyle = "#a3261b";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f6dcc0";
  ctx.textAlign = "center";
  ctx.font = `40px ${RITUAL}`;
  ctx.fillText("냥신", 0, -8);
  ctx.fillText("之印", 0, 42);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.font = `46px ${RITUAL}`;
  ctx.fillStyle = "#ece2cf";
  ctx.fillText("…너도 점 보러 와라냥", W / 2, cy + ch + 150);
  ctx.font = `34px ${SANS}`;
  ctx.fillStyle = "#c9a25a";
  ctx.fillText(window.location.host, W / 2, cy + ch + 210);

  // JPEG keeps it ~10x smaller than PNG, so the share sheet opens fast.
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("이미지 생성에 실패했어요."))), "image/jpeg", 0.92));
}
