/**
 * The pieces of 점집 소리, synthesized with Web Audio. Everything here works on any BaseAudioContext, so the same
 * code plays live (lib/sound) and renders offline for listening tests.
 *
 * Built to sound like a place, not a synth:
 *   - air is brown noise under a low lowpass (a soft rumble), never white hiss;
 *   - the night is crickets, a 소쩍새, now and then a 부엉이 or a far 뻐꾸기, and a 풍경 under the eaves;
 *   - under it a slow minor pad, and now and then a 가야금 phrase in 계면조 with 농현 (plucked-string synthesis);
 *   - things answer each other: a second 소쩍새 replies, a gust rustles leaves and rings the 풍경;
 *   - every sound is placed (left/right, near/far: far is darker and wetter) and sent through a generated reverb.
 */

export type Scene = "gate" | "inside" | "loading" | "result";
export type Sfx = "doorClose" | "doorOpen" | "candle" | "match" | "bells" | "page" | "flip" | "slide" | "stamp" | "tap" | "bowl" | "unlock" | "pung" | "reveal";

type Ctx = BaseAudioContext;

const R = Math.random;
const rr = (a: number, b: number) => a + R() * (b - a);

// ───────────── noise ─────────────

interface Noise {
  brown: AudioBuffer;
  pink: AudioBuffer;
  /** loop end (seconds): the buffers are crossfaded so the loop has no seam */
  loopEnd: number;
}
const NOISE = new WeakMap<Ctx, Noise>();
const NOISE_SEC = 8;
const SEAM_SEC = 0.5;

function normalize(d: Float32Array, peak = 0.9) {
  let m = 0;
  for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
  if (m > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / m;
}
/** Blend the tail into the head so looping [0, len − fade) is seamless. */
function seamless(d: Float32Array, fade: number) {
  const n = d.length;
  for (let i = 0; i < fade; i++) {
    const x = i / fade;
    d[i] = d[i] * x + d[n - fade + i] * (1 - x);
  }
}

function noise(ctx: Ctx): Noise {
  const have = NOISE.get(ctx);
  if (have) return have;
  const sr = ctx.sampleRate;
  const len = sr * NOISE_SEC;
  const fade = Math.floor(sr * SEAM_SEC);
  const brown = ctx.createBuffer(2, len, sr);
  const pink = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const b = brown.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (R() * 2 - 1)) / 1.02;
      b[i] = last;
    }
    normalize(b);
    seamless(b, fade);
    const p = pink.getChannelData(ch);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = R() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      p[i] = b0 + b1 + b2 + w * 0.1848;
    }
    normalize(p);
    seamless(p, fade);
  }
  const n = { brown, pink, loopEnd: NOISE_SEC - SEAM_SEC };
  NOISE.set(ctx, n);
  return n;
}

function noiseSrc(ctx: Ctx, kind: "brown" | "pink", t: number, end: number) {
  const n = noise(ctx);
  const s = ctx.createBufferSource();
  s.buffer = n[kind];
  s.loop = true;
  s.loopEnd = n.loopEnd;
  s.start(t, R() * (n.loopEnd - 1));
  s.stop(end);
  return s;
}

// ───────────── space ─────────────

/** A generated impulse response: a short pre-delay, a few early reflections, then a tail that darkens as it fades. */
export function makeReverb(ctx: Ctx, seconds: number, bright: number): ConvolverNode {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const pre = Math.floor(sr * 0.014);
  const ir = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const x = (i - pre) / (len - pre);
      const a = bright * (1 - 0.75 * x);
      lp += a * (R() * 2 - 1 - lp);
      d[i] = lp * Math.exp(-6.9 * x);
    }
    for (let k = 0; k < 6; k++) d[pre + Math.floor(sr * rr(0.004, 0.045))] += rr(-0.5, 0.5);
  }
  const c = ctx.createConvolver();
  c.buffer = ir;
  return c;
}

export interface Bus {
  ctx: Ctx;
  dry: AudioNode;
  /** long, dark outdoor reverb */
  hall: AudioNode;
  /** short room reverb */
  room: AudioNode;
}

/**
 * The shared mix: master → gentle compressor → destination, with the two reverbs returning into master.
 * `level` is the master volume.
 */
export function createMix(ctx: Ctx, dest: AudioNode, level: number) {
  const master = ctx.createGain();
  master.gain.value = level;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 12;
  comp.ratio.value = 3;
  comp.attack.value = 0.008;
  comp.release.value = 0.3;
  master.connect(comp).connect(dest);
  const hall = makeReverb(ctx, 3.4, 0.45);
  const room = makeReverb(ctx, 1.25, 0.6);
  const hallRet = ctx.createGain();
  hallRet.gain.value = 0.9;
  const roomRet = ctx.createGain();
  roomRet.gain.value = 0.7;
  hall.connect(hallRet).connect(master);
  room.connect(roomRet).connect(master);
  return { master, hall, room };
}

interface Place {
  gain: number;
  pan?: number;
  /** 0 = right here … 1 = far off (darker, wetter, quieter direct sound) */
  far?: number;
  /** extra lowpass, e.g. heard through a wall */
  lp?: number;
  space?: "hall" | "room";
  wet?: number;
}

/** Put a sound somewhere: returns the node a voice connects into. */
function place(b: Bus, p: Place): BiquadFilterNode {
  const { ctx } = b;
  const far = p.far ?? 0;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = p.lp ?? 15000 * Math.pow(0.14, far);
  f.Q.value = 0.4;
  const g = ctx.createGain();
  g.gain.value = p.gain;
  f.connect(g);
  let tail: AudioNode = g;
  if (p.pan && typeof ctx.createStereoPanner === "function") {
    const s = ctx.createStereoPanner();
    s.pan.value = Math.max(-1, Math.min(1, p.pan));
    g.connect(s);
    tail = s;
  }
  const dry = ctx.createGain();
  dry.gain.value = 1 - far * 0.7;
  const wet = ctx.createGain();
  wet.gain.value = p.wet ?? 0.12 + far * 0.55;
  tail.connect(dry).connect(b.dry);
  tail.connect(wet).connect(p.space === "room" ? b.room : b.hall);
  return f;
}

