/**
 * 냥신 합격 부적: a 1080×1920 image (phone wallpaper / Instagram story) drawn on a canvas — yellow 괴황지 paper,
 * 경면주사 red strokes, 合格 in the middle, the name and exam, and a 냥신 seal. Drawn locally; nothing is uploaded.
 */
const W = 1080;
const H = 1920;
const RITUAL = "'Song Myung', 'Nanum Myeongjo', serif";
const SANS = "'Pretendard Variable', Pretendard, system-ui, sans-serif";
const RED = "#b3261e";

export interface BujeokInput {
  name: string;
  exam: string; // "수능"
  dateLabel: string; // "11월 19일 (목)"
  ganji: string; // "계유일"
  site: string;
}

/** Talisman scribbles: loose brush curves that wrap the characters, seeded so the same name draws the same 부적. */
function scribble(ctx: CanvasRenderingContext2D, seed: number, x: number, y: number, w: number, h: number) {
  let s = seed;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  ctx.strokeStyle = RED;
  ctx.lineCap = "round";
  for (let k = 0; k < 7; k++) {
    ctx.lineWidth = 6 + r() * 8;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    const sx = x + r() * w;
    const sy = y + r() * h;
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(x + r() * w, y + r() * h, x + r() * w, y + r() * h, x + r() * w, y + r() * h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export async function drawBujeok(b: BujeokInput): Promise<Blob> {
  await document.fonts?.ready.catch(() => {});
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Night room with a candle glow.
  ctx.fillStyle = "#0d0705";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.45, 80, W / 2, H * 0.45, 900);
  glow.addColorStop(0, "rgba(240,180,90,0.28)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // The paper.
  const px = 170;
  const py = 190;
  const pw = W - px * 2;
  const ph = 1440;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  const paper = ctx.createLinearGradient(0, py, 0, py + ph);
  paper.addColorStop(0, "#f0cf6a");
  paper.addColorStop(0.5, "#e7bd4f");
  paper.addColorStop(1, "#d9a83a");
  ctx.fillStyle = paper;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
  // Paper fibres.
  let f = b.name.length * 7919;
  const rnd = () => (f = (f * 9301 + 49297) % 233280) / 233280;
  ctx.strokeStyle = "rgba(120,80,20,0.10)";
  ctx.lineWidth = 2;
  for (let k = 0; k < 140; k++) {
    const x = px + rnd() * pw;
    const y = py + rnd() * ph;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 20);
    ctx.stroke();
  }

  // Double red border.
  ctx.strokeStyle = RED;
  ctx.lineWidth = 10;
  ctx.strokeRect(px + 34, py + 34, pw - 68, ph - 68);
  ctx.lineWidth = 3;
  ctx.strokeRect(px + 54, py + 54, pw - 108, ph - 108);

  // Head.
  ctx.fillStyle = RED;
  ctx.font = `700 46px ${RITUAL}`;
  ctx.fillText("猫 神 合 格 符", W / 2, py + 140);
  ctx.font = `600 34px ${SANS}`;
  ctx.fillText("냥신 합격 부적", W / 2, py + 196);

  // 合格, stacked, with scribbles around.
  const seed = [...b.name].reduce((n, ch) => n + ch.charCodeAt(0), 0) || 7;
  scribble(ctx, seed, px + 90, py + 250, pw - 180, 760);
  ctx.fillStyle = RED;
  ctx.font = `700 330px ${RITUAL}`;
  ctx.fillText("合", W / 2, py + 560);
  ctx.fillText("格", W / 2, py + 900);

  // Who and what.
  ctx.font = `700 76px ${RITUAL}`;
  ctx.fillText(b.name, W / 2, py + 1080);
  ctx.font = `700 52px ${SANS}`;
  ctx.fillText(`${b.exam} 합격 기원`, W / 2, py + 1160);
  ctx.font = `500 34px ${SANS}`;
  ctx.fillStyle = "#7a1a14";
  ctx.fillText(`시험날 ${b.dateLabel} · ${b.ganji}`, W / 2, py + 1226);

  // Seal.
  ctx.save();
  ctx.translate(px + pw - 170, py + ph - 135);
  ctx.rotate(-0.08);
  ctx.fillStyle = RED;
  ctx.fillRect(-70, -70, 140, 140);
  ctx.fillStyle = "#f3d27a";
  ctx.font = `700 46px ${RITUAL}`;
  ctx.fillText("냥신", 0, -8);
  ctx.fillText("之印", 0, 46);
  ctx.restore();

  // Footer.
  ctx.fillStyle = "#e9d6a8";
  ctx.font = `600 40px ${RITUAL}`;
  ctx.fillText("…붙고 와라냥. 냥신이 지켜본다냥", W / 2, py + ph + 110);
  ctx.fillStyle = "rgba(233,214,168,0.6)";
  ctx.font = `500 30px ${SANS}`;
  ctx.fillText(b.site.replace(/^https?:\/\//, ""), W / 2, py + ph + 170);

  return new Promise((resolve, reject) => canvas.toBlob((bl) => (bl ? resolve(bl) : reject(new Error("canvas"))), "image/png"));
}
