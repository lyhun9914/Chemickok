"use client";

/**
 * 점집 소리: a quiet room tone under the page and a few soft effects, all synthesized with Web Audio (no files).
 * Browsers only allow sound after the first tap, so nothing plays until then. The on/off choice is remembered.
 *
 *   gate     night wind at the gate, a far wind chime now and then
 *   inside   a low warm drone, a singing bowl every so often
 *   loading  the drone and a slow heartbeat while the reading is drawn
 *   result   the inside room, a touch brighter
 */
export type Ambience = "gate" | "inside" | "loading" | "result";
export type Sfx = "door" | "flare" | "reveal" | "stamp" | "chime" | "tap";

const KEY = "nyang-sound-v1";
const EVENT = "nyang:sound";

const PENTA_HIGH = [1318.5, 1568, 1760, 2093, 2349.3];
const BOWLS = [196, 220, 261.6, 293.7];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private noise!: AudioBuffer;
  private scene: Ambience = "gate";
  private layer: { out: GainNode; stop: () => void } | null = null;
  private timers: number[] = [];
  enabled = true;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      this.enabled = localStorage.getItem(KEY) !== "off";
    } catch {
      /* private mode */
    }
    const unlock = () => {
      this.unlock();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else if (this.enabled) this.ctx.resume().catch(() => {});
    });
    // The scenery already announces these moments; sound follows them.
    window.addEventListener("nyang:door", () => this.play("door"));
    window.addEventListener("nyang:flare", () => this.play("flare"));
  }

  private unlock() {
    if (this.ctx) {
      if (this.enabled) this.ctx.resume().catch(() => {});
      return;
    }
    if (!this.enabled) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.music = ctx.createGain();
    this.music.gain.value = 0.9;
    this.music.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 1;
    this.sfx.connect(this.master);
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 1.5);
    this.startLayer(this.scene);
  }

  /** On/off, remembered on this device. */
  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem(KEY, this.enabled ? "on" : "off");
    } catch {
      /* ignore */
    }
    if (this.enabled) {
      if (!this.ctx) this.unlock();
      else {
        this.ctx.resume().catch(() => {});
        this.master.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.3);
      }
    } else if (this.ctx) {
      const ctx = this.ctx;
      this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      // Fully asleep once faded, so a muted page costs no battery.
      window.setTimeout(() => !this.enabled && ctx.suspend().catch(() => {}), 900);
    }
    window.dispatchEvent(new Event(EVENT));
  }

  setScene(scene: Ambience) {
    if (scene === this.scene && this.layer) return;
    this.scene = scene;
    if (this.ctx) this.startLayer(scene);
  }

  private startLayer(scene: Ambience) {
    const ctx = this.ctx!;
    const old = this.layer;
    if (old) {
      old.out.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
      window.setTimeout(old.stop, 3000);
    }
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, ctx.currentTime + 0.2, 1.2);
    out.connect(this.music);
    const nodes: AudioScheduledSourceNode[] = [];

    // Low drone: two sines a fifth apart, softened.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = scene === "result" ? 640 : scene === "gate" ? 320 : 460;
    const drone = ctx.createGain();
    drone.gain.value = scene === "gate" ? 0.022 : 0.035;
    lp.connect(drone).connect(out);
    for (const [f, type] of [
      [55, "sine"],
      [82.4, "sine"],
      [110.3, "triangle"],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = type === "triangle" ? 0.35 : 1;
      o.connect(g).connect(lp);
      o.start();
      nodes.push(o);
    }
    // Slow breathing on the drone.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = drone.gain.value * 0.4;
    lfo.connect(lfoGain).connect(drone.gain);
    lfo.start();
    nodes.push(lfo);

    // Wind: filtered noise that wanders.
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = scene === "gate" ? 420 : 260;
    bp.Q.value = 0.7;
    const windGain = ctx.createGain();
    windGain.gain.value = scene === "gate" ? 0.05 : 0.018;
    wind.connect(bp).connect(windGain).connect(out);
    const wl = ctx.createOscillator();
    wl.frequency.value = 0.05;
    const wlg = ctx.createGain();
    wlg.gain.value = 160;
    wl.connect(wlg).connect(bp.frequency);
    wind.start();
    wl.start();
    nodes.push(wind, wl);

    // Occasional voices of the room.
    const every = (min: number, max: number, fn: () => void) => {
      const next = () => {
        const t = window.setTimeout(
          () => {
            if (this.scene === scene && this.enabled) fn();
            next();
          },
          (min + Math.random() * (max - min)) * 1000,
        );
        this.timers.push(t);
      };
      next();
    };
    if (scene === "gate") every(9, 17, () => this.windChime(out));
    else every(scene === "result" ? 12 : 15, scene === "result" ? 20 : 26, () => this.bowl(out, BOWLS[Math.floor(Math.random() * BOWLS.length)], 0.028));
    if (scene === "loading") {
      const beat = () => {
        this.thump(out, 0.075, 0);
        this.thump(out, 0.045, 0.24);
      };
      beat();
      const id = window.setInterval(beat, 1150);
      this.timers.push(id as unknown as number);
      const origStop = () => window.clearInterval(id);
      nodes.push({ stop: origStop } as unknown as AudioScheduledSourceNode);
    }

    this.layer = {
      out,
      stop: () => {
        nodes.forEach((n) => {
          try {
            n.stop();
          } catch {
            /* already stopped */
          }
        });
        out.disconnect();
      },
    };
  }

  private windChime(dest: AudioNode) {
    const ctx = this.ctx!;
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = ctx.currentTime + i * (0.12 + Math.random() * 0.25);
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = PENTA_HIGH[Math.floor(Math.random() * PENTA_HIGH.length)];
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.012, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      o.connect(g).connect(dest);
      o.start(t);
      o.stop(t + 2.5);
    }
  }

  /** A struck singing bowl: a few inharmonic partials with a long tail. */
  private bowl(dest: AudioNode, f: number, level: number, length = 7) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    [
      [1, 1],
      [2.76, 0.45],
      [5.4, 0.2],
      [8.9, 0.08],
    ].forEach(([ratio, amp]) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(level * amp, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + length / ratio ** 0.4);
      o.connect(g).connect(dest);
      o.start(t);
      o.stop(t + length);
    });
  }

  private thump(dest: AudioNode, level: number, delay: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.25);
  }

  private noiseBurst(dest: AudioNode, opts: { type: BiquadFilterType; from: number; to?: number; q?: number; level: number; length: number; delay?: number }) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = opts.type;
    f.frequency.setValueAtTime(opts.from, t);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + opts.length);
    f.Q.value = opts.q ?? 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(opts.level, t + Math.min(0.03, opts.length / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.length);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random());
    src.stop(t + opts.length + 0.05);
  }

  play(name: Sfx) {
    if (!this.ctx || !this.enabled || document.hidden) return;
    const ctx = this.ctx;
    // Safari may still be waking the context from the first tap; sounds scheduled now play as soon as it does.
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    const out = this.sfx;
    switch (name) {
      case "door": {
        // A wooden door: a short creak, then the leaves meeting.
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(95, t);
        o.frequency.linearRampToValueAtTime(130, t + 0.45);
        const wob = ctx.createOscillator();
        wob.frequency.value = 14;
        const wg = ctx.createGain();
        wg.gain.value = 18;
        wob.connect(wg).connect(o.frequency);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 700;
        bp.Q.value = 6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.03, t + 0.1);
        g.gain.linearRampToValueAtTime(0, t + 0.5);
        o.connect(bp).connect(g).connect(out);
        o.start(t);
        wob.start(t);
        o.stop(t + 0.55);
        wob.stop(t + 0.55);
        this.thump(out, 0.13, 0.5);
        this.noiseBurst(out, { type: "lowpass", from: 380, level: 0.05, length: 0.18, delay: 0.5 });
        break;
      }
      case "flare":
        this.noiseBurst(out, { type: "bandpass", from: 420, to: 1500, q: 0.9, level: 0.022, length: 0.32 });
        break;
      case "reveal":
        this.noiseBurst(out, { type: "bandpass", from: 2800, to: 3600, q: 0.7, level: 0.018, length: 0.14 });
        break;
      case "tap": {
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(880, t);
        o.frequency.exponentialRampToValueAtTime(520, t + 0.05);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.03, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.1);
        break;
      }
      case "stamp":
        this.thump(out, 0.14, 0);
        this.noiseBurst(out, { type: "lowpass", from: 900, level: 0.04, length: 0.12 });
        break;
      case "chime":
        this.bowl(out, 523.3, 0.035, 4);
        this.bowl(out, 784, 0.018, 3.5);
        break;
    }
  }

  /** For the toggle button: re-render on change. */
  subscribe(fn: () => void) {
    window.addEventListener(EVENT, fn);
    return () => window.removeEventListener(EVENT, fn);
  }
}

let engine: SoundEngine | null = null;
/** The one sound engine (client only). */
export function sound(): SoundEngine {
  engine ??= new SoundEngine();
  return engine;
}