function osc(ctx: Ctx, type: OscillatorType, f: number, t: number, end: number) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.start(t);
  o.stop(end);
  return o;
}
function gainNode(ctx: Ctx, v: number) {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}
function filter(ctx: Ctx, type: BiquadFilterType, f: number, q = 0.7) {
  const n = ctx.createBiquadFilter();
  n.type = type;
  n.frequency.value = f;
  n.Q.value = q;
  return n;
}
/** A struck envelope: 0 → peak in `a`, then an exponential fall with time constant `tau`. */
function strike(g: AudioParam, t: number, peak: number, a: number, tau: number) {
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(peak, t + a);
  g.setTargetAtTime(0, t + a, tau);
}

// ───────────── night creatures ─────────────

/** 귀뚜라미, one chirp: 3–5 short pulses near 4.5 kHz, each dipping a little in pitch. */
function cricket(b: Bus, t: number, f: number, p: Place) {
  const { ctx } = b;
  const n = 3 + Math.floor(R() * 3);
  const gap = rr(0.03, 0.037);
  const end = t + n * gap + 0.06;
  const g = gainNode(ctx, 0);
  g.connect(place(b, p));
  const o1 = osc(ctx, "sine", f, t, end);
  const o2 = osc(ctx, "sine", f * 2, t, end);
  o1.connect(g);
  o2.connect(gainNode(ctx, 0.06)).connect(g);
  for (let k = 0; k < n; k++) {
    const s = t + k * gap;
    const v = (k === 0 ? 0.65 : 1) * rr(0.85, 1);
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(v, s + 0.004);
    g.gain.linearRampToValueAtTime(0, s + 0.019);
    o1.frequency.setValueAtTime(f * 1.008, s);
    o1.frequency.linearRampToValueAtTime(f * 0.99, s + 0.019);
    o2.frequency.setValueAtTime(f * 2.016, s);
    o2.frequency.linearRampToValueAtTime(f * 1.98, s + 0.019);
  }
}

/** One sung note: birds that call at night are close to whistles — a sine, a faint overtone and a little breath. */
function note(b: Bus, out: AudioNode, t: number, pts: [number, number][], dur: number, attack: number, release: number, peak: number, h2: number, breath: number) {
  const { ctx } = b;
  const end = t + dur + release * 6;
  const g = gainNode(ctx, 0);
  g.connect(out);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + dur);
  g.gain.setTargetAtTime(0, t + dur, release);
  const glide = (o: OscillatorNode, k: number) => pts.forEach(([dt, f], i) => (i ? o.frequency.linearRampToValueAtTime(f * k, t + dt) : o.frequency.setValueAtTime(f * k, t + dt)));
  const o = osc(ctx, "sine", pts[0][1], t, end);
  glide(o, 1);
  o.connect(g);
  const wob = osc(ctx, "sine", rr(5, 7), t, end);
  wob.connect(gainNode(ctx, pts[0][1] * 0.004)).connect(o.frequency);
  if (h2) {
    const o2 = osc(ctx, "sine", pts[0][1] * 2, t, end);
    glide(o2, 2);
    o2.connect(gainNode(ctx, h2)).connect(g);
  }
  if (breath) {
    const n = noiseSrc(ctx, "pink", t, end);
    n.connect(filter(ctx, "bandpass", pts[0][1], 4))
      .connect(gainNode(ctx, breath))
      .connect(g);
  }
}

/** 소쩍새: "소-쩍" — a longer, rounded note and a short clipped one a little higher; now and then "소쩍-다". */
function scopsOwl(b: Bus, t: number, f0: number, p: Place) {
  const out = place(b, p);
  // No two calls are the same: a little pitch and level drift per call.
  const f = f0 * rr(0.985, 1.015);
  if (R() < 0.2)
    note(
      b,
      out,
      t + 0.4,
      [
        [0, f * 0.96],
        [0.07, f * 0.93],
      ],
      0.07,
      0.008,
      0.02,
      0.55,
      0.05,
      1.4,
    );
  note(
    b,
    out,
    t,
    [
      [0, f * 0.97],
      [0.07, f * 1.03],
      [0.17, f * 0.99],
    ],
    0.17,
    0.035,
    0.03,
    1,
    0.04,
    1.2,
  );
  note(
    b,
    out,
    t + 0.25,
    [
      [0, f * 1.08],
      [0.08, f * 1.02],
    ],
    0.08,
    0.006,
    0.022,
    0.85,
    0.06,
    1.6,
  );
}

/** 부엉이: "부-엉" — a short accented onset, then a long falling hoot. */
function hoot(b: Bus, t: number, f: number, p: Place) {
  const out = place(b, p);
  note(
    b,
    out,
    t,
    [
      [0, f * 0.96],
      [0.08, f * 1.02],
    ],
    0.08,
    0.025,
    0.035,
    0.7,
    0.18,
    1.4,
  );
  note(
    b,
    out,
    t + 0.17,
    [
      [0, f * 1.04],
      [0.25, f * 0.95],
      [0.45, f * 0.9],
    ],
    0.36,
    0.07,
    0.09,
    1,
    0.2,
    1.2,
  );
}

/** 뻐꾸기: "뻐-꾹", the second note a third lower. */
function cuckoo(b: Bus, t: number, f: number, p: Place) {
  const out = place(b, p);
  note(
    b,
    out,
    t,
    [
      [0, f * 1.01],
      [0.17, f * 0.98],
    ],
    0.17,
    0.02,
    0.045,
    1,
    0.05,
    0.4,
  );
  note(
    b,
    out,
    t + 0.3,
    [
      [0, f * 0.81],
      [0.24, f * 0.78],
    ],
    0.24,
    0.025,
    0.07,
    0.9,
    0.05,
    0.4,
  );
}

// ───────────── 가야금 ─────────────

const PLUCKS = new WeakMap<Ctx, Map<number, AudioBuffer>>();

/**
 * One plucked silk string, Karplus–Strong: a soft noise burst circulating in a delay line one period long, averaged
 * each pass (which is what makes a real string lose its highs first). Rendered once per pitch and reused.
 */
