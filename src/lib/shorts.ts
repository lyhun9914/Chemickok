/**
 * 쇼츠 · 릴스 소재 그리기: 9:16 (1080×1920) frames drawn on a canvas in the admin's browser, saved as PNG, or
 * encoded frame by frame into a 30fps MP4. A composition is a duration and a draw(ctx, t) that renders second t;
 * a still image is the composition at its end.
 */

export const W = 1080;
export const H = 1920;

export interface ShortsTti {
  animal: string;
  emoji: string;
  score: number;
  rank: number;
  line: string;
  short: string;
  years: number[];
}

export interface ShortsType {
  code: string;
  no: number;
  emoji: string;
  name: string;
  tagline: string;
  scenes: string[];
  word: string;
  best: { emoji: string; name: string };
  worst: { emoji: string; name: string };
  caption: string;
}

export interface ShortsDay {
  /** yyyy-mm-dd (KST) */
  day: string;
  date: string;
  weekday: string;
  ganji: string;
  tti: ShortsTti[];
  ttiCaption: string;
}

/** What GET /api/admin/shorts returns (built by engine/shorts). */
export interface ShortsData extends ShortsDay {
  types: ShortsType[];
}

/** The cat, drawn from the site's own SVG. */
export interface Assets {
  cat: HTMLImageElement;
  catHappy: HTMLImageElement;
}

export interface Comp {
  duration: number;
  draw: (ctx: CanvasRenderingContext2D, t: number) => void;
}

type Ctx = CanvasRenderingContext2D;

const SANS = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const RITUAL = '"Song Myung", "Nanum Myeongjo", serif';
const C = {
  text: "#ece2cf",
  muted: "#b0a089",
  red: "#d4503f",
  gold: "#c9a25a",
  peach: "#f0cf8a",
  hanji: "#e8dcc2",
  ink: "#241812",
};
const MEDAL = ["🥇", "🥈", "🥉"];

// ───────────── drawing helpers ─────────────

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - (1 - clamp01(x)) ** 3;
/** 0→1 over `dur` seconds from `start`. */
const fade = (t: number, start: number, dur = 0.45) => ease((t - start) / dur);

function font(ctx: Ctx, size: number, weight = 700, family = SANS) {
  ctx.font = `${weight} ${size}px ${family}`;
}

