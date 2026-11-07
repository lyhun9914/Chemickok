"use client";

import { type Bus, type Element, type Scene, type Sfx, createMix, playSfx, sceneElements, warmNoiseJobs } from "./soundKit";

/**
 * 점집 소리, live. The sounds themselves live in soundKit (also used for offline listening tests); this file runs them:
 * one ambience layer per screen, crossfaded on change, scheduled a couple of seconds ahead; effects on demand.
 *
 *   gate     night outside the gate: crickets, a 소쩍새, now and then a 부엉이 or a far 뻐꾸기, a 풍경, a dark pad
 *   inside   the room: still air, candle ticks, the night through paper doors, a singing bowl, an old board creaking
 *   loading  the room and a slow 북 heartbeat over a held chord
 *   result   the room, lighter, a 풍경 outside
 *
 * Browsers only allow sound after a tap, so nothing plays until then. The on/off choice is remembered.
 */
export type Ambience = Scene;
export type { Sfx };

const KEY = "nyang-sound-v1";
const EVENT = "nyang:sound";
const LEVEL = 0.8;
const AHEAD = 2.5; // seconds scheduled ahead
const TICK_MS = 700;
/** Effects loud or meaningful enough that the background should make room. */
const DUCK = new Set<Sfx>(["match", "bells", "flip", "unlock", "reveal", "stamp"]);

class Layer {
  private els: Element[] = [];
  private stopBeds: (t: number) => void = () => {};
  private dry: GainNode;
  private hallSend: GainNode;
  private roomSend: GainNode;
  private muffler: BiquadFilterNode;
  private ducker: GainNode;