function pluckBuffer(ctx: Ctx, f: number, t60 = 3.2): AudioBuffer {
  let m = PLUCKS.get(ctx);
  if (!m) PLUCKS.set(ctx, (m = new Map()));
  const key = Math.round(f * 10);
  const have = m.get(key);
  if (have) return have;
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 3.6);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const N = Math.max(2, Math.round(sr / f - 0.5));
  const line = new Float32Array(N);
  // A finger on silk, not a plectrum: lowpassed excitation, plucked about a fifth of the way along (comb).
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += 0.45 * (R() * 2 - 1 - lp);
    line[i] = lp;
  }
  const off = Math.max(1, Math.round(N / 5));
  const shaped = line.map((v, i) => v - 0.6 * line[(i + off) % N]);
  line.set(shaped);
  const rho = Math.pow(10, -3 / (f * t60));
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const cur = line[idx];
    const nxt = line[(idx + 1) % N];
    d[i] = cur;
    line[idx] = rho * 0.5 * (cur + nxt);
    idx = (idx + 1) % N;
  }
  normalize(d, 0.8);
  m.set(key, buf);
  return buf;
}

type Pluck = "plain" | "long" | "slideIn" | "fall";

/**
 * A 가야금 note. `long` adds 농현 (vibrato that grows after the attack); `slideIn` comes up into the pitch; `fall`
 * lets the note sag a semitone at its end (퇴성).
 */
function pluck(b: Bus, t: number, f: number, p: Place, kind: Pluck) {
  const { ctx } = b;
  const src = ctx.createBufferSource();
  src.buffer = pluckBuffer(ctx, f);
  const body = filter(ctx, "peaking", 230, 1.1);
  body.gain.value = 4;
  src
    .connect(filter(ctx, "highpass", 70, 0.5))
    .connect(body)
    .connect(filter(ctx, "lowpass", 3200, 0.5))
    .connect(place(b, p));
  const pr = src.playbackRate;
  if (kind === "slideIn") {
    pr.setValueAtTime(0.955, t);
    pr.linearRampToValueAtTime(1, t + 0.17);
  } else pr.setValueAtTime(1, t);
  if (kind === "fall") {
    pr.setValueAtTime(1, t + 0.75);
    pr.linearRampToValueAtTime(0.944, t + 1.15);
  }
  if (kind === "long") {
    const lfo = osc(ctx, "sine", rr(4.6, 5.6), t, t + 3.5);
    const depth = gainNode(ctx, 0);
    depth.gain.setValueAtTime(0, t + 0.35);
    depth.gain.linearRampToValueAtTime(0.014, t + 1.1);
    lfo.connect(depth).connect(pr);
  }
  src.start(t);
  src.stop(t + 3.5);
}

/** 계면조 (D · F · G · A · C) phrases: falling, sighing lines; the last note rings with 농현. */
const D3n = 146.83;
const F3n = 174.61;
const G3n = 196;
const A3n = 220;
const C4n = 261.63;
const D4n = 293.66;
const F4n = 349.23;
const PHRASES = {
  dark: [
    [A3n, G3n, F3n, D3n],
    [D4n, C4n, A3n],
    [F3n, G3n, A3n],
    [A3n, D4n, C4n, A3n],
    [D3n, F3n, G3n],
    [C4n, A3n, G3n, A3n],
  ],
  light: [
    [F3n, A3n, C4n, A3n],
    [C4n, D4n, F4n],
    [A3n, C4n, D4n, C4n],
    [D4n, C4n, A3n, C4n],
  ],
};

function phrase(b: Bus, t: number, notes: number[], p: Place): number {
  let s = t;
  notes.forEach((f, i) => {
    const last = i === notes.length - 1;
    pluck(b, s, f, { ...p, gain: p.gain * rr(0.75, 1) * (i === 0 ? 1.1 : 1) }, last ? (R() < 0.3 ? "fall" : "long") : R() < 0.25 ? "slideIn" : "plain");
    s += last ? 0 : rr(0.85, 1.5);
  });
  return s - t + 3.2;
}

// ───────────── bells · bowls ─────────────

/** A struck metal partial set; `pair` detunes the low partials into slow beats, as real bells have. */
function metal(b: Bus, out: AudioNode, t: number, f: number, partials: [number, number, number][], vel: number, pair = 0.7) {
  const { ctx } = b;
  partials.forEach(([ratio, amp, decay], i) => {
    // A weaker twin a hair off pitch: gentle beats, not a full wah.
    const dets: [number, number][] =
      i < 2 && pair
        ? [
            [0, 0.78],
            [pair, 0.22],
          ]
        : [[0, 1]];
    for (const [d, share] of dets) {
      const o = osc(ctx, "sine", f * ratio + d, t, t + decay * 2.2);
      const g = gainNode(ctx, 0);
      strike(g.gain, t, amp * vel * share, 0.002, decay / 3);
      o.connect(g).connect(out);
    }
  });
  // the hit itself: a tick of noise
  const n = noiseSrc(ctx, "pink", t, t + 0.03);
  const g = gainNode(ctx, 0);
  strike(g.gain, t, 0.25 * vel, 0.001, 0.003);
  n.connect(filter(ctx, "highpass", 2500))
    .connect(g)
    .connect(out);
}

/** 풍경: the small bronze bell under the eaves — bright, long ringing, struck 1–3 times as the wind moves it. */
function windBell(b: Bus, t: number, f: number, p: Place) {
  const out = place(b, p);
  const n = 1 + Math.floor(R() * 3);
  let s = t;
  for (let k = 0; k < n; k++) {
    metal(
      b,
      out,
      s,
      f,
      [
        [1, 1, 3.2],
        [2.32, 0.42, 1.7],
        [4.25, 0.2, 0.8],
        [6.63, 0.08, 0.45],
      ],
      k === 0 ? 1 : rr(0.35, 0.7),
    );
    s += rr(0.3, 0.9);
  }
}

/** 싱잉볼: a low bowl with long beating partials. */
function bowl(b: Bus, t: number, p: Place, f = rr(190, 250)) {
  metal(
    b,
    place(b, p),
    t,
    f,
    [
      [1, 1, 7],
      [2.71, 0.42, 3.6],
      [5.15, 0.16, 1.8],
      [8.4, 0.06, 0.9],
    ],
    1,
    0.9,
  );
}