/** Korean wraps between words; a word wider than the line breaks between characters. */
function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxW) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const ch of word) {
      if (ctx.measureText(line + ch).width > maxW && line) {
        lines.push(line);
        line = "";
      }
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws wrapped text; returns the y below it. */
function para(ctx: Ctx, text: string, x: number, y: number, maxW: number, lh: number, align: CanvasTextAlign = "center"): number {
  ctx.textAlign = align;
  for (const l of wrap(ctx, text, maxW)) {
    ctx.fillText(l, x, y);
    y += lh;
  }
  return y;
}

function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Night alley: warm candle glow over dark wood, flickering a little with time. */
function background(ctx: Ctx, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#2a1512");
  g.addColorStop(0.45, "#140c09");
  g.addColorStop(1, "#090605");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const flicker = Number.isFinite(t) ? 0.16 + Math.sin(t * 7) * 0.015 + Math.sin(t * 2.3) * 0.02 : 0.17;
  const glow = ctx.createRadialGradient(W / 2, 260, 40, W / 2, 260, 950);
  glow.addColorStop(0, `rgba(240,160,80,${flicker})`);
  glow.addColorStop(1, "rgba(240,160,80,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(201,162,90,0.22)";
  ctx.lineWidth = 3;
  rounded(ctx, 28, 28, W - 56, H - 56, 36);
  ctx.stroke();
}

function brand(ctx: Ctx, a: Assets) {
  ctx.drawImage(a.cat, 64, 64, 92, 92);
  font(ctx, 44, 800);
  ctx.fillStyle = C.peach;
  ctx.textAlign = "left";
  ctx.fillText("냥신 점괘", 170, 126);
}

function cta(ctx: Ctx, text: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, 1772, 0, 1872);
  g.addColorStop(0, "#b8322a");
  g.addColorStop(1, "#7d1f19");
  ctx.fillStyle = g;
  rounded(ctx, 70, 1772, W - 140, 100, 50);
  ctx.fill();
  ctx.strokeStyle = "rgba(240,207,138,0.6)";
  ctx.lineWidth = 3;
  ctx.stroke();
  font(ctx, 38, 800);
  ctx.fillStyle = "#fff4e0";
  ctx.textAlign = "center";
  ctx.fillText(text, W / 2, 1836);
  ctx.restore();
}

function hanjiCard(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = C.hanji;
  rounded(ctx, x, y, w, h, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(36,24,18,0.25)";
  ctx.lineWidth = 2;
  rounded(ctx, x + 12, y + 12, w - 24, h - 24, 20);
  ctx.stroke();
}

function emoji(ctx: Ctx, e: string, x: number, y: number, size: number) {
  ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.fillText(e, x, y);
}

const yearsLine = (ys: number[]) => `${ys.join(" · ")}년생`;

// ───────────── 띠별 오늘의 운세 ─────────────

/** One image: all 12띠 with today's score and line, top 3 marked. */
export function ttiList(d: ShortsDay, a: Assets): Comp {
  return {
    duration: 0,
    draw(ctx, t) {
      background(ctx, t);
      brand(ctx, a);
      font(ctx, 104, 400, RITUAL);
      ctx.fillStyle = C.text;
      ctx.textAlign = "center";
      ctx.fillText("오늘의 띠별 운세", W / 2, 290);
      font(ctx, 42, 600);
      ctx.fillStyle = C.muted;
      ctx.fillText(`${d.date} (${d.weekday}) · ${d.ganji}`, W / 2, 360);
      d.tti.forEach((r, i) => {
        const y = 404 + i * 113;
        const top = r.rank <= 3;
        ctx.fillStyle = top ? "rgba(240,207,138,0.12)" : "rgba(255,255,255,0.045)";
        rounded(ctx, 60, y, W - 120, 102, 24);
        ctx.fill();
        if (top) {
          ctx.strokeStyle = "rgba(240,207,138,0.7)";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        emoji(ctx, r.emoji, 122, y + 72, 58);
        font(ctx, 44, 800);
        ctx.fillStyle = C.text;
        ctx.textAlign = "left";
        ctx.fillText(`${r.animal}띠${top ? ` ${MEDAL[r.rank - 1]}` : ""}`, 178, y + 52);
        font(ctx, 30, 500);
        ctx.fillStyle = C.muted;
        ctx.fillText(r.short, 178, y + 90);
        font(ctx, 60, 900);
        ctx.fillStyle = top ? C.peach : C.text;
        ctx.textAlign = "right";
        ctx.fillText(String(r.score), 940, y + 72);
        font(ctx, 32, 700);
        ctx.fillText("점", 990, y + 72);
      });
      cta(ctx, "띠 말고 '내 사주' 오늘의 운세는 무료 · 프로필 링크");
    },
  };
}

function drawTtiCard(ctx: Ctx, d: ShortsDay, r: ShortsTti, a: Assets, t: number, opts: { label: string; countFrom?: number; slide?: number }) {
  background(ctx, t);
  brand(ctx, a);
  const s = opts.slide ?? 1;
  ctx.save();
  ctx.globalAlpha = s;
  ctx.translate((1 - s) * 160, 0);
  font(ctx, 42, 600);
  ctx.fillStyle = C.muted;
  ctx.textAlign = "center";
  ctx.fillText(opts.label, W / 2, 268);
  emoji(ctx, r.emoji, W / 2, 610, 300);
  font(ctx, 150, 400, RITUAL);
  ctx.fillStyle = C.text;
  ctx.textAlign = "center";
  ctx.fillText(`${r.animal}띠`, W / 2, 810);
  font(ctx, 40, 500);
  ctx.fillStyle = C.muted;
  ctx.fillText(yearsLine(r.years), W / 2, 885);
  const shown = opts.countFrom === undefined ? r.score : Math.round(r.score * ease(opts.countFrom));
  font(ctx, 250, 900);
  ctx.fillStyle = C.peach;
  const num = String(shown);
  const nw = ctx.measureText(num).width;
  font(ctx, 90, 800);
  const uw = ctx.measureText("점").width;
  const x0 = W / 2 - (nw + uw + 10) / 2;
  font(ctx, 250, 900);
  ctx.textAlign = "left";
  ctx.fillText(num, x0, 1170);
  font(ctx, 90, 800);
  ctx.fillText("점", x0 + nw + 10, 1170);
  const badge = `오늘 12띠 중 ${r.rank}위${r.rank <= 3 ? ` ${MEDAL[r.rank - 1]}` : ""}`;
  font(ctx, 42, 800);
  const bw = ctx.measureText(badge).width + 80;
  ctx.fillStyle = r.rank <= 3 ? "rgba(240,207,138,0.18)" : "rgba(255,255,255,0.07)";
  rounded(ctx, W / 2 - bw / 2, 1215, bw, 78, 39);
  ctx.fill();
  ctx.fillStyle = r.rank <= 3 ? C.peach : C.text;
  ctx.textAlign = "center";
  ctx.fillText(badge, W / 2, 1268);
  hanjiCard(ctx, 80, 1340, W - 160, 360);
  font(ctx, 50, 700);
  ctx.fillStyle = C.ink;
  const lines = wrap(ctx, r.line, W - 260);
  let y = 1340 + 180 - ((lines.length - 1) * 70) / 2 + 16;
  for (const l of lines) {
    ctx.fillText(l, W / 2, y);
    y += 70;
  }
  ctx.restore();
}

/** One image per 띠, for a 12-slide carousel. */
export function ttiCard(d: ShortsDay, r: ShortsTti, a: Assets): Comp {
  return {
    duration: 0,
    draw(ctx, t) {
      drawTtiCard(ctx, d, r, a, t, { label: `띠별 오늘의 운세 · ${d.date} (${d.weekday})` });
      cta(ctx, "내 사주로 보는 오늘의 운세는 무료 · 프로필 링크");
    },
  };
}

const INTRO = 2.6;
const SLOT = 1.45;

/** 순위 공개 영상: 12위부터 한 띠씩, 1등은 마지막에. */
export function ttiVideo(d: ShortsDay, a: Assets): Comp {
  const order = [...d.tti].sort((x, y) => y.rank - x.rank);
  const outro = INTRO + order.length * SLOT;
  const top = [...d.tti].sort((x, y) => x.rank - y.rank).slice(0, 3);
  return {
    duration: outro + 3.2,
    draw(ctx, t) {
      if (t < INTRO) {
        background(ctx, t);
        brand(ctx, a);
        const p = fade(t, 0.1, 0.6);
        ctx.save();
        ctx.globalAlpha = p;
        const size = 300 + 60 * (1 - p);
        ctx.drawImage(a.cat, W / 2 - size / 2, 420 - size / 2 + 140, size, size);
        ctx.restore();
        ctx.globalAlpha = fade(t, 0.4);
        font(ctx, 46, 600);
        ctx.fillStyle = C.muted;
        ctx.textAlign = "center";
        ctx.fillText(`${d.date} (${d.weekday}) · ${d.ganji}`, W / 2, 920);
        font(ctx, 116, 400, RITUAL);
        ctx.fillStyle = C.text;
        ctx.fillText("오늘 운 좋은 띠", W / 2, 1060);
        ctx.fillText("순위", W / 2, 1190);
        ctx.globalAlpha = fade(t, 1.1);
        font(ctx, 48, 700);
        ctx.fillStyle = C.peach;
        ctx.fillText("12위부터 공개 · 1등은 마지막에 😼", W / 2, 1320);
        ctx.globalAlpha = 1;
        cta(ctx, "내 띠가 몇 위인지 끝까지 보라냥", fade(t, 1.4));
        return;
      }
      if (t < outro) {
        const i = Math.min(order.length - 1, Math.floor((t - INTRO) / SLOT));
        const local = t - INTRO - i * SLOT;
        const r = order[i];
        drawTtiCard(ctx, d, r, a, t, { label: `${r.rank}위`, countFrom: local / 0.7, slide: fade(local, 0, 0.35) });
        cta(ctx, "내 사주로 보는 오늘의 운세 · 프로필 링크");
        return;
      }
      background(ctx, t);
      brand(ctx, a);
      const local = t - outro;
      ctx.globalAlpha = fade(local, 0);
      font(ctx, 56, 700);
      ctx.fillStyle = C.muted;
      ctx.textAlign = "center";
      ctx.fillText("오늘의 1등", W / 2, 360);
      emoji(ctx, top[0].emoji, W / 2, 640, 260);
      font(ctx, 140, 400, RITUAL);
      ctx.fillStyle = C.peach;
      ctx.textAlign = "center";
      ctx.fillText(`${top[0].animal}띠 🥇`, W / 2, 830);
      ctx.globalAlpha = fade(local, 0.6);
      top.slice(1).forEach((r, k) => {
        font(ctx, 60, 800);
        ctx.fillStyle = C.text;
        ctx.fillText(`${MEDAL[k + 1]} ${r.animal}띠 ${r.score}점`, W / 2, 1010 + k * 100);
      });
      ctx.globalAlpha = fade(local, 1.1);
      ctx.drawImage(a.catHappy, W / 2 - 150, 1250, 300, 300);
      ctx.globalAlpha = 1;
      cta(ctx, "내 사주로 보는 오늘의 운세는 무료 · 프로필 링크", fade(local, 1.3));
    },
  };
}

// ───────────── 16유형 연애 팔자 ─────────────

function drawType(ctx: Ctx, ty: ShortsType, a: Assets, t: number, reveal: { head: number; scenes: number[]; match: number; word: number }) {
  background(ctx, t);
  brand(ctx, a);
  ctx.textAlign = "center";
  ctx.globalAlpha = reveal.head;
  font(ctx, 42, 600);
  ctx.fillStyle = C.muted;
  ctx.fillText(`연애 팔자 16유형 · ${ty.no}/16`, W / 2, 262);
  font(ctx, 54, 700);
  ctx.fillStyle = C.text;
  ctx.fillText("연애할 때 이러면", W / 2, 346);
  const pop = 1 + 0.25 * (1 - reveal.head);
  emoji(ctx, ty.emoji, W / 2, 560, 210 * pop);
  // the name stays on one line: a long one is set smaller rather than pushing the card into the link
  const title = `'${ty.name}'`;
  let size = 96;
  font(ctx, size, 400, RITUAL);
  while (size > 60 && ctx.measureText(title).width > W - 140) font(ctx, (size -= 4), 400, RITUAL);
  ctx.fillStyle = C.peach;
  ctx.textAlign = "center";
  ctx.fillText(title, W / 2, 720);
  let y = 828;
  font(ctx, 44, 600);
  ctx.fillStyle = C.text;
  y = para(ctx, ty.tagline, W / 2, y + 6, W - 160, 58);
  ctx.globalAlpha = 1;

  // checklist on hanji
  const cardY = y + 30;
  font(ctx, 40, 600);
  const lines = ty.scenes.map((s) => wrap(ctx, s, W - 320));
  const cardH = 110 + lines.reduce((n, l) => n + l.length * 56 + 26, 0);
  ctx.globalAlpha = reveal.scenes[0] ?? 1;
  hanjiCard(ctx, 70, cardY, W - 140, cardH);
  font(ctx, 40, 800);
  ctx.fillStyle = C.ink;
  ctx.textAlign = "left";
  ctx.fillText("이러면 이 유형이다냥", 130, cardY + 76);
  let ly = cardY + 150;
  lines.forEach((ls, k) => {
    ctx.globalAlpha = reveal.scenes[k] ?? 1;
    font(ctx, 40, 800);
    ctx.fillStyle = C.red;
    ctx.fillText("✔", 130, ly);
    font(ctx, 40, 600);
    ctx.fillStyle = C.ink;
    for (const l of ls) {
      ctx.fillText(l, 186, ly);
      ly += 56;
    }
    ly += 26;
  });
  ctx.globalAlpha = 1;

  // 찰떡 · 상극
  let my = cardY + cardH + 70;
  ctx.globalAlpha = reveal.match;
  font(ctx, 44, 800);
  ctx.textAlign = "center";
  ctx.fillStyle = C.peach;
  my = para(ctx, `💞 찰떡: ${ty.best.emoji} ${ty.best.name}`, W / 2, my, W - 140, 58);
  ctx.fillStyle = C.muted;
  my = para(ctx, `⚡ 상극: ${ty.worst.emoji} ${ty.worst.name}`, W / 2, my + 6, W - 140, 58);
  ctx.globalAlpha = reveal.word;
  font(ctx, 38, 500);
  ctx.fillStyle = C.text;
  para(ctx, `냥신: ${ty.word}`, W / 2, Math.min(my + 40, 1700), W - 180, 52);
  ctx.globalAlpha = 1;
  cta(ctx, "너는 뭐냥? 3분 면담 무료 · 프로필 링크", reveal.word);
}

export function typeCard(ty: ShortsType, a: Assets): Comp {
  return { duration: 0, draw: (ctx, t) => drawType(ctx, ty, a, t, { head: 1, scenes: [1, 1, 1], match: 1, word: 1 }) };
}

/** 14초: 훅 → 장면 셋 하나씩 → 찰떡·상극 → 냥신 한마디와 링크. */
export function typeVideo(ty: ShortsType, a: Assets): Comp {
  return {
    duration: 14,
    draw: (ctx, t) =>
      drawType(ctx, ty, a, t, {
        head: fade(t, 0.1, 0.6),
        scenes: ty.scenes.map((_, k) => fade(t, 2.4 + k * 2)),
        match: fade(t, 8.6),
        word: fade(t, 11.2),
      }),
  };
}

// ───────────── output ─────────────

/** Fonts the frames use, loaded for exactly these characters (the web fonts are split by character range). */
export async function loadFonts(text: string) {
  const chars = [...new Set(text)].join("");
  await Promise.all([
    document.fonts.load(`900 60px "Pretendard Variable"`, chars),
    document.fonts.load(`400 60px "Song Myung"`, chars),
  ]).catch(() => null);
}

export function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

export function frame(comp: Comp, canvas = document.createElement("canvas")): HTMLCanvasElement {
  canvas.width = W;
  canvas.height = H;
  comp.draw(canvas.getContext("2d")!, comp.duration || Infinity);
  return canvas;
}

export const png = (comp: Comp): Promise<Blob> => new Promise((res, rej) => frame(comp).toBlob((b) => (b ? res(b) : rej(new Error("이미지를 만들지 못했어요"))), "image/png"));

const FPS = 30;

/** Real-time fallback (Firefox): MP4 where MediaRecorder can make it, else WebM. */
function recorderType(): { mime: string; ext: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mime of ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"])
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext: mime.startsWith("video/mp4") ? "mp4" : "webm" };
  return null;
}

/** What this browser will produce: a steady-30fps MP4 (WebCodecs: Chrome, Edge, Safari), else a recorder's guess. */
export async function videoFormat(): Promise<"mp4" | "webm" | null> {
  if (typeof VideoEncoder !== "undefined") {
    const { canEncodeVideo } = await import("mediabunny");
    if (await canEncodeVideo("avc", { width: W, height: H }).catch(() => false)) return "mp4";
  }
  return recorderType()?.ext ?? null;
}

/**
 * The composition as a video. With WebCodecs every frame is drawn and encoded in turn at an exact 30fps, so the
 * result doesn't depend on how fast this computer draws. Otherwise it's played in real time into a MediaRecorder,
 * and the tab has to stay open and visible meanwhile.
 */
export async function record(comp: Comp, onProgress?: (p: number) => void): Promise<{ blob: Blob; ext: string }> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  if ((await videoFormat()) === "mp4" && typeof VideoEncoder !== "undefined") {
    const mb = await import("mediabunny");
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
    const source = new mb.CanvasSource(canvas, { codec: "avc", bitrate: 8_000_000, keyFrameInterval: 2 });
    output.addVideoTrack(source, { frameRate: FPS });
    await output.start();
    const frames = Math.ceil(comp.duration * FPS);
    for (let i = 0; i < frames; i++) {
      comp.draw(ctx, i / FPS);
      await source.add(i / FPS, 1 / FPS);
      if (i % 15 === 0) {
        onProgress?.(i / frames);
        await new Promise((r) => setTimeout(r, 0)); // let the progress bar paint
      }
    }
    await output.finalize();
    onProgress?.(1);
    return { blob: new Blob([output.target.buffer!], { type: "video/mp4" }), ext: "mp4" };
  }

  const type = recorderType();
  if (!type) throw new Error("이 브라우저는 영상 만들기를 지원하지 않아요. 크롬 최신 버전에서 해 주세요.");
  comp.draw(ctx, 0);
  const stream = canvas.captureStream(FPS);
  const rec = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((res) => (rec.onstop = () => res()));
  rec.start(500);
  const t0 = performance.now();
  await new Promise<void>((res) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      comp.draw(ctx, Math.min(t, comp.duration));
      onProgress?.(Math.min(1, t / comp.duration));
      if (t >= comp.duration + 0.4) res();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  await stopped;
  stream.getTracks().forEach((tr) => tr.stop());
  return { blob: new Blob(chunks, { type: type.mime.split(";")[0] }), ext: type.ext };
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