  constructor(
    private ctx: AudioContext,
    master: AudioNode,
    hall: AudioNode,
    room: AudioNode,
  ) {
    this.muffler = ctx.createBiquadFilter();
    this.muffler.type = "lowpass";
    this.muffler.frequency.value = 18000;
    this.dry = ctx.createGain();
    this.hallSend = ctx.createGain();
    this.roomSend = ctx.createGain();
    const t = ctx.currentTime;
    for (const g of [this.dry, this.hallSend, this.roomSend]) {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + 2.5);
    }
    this.ducker = ctx.createGain();
    this.muffler.connect(this.ducker).connect(this.dry).connect(master);
    this.hallSend.connect(hall);
    this.roomSend.connect(room);
  }

  start(scene: Scene) {
    const bus: Bus = { ctx: this.ctx, dry: this.muffler, hall: this.hallSend, room: this.roomSend };
    const s = sceneElements(bus, scene, this.ctx.currentTime + 0.1);
    this.els = s.els;
    this.stopBeds = s.stop;
    this.plan();
  }

  /** Schedule everything due in the next few seconds. After a pause (hidden tab) skip the backlog instead of bursting. */
  plan() {
    const now = this.ctx.currentTime;
    for (const el of this.els) {
      if (el.next < now - 1) el.next = now + Math.random() * 2;
      while (el.next < now + AHEAD) el.next += Math.max(0.05, el.fire(el.next));
    }
  }

  /** Make room for an effect: the background dips ~4 dB and comes back over a second, like a mixer riding a fader. */
  duck() {
    const g = this.ducker.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.62, t + 0.06);
    g.setTargetAtTime(1, t + 0.5, 0.45);
  }

  /** The doors slid shut: the outside goes dull and far. */
  muffle() {
    const t = this.ctx.currentTime;
    this.muffler.frequency.setTargetAtTime(520, t + 0.15, 0.12);
    this.hallSend.gain.setTargetAtTime(0.25, t + 0.15, 0.15);
  }

  fadeOut() {
    const t = this.ctx.currentTime;
    for (const g of [this.dry, this.hallSend, this.roomSend]) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 2);
    }
    this.els = [];
    this.stopBeds(t + 2.2);
    window.setTimeout(() => {
      this.dry.disconnect();
      this.hallSend.disconnect();
      this.roomSend.disconnect();
    }, 3500);
  }
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private hall!: ConvolverNode;
  private room!: ConvolverNode;
  private sfx!: Bus;
  private scene: Scene = "gate";
  private layer: Layer | null = null;
  /** the mix is built (reverbs, noise beds): until then nothing plays */
  private built = false;
  enabled = true;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      this.enabled = localStorage.getItem(KEY) !== "off";
    } catch {
      /* private mode */
    }
    // iOS counts a tap as permission only on touchend / click, not on touch-down: listen to all of them until it runs.
    const wake = () => this.unlock();
    for (const ev of ["pointerdown", "pointerup", "touchend", "click", "keydown"]) window.addEventListener(ev, wake, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else if (this.enabled)
        this.ctx
          .resume()
          .then(() => this.layer?.plan())
          .catch(() => {});
    });
    // The scenery already announces these moments; sound follows them.
    window.addEventListener("nyang:door", () => this.door());
    window.addEventListener("nyang:flare", () => this.play("candle"));
  }

  private unlock() {
    if (!this.enabled) return;
    if (this.ctx) {
      if (this.ctx.state !== "running" && !document.hidden) this.ctx.resume().catch(() => {});
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    // Only the context is made inside the touch (browsers want that). Filling the mix's buffers took ~0.1 s in one go,
    // and the first touch on a page is usually the start of a scroll: on phones that froze the scroll as it began.
    const ctx = new Ctx();
    this.ctx = ctx;
    ctx.resume().catch(() => {});
    // The nodes are cheap; the buffers they play (two reverbs, 8 s of noise) are filled one channel per idle moment.
    const jobs: (() => void)[] = [];
    const mix = createMix(ctx, ctx.destination, 0, jobs);
    this.master = mix.master;
    this.hall = mix.hall;
    this.room = mix.room;
    const sfxGain = ctx.createGain();
    sfxGain.connect(this.master);
    this.sfx = { ctx, dry: sfxGain, hall: this.hall, room: this.room };
    jobs.push(...warmNoiseJobs(ctx), () => {
      this.built = true;
      this.master.gain.setValueAtTime(0, ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(this.enabled ? LEVEL : 0, ctx.currentTime + 1.5);
      this.startLayer();
      window.setInterval(() => this.ctx?.state === "running" && this.layer?.plan(), TICK_MS);
    });
    const next = () => {
      jobs.shift()?.();
      if (jobs.length) idle(next);
    };
    idle(next);
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
      else if (this.built) {
        this.ctx.resume().catch(() => {});
        this.master.gain.setTargetAtTime(LEVEL, this.ctx.currentTime, 0.3);
      }
      this.play("pung");
    } else if (this.ctx && this.built) {
      const ctx = this.ctx;
      this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      // Fully asleep once faded, so a muted page costs no battery.
      window.setTimeout(() => !this.enabled && ctx.suspend().catch(() => {}), 900);
    }
    window.dispatchEvent(new Event(EVENT));
  }

  setScene(scene: Scene) {
    if (scene === this.scene && this.layer) return;
    const from = this.scene;
    this.scene = scene;
    if (!this.built) return;
    this.startLayer();
    // The reading has been drawn: mark the moment it lands.
    if (from === "loading" && scene === "result") this.play("reveal");
  }

  private startLayer() {
    this.layer?.fadeOut();
    this.layer = new Layer(this.ctx!, this.master, this.hall, this.room);
    this.layer.start(this.scene);
  }

  /** 한옥 미닫이: shut (0.5 s, matching the CSS), the outside muffled, then open again as the room comes up. */
  private door() {
    if (!this.ready()) return;
    const t = this.ctx!.currentTime + 0.02;
    this.layer?.duck();
    playSfx(this.sfx, "doorClose", t);
    playSfx(this.sfx, "doorOpen", t + 0.84);
    this.layer?.muffle();
  }

  private ready() {
    if (!this.ctx || !this.built || !this.enabled || document.hidden) return false;
    // Safari may still be waking the context from the first tap; sounds scheduled now play as soon as it does.
    if (this.ctx.state !== "running") this.ctx.resume().catch(() => {});
    return true;
  }

  play(name: Sfx) {
    if (!this.ready()) return;
    if (DUCK.has(name)) this.layer?.duck();
    playSfx(this.sfx, name, this.ctx!.currentTime + 0.01);
  }

  /** For the toggle button: re-render on change. */
  subscribe(fn: () => void) {
    window.addEventListener(EVENT, fn);
    return () => window.removeEventListener(EVENT, fn);
  }
}

/** Runs `f` when the page is idle (a scroll or a tap in progress comes first). */
const idle = (f: () => void) => {
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => f(), { timeout: 1200 });
  else setTimeout(f, 120); // Safari
};

let engine: SoundEngine | null = null;
/** The one sound engine (client only). */
export function sound(): SoundEngine {
  engine ??= new SoundEngine();
  return engine;
}