/** 방울 (무당 방울): a bunch of small bells shaken a few times. */
function bells(b: Bus, t: number, p: Place, shakes = 3) {
  const out = place(b, p);
  const fs = [2780, 3120, 3490, 3910];
  let s = t;
  for (let sh = 0; sh < shakes; sh++) {
    const n = 5 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) {
      metal(
        b,
        out,
        s + R() * 0.1,
        fs[Math.floor(R() * fs.length)] * rr(0.995, 1.005),
        [
          [1, 1, 0.42],
          [1.48, 0.45, 0.25],
          [2.13, 0.25, 0.14],
        ],
        rr(0.3, 1) * (1 - sh * 0.15),
        0,
      );
    }
    s += rr(0.2, 0.26);
  }
}

/** 문고리: the iron ring handle of a 한옥 door knocking against its plate. */
function ring(b: Bus, t: number, p: Place, f: number, vel: number) {
  metal(
    b,
    place(b, p),
    t,
    f,
    [
      [1, 1, 0.22],
      [2.4, 0.5, 0.12],
      [4.1, 0.25, 0.07],
    ],
    vel,
    0,
  );
}

// ───────────── wood · paper · fire ─────────────

/** Wood hit: a few decaying modes, a tick of noise and a low thud. `pitch` scales the modes (smaller wood = higher). */
function knock(b: Bus, t: number, p: Place, vel = 1, pitch = 1) {
  const { ctx } = b;
  const out = place(b, p);
  const modes: [number, number, number][] = [
    [190, 1, 0.05],
    [460, 0.7, 0.035],
    [980, 0.45, 0.025],
    [1720, 0.25, 0.018],
  ];
  for (const [f, a, tau] of modes) {
    const o = osc(ctx, "sine", f * pitch * rr(0.98, 1.02), t, t + tau * 8);
    const g = gainNode(ctx, 0);
    strike(g.gain, t, a * vel, 0.0015, tau);
    o.connect(g).connect(out);
  }
  const n = noiseSrc(ctx, "pink", t, t + 0.05);
  const ng = gainNode(ctx, 0);
  strike(ng.gain, t, 0.5 * vel, 0.001, 0.004);
  n.connect(filter(ctx, "bandpass", 1400 * pitch, 1.2))
    .connect(ng)
    .connect(out);
  const th = osc(ctx, "sine", 85, t, t + 0.35);
  th.frequency.exponentialRampToValueAtTime(55, t + 0.12);
  const tg = gainNode(ctx, 0);
  strike(tg.gain, t, 0.6 * vel, 0.002, 0.05);
  th.connect(tg).connect(out);
}

/** Old wood under strain: stick-slip clicks whose rate wanders, rung through a few wooden resonances. */
function creak(b: Bus, t: number, p: Place, dur = rr(0.5, 1.1)) {
  const { ctx } = b;
  const sr = ctx.sampleRate;
  const len = Math.ceil(dur * sr);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const r0 = rr(20, 28);
  const r1 = rr(42, 62);
  const r2 = rr(24, 34);
  let ph = 0;
  for (let s = 0; s < len; s++) {
    const x = s / len;
    const rate = x < 0.5 ? r0 + (r1 - r0) * x * 2 : r1 + (r2 - r1) * (x - 0.5) * 2;
    ph += (rate / sr) * (1 + (R() - 0.5) * 0.35);
    if (ph >= 1) {
      ph -= 1;
      const amp = Math.sin(Math.PI * x) * rr(0.55, 1);
      for (let k = 0; k < 48 && s + k < len; k++) d[s + k] += amp * Math.exp(-k / 7) * (k % 2 ? -1 : 1) * 0.5;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const out = place(b, p);
  for (const [f, q, g] of [
    [430, 9, 1],
    [1130, 8, 0.6],
    [2350, 6, 0.3],
  ] as const)
    src
      .connect(filter(ctx, "bandpass", f * rr(0.95, 1.05), q))
      .connect(gainNode(ctx, g))
      .connect(out);
  src.start(t);
}

/** 한옥 미닫이 sliding along its track: a low wooden rumble with a little track squeal and paper-lattice rattle. */
function slideDoor(b: Bus, t: number, dur: number, p: Place, shape: number[]) {
  const { ctx } = b;
  const out = place(b, p);
  const end = t + dur + 0.4;
  const g = gainNode(ctx, 0);
  g.connect(out);
  shape.forEach((v, i) => g.gain.linearRampToValueAtTime(v, t + (dur * i) / (shape.length - 1)));
  g.gain.setTargetAtTime(0, t + dur, 0.05);
  const n = noiseSrc(ctx, "brown", t, end);
  n.connect(filter(ctx, "bandpass", 210, 0.8))
    .connect(gainNode(ctx, 1))
    .connect(g);
  const n2 = noiseSrc(ctx, "pink", t, end);
  n2.connect(filter(ctx, "bandpass", 720, 2.4))
    .connect(gainNode(ctx, 0.32))
    .connect(g);
  // uneven pressure on the track
  const wob = noiseSrc(ctx, "brown", t, end);
  wob
    .connect(filter(ctx, "lowpass", 18))
    .connect(gainNode(ctx, 0.45))
    .connect(g.gain);
  for (let k = 0; k < 4; k++) crackle(b, t + rr(0.1, 0.9) * dur, { ...p, gain: p.gain * 0.18, far: (p.far ?? 0) + 0.1 }, 2600);
}

/** A candle crackle / wax tick. */
function crackle(b: Bus, t: number, p: Place, f = rr(1800, 4200)) {
  const { ctx } = b;
  const n = noiseSrc(ctx, "pink", t, t + 0.03);
  const g = gainNode(ctx, 0);
  strike(g.gain, t, rr(0.5, 1), 0.0006, 0.0018);
  n.connect(filter(ctx, "bandpass", f, 0.9))
    .connect(g)
    .connect(place(b, p));
}

/** Breath of air on a candle flame. */
function candlePuff(b: Bus, t: number, p: Place) {
  const { ctx } = b;
  const n = noiseSrc(ctx, "pink", t, t + 0.9);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + 0.08);
  g.gain.setTargetAtTime(0, t + 0.08, 0.13);
  n.connect(filter(ctx, "lowpass", 620, 0.3))
    .connect(g)
    .connect(place(b, p));
  crackle(b, t + rr(0.06, 0.2), { ...p, gain: p.gain * 0.5 });
}

/** 성냥: the scratch, the catch, then the flame breathing with a few crackles. */
function match(b: Bus, t: number, p: Place) {
  const { ctx } = b;
  const out = place(b, p);
  const n = noiseSrc(ctx, "pink", t, t + 0.3);
  const bp = filter(ctx, "bandpass", 4200, 0.7);
  bp.frequency.setValueAtTime(4200, t);
  bp.frequency.exponentialRampToValueAtTime(2000, t + 0.17);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0, t);
  for (let s = t; s < t + 0.16; s += rr(0.006, 0.014)) g.gain.linearRampToValueAtTime(rr(0.35, 1), s);
  g.gain.setTargetAtTime(0, t + 0.16, 0.02);
  n.connect(filter(ctx, "highpass", 1500))
    .connect(bp)
    .connect(g)
    .connect(out);
  const f = noiseSrc(ctx, "pink", t + 0.12, t + 1.6);
  const fg = gainNode(ctx, 0);
  fg.gain.setValueAtTime(0, t + 0.12);
  fg.gain.linearRampToValueAtTime(0.7, t + 0.17);
  fg.gain.setTargetAtTime(0.12, t + 0.2, 0.15);
  fg.gain.setTargetAtTime(0, t + 0.9, 0.2);
  f.connect(filter(ctx, "lowpass", 1300, 0.4))
    .connect(fg)
    .connect(out);
  for (let k = 0; k < 4; k++) crackle(b, t + rr(0.2, 1), { ...p, gain: p.gain * 0.45 });
}

/** 한지 한 장 넘기는 소리: a crinkle over a soft swoosh. */
function page(b: Bus, t: number, p: Place) {
  const { ctx } = b;
  const out = place(b, p);
  const dur = 0.22;
  const n = noiseSrc(ctx, "pink", t, t + 0.45);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0, t);
  for (let s = t; s < t + dur; ) {
    const v = rr(0.25, 1) * Math.sin((Math.PI * (s - t)) / dur);
    g.gain.linearRampToValueAtTime(v, s + 0.003);
    s += rr(0.009, 0.024);
    g.gain.linearRampToValueAtTime(v * 0.3, s);
  }
  g.gain.setTargetAtTime(0, t + dur, 0.03);
  n.connect(filter(ctx, "bandpass", 2700, 0.6))
    .connect(g)
    .connect(out);
  const w = noiseSrc(ctx, "brown", t, t + 0.5);
  const wg = gainNode(ctx, 0);
  wg.gain.setValueAtTime(0, t);
  wg.gain.linearRampToValueAtTime(0.8, t + 0.07);
  wg.gain.setTargetAtTime(0, t + 0.07, 0.07);
  w.connect(filter(ctx, "lowpass", 900, 0.4))
    .connect(wg)
    .connect(out);
}

/** A quick air swoosh; `up` sweeps the band upward (a card turned over) or downward (something set down). */
function swoosh(b: Bus, t: number, p: Place, dur: number, from: number, to: number) {
  const { ctx } = b;
  const n = noiseSrc(ctx, "pink", t, t + dur + 0.3);
  const bp = filter(ctx, "bandpass", from, 0.8);
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + dur * 0.45);
  g.gain.setTargetAtTime(0, t + dur * 0.45, dur * 0.25);
  n.connect(bp).connect(g).connect(place(b, p));
}

/** 북: a soft low drum, used as a slow heartbeat while the reading is drawn. */
function drum(b: Bus, t: number, p: Place, vel = 1) {
  const { ctx } = b;
  const out = place(b, { ...p, gain: p.gain * vel });
  const o = osc(ctx, "sine", 92, t, t + 1.4);
  o.frequency.exponentialRampToValueAtTime(52, t + 0.22);
  const g = gainNode(ctx, 0);
  strike(g.gain, t, 1, 0.004, 0.2);
  o.connect(g).connect(out);
  // the drum's body an octave up, so phone speakers (which drop everything under ~150 Hz) still hear the beat
  const o2 = osc(ctx, "sine", 160, t, t + 0.6);
  o2.frequency.exponentialRampToValueAtTime(115, t + 0.15);
  const g2 = gainNode(ctx, 0);
  strike(g2.gain, t, 0.35, 0.003, 0.07);
  o2.connect(g2).connect(out);
  const n = noiseSrc(ctx, "pink", t, t + 0.1);
  const ng = gainNode(ctx, 0);
  strike(ng.gain, t, 0.3, 0.002, 0.014);
  n.connect(filter(ctx, "lowpass", 500, 0.5))
    .connect(ng)
    .connect(out);
}

/** 냥신의 그르릉: brown noise pulsed ~25 times a second, louder and lower on the out-breath. */
function purr(b: Bus, t: number, dur: number, p: Place) {
  const { ctx } = b;
  const end = t + dur + 0.6;
  const n = noiseSrc(ctx, "brown", t, end);
  const lp = filter(ctx, "lowpass", 300, 0.7);
  const am = gainNode(ctx, 0.5);
  const lfo = osc(ctx, "sine", rr(23, 27), t, end);
  lfo.connect(gainNode(ctx, 0.5)).connect(am.gain);
  const br = gainNode(ctx, 0);
  br.gain.setValueAtTime(0, t);
  for (let s = t; s < t + dur; ) {
    const inhale = rr(0.7, 0.9);
    const exhale = rr(0.95, 1.2);
    br.gain.linearRampToValueAtTime(0.45, s + 0.15);
    lp.frequency.setTargetAtTime(420, s, 0.1);
    br.gain.linearRampToValueAtTime(0.4, s + inhale);
    br.gain.linearRampToValueAtTime(0.08, s + inhale + 0.06);
    br.gain.linearRampToValueAtTime(1, s + inhale + 0.2);
    lp.frequency.setTargetAtTime(260, s + inhale, 0.1);
    br.gain.linearRampToValueAtTime(0.85, s + inhale + exhale);
    br.gain.linearRampToValueAtTime(0.08, s + inhale + exhale + 0.06);
    s += inhale + exhale + 0.06;
  }
  br.gain.setTargetAtTime(0, t + dur, 0.15);
  n.connect(lp).connect(am).connect(br).connect(place(b, p));
}

/** Dry leaves stirred by the wind: sparse crinkle grains in a soft swell. */
function rustle(b: Bus, t: number, dur: number, p: Place) {
  const { ctx } = b;
  const n = noiseSrc(ctx, "pink", t, t + dur + 0.3);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0, t);
  for (let s = t; s < t + dur; ) {
    const v = rr(0.15, 1) * Math.sin((Math.PI * (s - t)) / dur);
    g.gain.linearRampToValueAtTime(v, s + 0.004);
    s += rr(0.015, 0.06);
    g.gain.linearRampToValueAtTime(v * 0.15, s);
  }
  g.gain.setTargetAtTime(0, t + dur, 0.05);
  n.connect(filter(ctx, "bandpass", rr(3000, 4200), 0.7))
    .connect(g)
    .connect(place(b, p));
}

/** A step on a wooden 마루: a soft low thud and a short give in the boards. */
function step(b: Bus, t: number, p: Place) {
  knock(b, t, p, 0.55, 0.42);
  creak(b, t + 0.02, { ...p, gain: p.gain * 0.5 }, rr(0.15, 0.22));
}

/** A slow pad chord: detuned triangles under a lowpass that breathes. */
function padChord(b: Bus, t: number, notes: number[], dur: number, level: number, bright: number) {
  const { ctx } = b;
  const f = place(b, { gain: level, far: 0.1, lp: bright, space: "hall", wet: 0.55 });
  const lfo = osc(ctx, "sine", rr(0.05, 0.09), t, t + dur + 0.2);
  lfo.connect(gainNode(ctx, bright * 0.25)).connect(f.frequency);
  const g = gainNode(ctx, 0);
  g.connect(f);
  const a = Math.min(5, dur * 0.3);
  const r = Math.min(6, dur * 0.35);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + a);
  g.gain.setValueAtTime(1, t + dur - r);
  g.gain.linearRampToValueAtTime(0, t + dur);
  notes.forEach((nf, i) => {
    for (const cents of [-6, 6]) {
      const o = osc(ctx, "triangle", nf * Math.pow(2, cents / 1200), t, t + dur + 0.1);
      o.connect(gainNode(ctx, (i === 0 ? 1 : 0.75) / notes.length)).connect(g);
    }
  });
}

// ───────────── scenes ─────────────

export interface Element {
  next: number;
  /** schedules one event at t; returns seconds until the next */
  fire: (t: number) => number;
}

const D2 = 73.42;
const F2 = 87.31;
const G2 = 98;
const A2 = 110;
const Bb1 = 58.27;
const C3 = 130.81;
const D3 = 146.83;
const E3 = 164.81;
const F3 = 174.61;
const G3 = 196;
const A3 = 220;
const Bb2 = 116.54;
const Bb3 = 233.08;
const C2 = 65.41;

/** Chords per scene: minor and slow outside, a little warmer inside, a held unresolved chord while waiting, lighter at the result. */
const PADS: Record<Scene, { chords: number[][]; level: number; bright: number; every: number }> = {
  gate: {
    chords: [
      [D2, A2, F3, A3],
      [Bb1, F2, D3, A3],
      [G2, D3, F3, Bb3],
      [A2, E3, G3, D3 * 2],
    ],
    level: 0.022,
    bright: 650,
    every: 13,
  },
  inside: {
    chords: [
      [D2, D3, F3, A3],
      [Bb1, Bb2, D3, F3],
      [G2, D3, F3, Bb3],
      [A2, E3, G3, C3 * 2],
    ],
    level: 0.021,
    bright: 800,
    every: 14,
  },
  loading: {
    chords: [
      [D2, A2, E3, F3],
      [D2, A2, D3, E3],
    ],
    level: 0.024,
    bright: 900,
    every: 9,
  },
  result: {
    chords: [
      [F2, C3, F3, A3],
      [C2, G2, E3, G3],
      [D2, A2, F3, A3],
      [Bb1, F2, D3, F3],
    ],
    level: 0.02,
    bright: 1000,
    every: 14,
  },
};

const every = (first: number, gap: () => number, fn: (t: number) => number | void): Element => ({
  next: first,
  fire: (t) => {
    const took = fn(t) ?? 0;
    return took + gap();
  },
});

/** A cricket that keeps its own pitch, place and rhythm, and pauses now and then. */
function cricketAgent(b: Bus, t0: number, p: Place): Element {
  const f = rr(4300, 4900);
  const period = rr(0.65, 1.3);
  const dry = { ...p, wet: 0.05 + (p.far ?? 0) * 0.06 };
  return { next: t0 + rr(0, 2), fire: (t) => (cricket(b, t, f, dry), R() < 0.08 ? rr(2.5, 7) : period * rr(0.9, 1.1)) };
}

/** A continuous bed of air: brown noise under a low lowpass, its level drifting slowly. */
function airBed(b: Bus, t0: number, p: Place, lp: number): { stop: (t: number) => void; swell: Element } {
  const { ctx } = b;
  const beds = [-0.6, 0.6].map((pan) => {
    const s = noiseSrc(ctx, "brown", t0, t0 + 3600);
    const g = gainNode(ctx, 0);
    s.connect(filter(ctx, "lowpass", lp, 0.3))
      .connect(g)
      .connect(place(b, { ...p, pan }));
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.6, t0 + 3);
    return { s, g };
  });
  return {
    stop: (t) => beds.forEach(({ s }) => s.stop(t)),
    swell: every(
      t0 + 3,
      () => rr(3, 7),
      (t) => beds.forEach(({ g }) => g.gain.setTargetAtTime(rr(0.35, 1), t, rr(1.2, 2.5))),
    ),
  };
}

/** A wind gust through the eaves: a band of pink noise rising and falling. */
function gust(b: Bus, t: number, p: Place) {
  const { ctx } = b;
  const dur = rr(3.5, 6);
  const n = noiseSrc(ctx, "pink", t, t + dur + 1);
  const bp = filter(ctx, "bandpass", 260, 1.6);
  const top = rr(480, 720);
  bp.frequency.setValueAtTime(260, t);
  bp.frequency.linearRampToValueAtTime(top, t + dur * 0.45);
  bp.frequency.linearRampToValueAtTime(300, t + dur);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + dur * 0.45);
  g.gain.linearRampToValueAtTime(0, t + dur);
  n.connect(bp).connect(g).connect(place(b, p));
  return dur;
}

/**
 * Everything one scene plays, starting at t0: elements fire on their own clocks; `stop` ends the continuous beds.
 */
export function sceneElements(b: Bus, scene: Scene, t0: number): { els: Element[]; stop: (t: number) => void } {
  const els: Element[] = [];
  const stops: ((t: number) => void)[] = [];
  const pad = PADS[scene];
  let ci = 0;
  els.push(
    // Each chord holds for `every` seconds and crossfades into the next over ~5 s.
    every(
      t0 + 0.5,
      () => pad.every,
      (t) => {
        padChord(b, t, pad.chords[ci++ % pad.chords.length], pad.every + 5, pad.level, pad.bright);
      },
    ),
  );

  if (scene === "gate") {
    const air = airBed(b, t0, { gain: 0.032, far: 0.3 }, 320);
    stops.push(air.stop);
    els.push(air.swell);
    const bellF = rr(1700, 2050);
    const bellAt: Place = { gain: 0.03, pan: 0.45, far: 0.5 };
    // A gust rustles the dry leaves and, at its height, often rings the 풍경.
    els.push(
      every(
        t0 + rr(6, 10),
        () => rr(12, 24),
        (t) => {
          const pan = rr(-0.7, 0.7);
          const dur = gust(b, t, { gain: 0.045, pan, far: 0.45 });
          rustle(b, t + dur * 0.25, dur * 0.4, { gain: 0.035, pan, far: 0.5 });
          if (R() < 0.6) windBell(b, t + dur * rr(0.35, 0.55), bellF, bellAt);
          return dur;
        },
      ),
    );
    // far insects behind the near ones
    for (let k = 0; k < 4; k++) els.push(cricketAgent(b, t0, { gain: 0.006, pan: rr(-1, 1), far: 0.95 }));
    for (const [pan, far, gain] of [
      [-0.7, 0.45, 0.016],
      [0.55, 0.6, 0.013],
      [-0.2, 0.85, 0.011],
      [0.85, 0.75, 0.01],
    ] as const)
      els.push(cricketAgent(b, t0, { gain, pan, far }));
    const owlF = rr(1120, 1260);
    const owlPan = rr(-0.8, 0.8);
    els.push(
      every(
        t0 + rr(4, 8),
        () => rr(22, 40),
        (t) => {
          const n = 4 + Math.floor(R() * 6);
          // Sometimes a second bird answers from the other side, a little lower, in the gaps.
          const answer = R() < 0.4;
          let s = t;
          for (let k = 0; k < n; k++) {
            scopsOwl(b, s, owlF, { gain: 0.05, pan: owlPan, far: 0.62 });
            if (answer && k > 0 && k < n - 1) scopsOwl(b, s + rr(0.9, 1.1), owlF * 0.94, { gain: 0.032, pan: -owlPan * 0.8, far: 0.8 });
            s += rr(1.8, 2.3);
          }
          return s - t;
        },
      ),
    );
    els.push(
      every(
        t0 + rr(26, 36),
        () => rr(70, 120),
        (t) => {
          const n = 2 + Math.floor(R() * 3);
          const f = rr(300, 340);
          const pan = rr(-0.9, 0.9);
          let s = t;
          for (let k = 0; k < n; k++) {
            hoot(b, s, f, { gain: 0.05, pan, far: 0.62 });
            s += rr(7, 10);
          }
          // …and another owl replies from far away.
          if (R() < 0.35) {
            hoot(b, s - rr(3, 4.5), f * 0.92, { gain: 0.036, pan: -pan, far: 0.85 });
            s += 2;
          }
          return s - t;
        },
      ),
    );
    els.push(
      every(
        t0 + rr(48, 64),
        () => rr(100, 160),
        (t) => {
          const n = 5 + Math.floor(R() * 5);
          const f = rr(640, 700);
          const pan = rr(-0.9, 0.9);
          let s = t;
          for (let k = 0; k < n; k++) {
            cuckoo(b, s, f, { gain: 0.03, pan, far: 0.88 });
            s += rr(0.95, 1.15);
          }
          return s - t;
        },
      ),
    );
    els.push(
      every(
        t0 + rr(10, 16),
        () => rr(30, 55),
        (t) => windBell(b, t, bellF, bellAt),
      ),
    );
    els.push(
      every(
        t0 + rr(12, 20),
        () => rr(26, 48),
        (t) => phrase(b, t, PHRASES.dark[Math.floor(R() * PHRASES.dark.length)], { gain: 0.11, pan: rr(-0.25, 0.25), far: 0.35 }),
      ),
    );
  } else {
    // Inside the room: still air, candles, the night outside heard through paper doors.
    const room = airBed(b, t0, { gain: 0.02, far: 0.1, space: "room" }, 160);
    stops.push(room.stop);
    els.push(room.swell);
    const rate = scene === "loading" ? 0.7 : 1.1;
    els.push({ next: t0 + 1, fire: (t) => (crackle(b, t, { gain: 0.03, pan: rr(-0.35, 0.35), far: 0.25, space: "room" }), -Math.log(1 - R()) / rate) });
    for (const [pan, gain] of [
      [-0.7, 0.012],
      [0.6, 0.009],
    ] as const)
      els.push(cricketAgent(b, t0, { gain, pan, far: 1, lp: 1700 }));
    const owlF = rr(1120, 1260);
    if (scene !== "loading")
      els.push(
        every(
          t0 + rr(15, 25),
          () => rr(40, 70),
          (t) => {
            const n = 3 + Math.floor(R() * 4);
            let s = t;
            for (let k = 0; k < n; k++) {
              scopsOwl(b, s, owlF, { gain: 0.03, pan: -0.6, far: 1, lp: 1900 });
              s += rr(1.8, 2.3);
            }
            return s - t;
          },
        ),
      );
    if (scene === "inside") {
      els.push(
        every(
          t0 + rr(10, 16),
          () => rr(35, 60),
          (t) => bowl(b, t, { gain: 0.05, pan: rr(-0.3, 0.3), far: 0.3, space: "room" }),
        ),
      );
      els.push(
        every(
          t0 + rr(30, 45),
          () => rr(55, 110),
          (t) => creak(b, t, { gain: 0.05, pan: rr(-0.8, 0.8), far: 0.55, space: "room" }),
        ),
      );
      els.push(
        every(
          t0 + rr(18, 28),
          () => rr(34, 58),
          (t) => phrase(b, t, PHRASES.dark[Math.floor(R() * PHRASES.dark.length)], { gain: 0.1, pan: rr(-0.3, 0.3), far: 0.2, space: "room", wet: 0.3 }),
        ),
      );
      // 냥신 settles beside you now and then.
      els.push(
        every(
          t0 + rr(40, 60),
          () => rr(70, 120),
          (t) => {
            const d = rr(4, 6.5);
            purr(b, t, d, { gain: 0.05, pan: rr(-0.4, 0.4), far: 0.15, space: "room" });
            return d;
          },
        ),
      );
    }
    if (scene === "loading") {
      // The heartbeat quickens a little with every beat while the reading is drawn.
      let beat = 1.5;
      els.push({
        next: t0 + 0.4,
        fire: (t) => {
          drum(b, t, { gain: 0.085, far: 0.2, space: "room" });
          drum(b, t + beat * 0.2, { gain: 0.085, far: 0.2, space: "room" }, 0.55);
          beat = Math.max(0.95, beat * 0.93);
          return beat;
        },
      });
      // 냥신 concentrating
      els.push({ next: t0 + 0.6, fire: (t) => (purr(b, t, 14, { gain: 0.04, pan: 0.2, far: 0.2, space: "room" }), 999) });
    }
    if (scene === "result") {
      const bellF = rr(1700, 2050);
      els.push(
        every(
          t0 + rr(12, 20),
          () => rr(22, 40),
          (t) => windBell(b, t, bellF, { gain: 0.02, pan: 0.6, far: 0.85, lp: 3200 }),
        ),
      );
      els.push(
        every(
          t0 + rr(25, 35),
          () => rr(45, 75),
          (t) => bowl(b, t, { gain: 0.04, pan: rr(-0.3, 0.3), far: 0.3, space: "room" }),
        ),
      );
      els.push(
        every(
          t0 + rr(9, 14),
          () => rr(24, 42),
          (t) => phrase(b, t, PHRASES.light[Math.floor(R() * PHRASES.light.length)], { gain: 0.09, pan: rr(-0.3, 0.3), far: 0.25, space: "room", wet: 0.35 }),
        ),
      );
    }
  }
  return { els, stop: (t) => stops.forEach((s) => s(t)) };
}

// ───────────── effects ─────────────

/** One effect at time t. Door timings follow the CSS: closing 0.5 s; opening 1.25 s. */
export function playSfx(b: Bus, name: Sfx, t: number) {
  const near: Place = { gain: 1, far: 0.08, space: "room" };
  switch (name) {
    case "doorClose":
      creak(b, t, { ...near, gain: 0.08 }, 0.32);
      slideDoor(b, t, 0.5, { ...near, gain: 0.22, pan: -0.25 }, [0, 0.55, 1, 0.5, 0.08]);
      slideDoor(b, t + 0.01, 0.49, { ...near, gain: 0.2, pan: 0.25 }, [0, 0.5, 0.95, 0.45, 0.08]);
      knock(b, t + 0.49, { ...near, gain: 0.08 }, 1);
      knock(b, t + 0.515, { ...near, gain: 0.08, pan: 0.15 }, 0.4, 1.12);
      ring(b, t + 0.5, { ...near, gain: 0.05, pan: -0.15 }, 2150, 0.7);
      ring(b, t + 0.535, { ...near, gain: 0.05, pan: 0.15 }, 2330, 0.45);
      break;
    case "doorOpen":
      slideDoor(b, t, 1.25, { ...near, gain: 0.16, pan: -0.45 }, [0, 0.25, 1, 0.45, 0]);
      slideDoor(b, t + 0.02, 1.23, { ...near, gain: 0.15, pan: 0.45 }, [0, 0.22, 0.95, 0.4, 0]);
      ring(b, t + 0.05, { ...near, gain: 0.035, pan: -0.2 }, 2150, 0.35);
      knock(b, t + 1.24, { ...near, gain: 0.06, pan: -0.5 }, 0.5, 0.9);
      knock(b, t + 1.26, { ...near, gain: 0.06, pan: 0.5 }, 0.45, 0.95);
      // and you step in
      step(b, t + 1.55, { ...near, gain: 0.1, pan: -0.1, far: 0.15 });
      step(b, t + 2.2, { ...near, gain: 0.085, pan: 0.1, far: 0.15 });
      break;
    case "candle":
      candlePuff(b, t, { ...near, gain: 0.16, pan: rr(-0.2, 0.2) });
      break;
    case "match":
      match(b, t, { ...near, gain: 0.2 });
      break;
    case "bells":
      bells(b, t, { ...near, gain: 0.05, far: 0.2 });
      break;
    case "page":
      page(b, t, { ...near, gain: 0.24 });
      break;
    case "flip":
      swoosh(b, t, { ...near, gain: 0.08 }, 0.14, 900, 3000);
      knock(b, t + 0.15, { ...near, gain: 0.08 }, 0.5, 2.2);
      bowl(b, t + 0.28, { ...near, gain: 0.035, far: 0.25 }, rr(230, 260));
      break;
    case "slide":
      swoosh(b, t, { ...near, gain: 0.3 }, 0.2, 1800, 700);
      break;
    case "stamp":
      knock(b, t, { ...near, gain: 0.07 }, 1, 0.62);
      swoosh(b, t - 0.004, { ...near, gain: 0.05 }, 0.03, 1600, 900);
      break;
    case "tap":
      knock(b, t, { ...near, gain: 0.06 }, 0.6, 2.4);
      break;
    case "bowl":
      bowl(b, t, { ...near, gain: 0.06, far: 0.2 });
      break;
    case "unlock":
      bells(b, t, { ...near, gain: 0.045, far: 0.2 }, 2);
      bowl(b, t + 0.35, { ...near, gain: 0.06, far: 0.2 });
      break;
    case "pung":
      windBell(b, t, rr(1750, 1950), { gain: 0.04, pan: 0.3, far: 0.35 });
      break;
    case "reveal":
      // the reading lands: a deep bowl, one soft shake of 방울, and the 가야금's low D ringing with 농현
      bowl(b, t, { ...near, gain: 0.06, far: 0.25 }, D3n);
      bells(b, t + 0.05, { ...near, gain: 0.03, far: 0.3 }, 1);
      pluck(b, t + 0.6, D3n, { ...near, gain: 0.12, far: 0.25, wet: 0.35 }, "long");
      break;
  }
}
