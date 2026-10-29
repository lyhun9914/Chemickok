"use client";

import { type Bus, type Element, type Scene, type Sfx, createMix, playSfx, sceneElements } from "./soundKit";

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

class Layer {
  private els: Element[] = [];
  private stopBeds: (t: number) => void = () => {};
  private dry: GainNode;
  private hallSend: GainNode;
  private roomSend: GainNode;
  private muffler: BiquadFilterNode;

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
    this.muffler.connect(this.dry).connect(master);
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
    const ctx = new Ctx();
    this.ctx = ctx;
    const mix = createMix(ctx, ctx.destination, 0);
    this.master = mix.master;
    this.hall = mix.hall;
    this.room = mix.room;
    const sfxGain = ctx.createGain();
    sfxGain.connect(this.master);
    this.sfx = { ctx, dry: sfxGain, hall: this.hall, room: this.room };
    this.master.gain.setValueAtTime(0, ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(LEVEL, ctx.currentTime + 1.5);
    this.startLayer();
    window.setInterval(() => this.ctx?.state === "running" && this.layer?.plan(), TICK_MS);
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
        this.master.gain.setTargetAtTime(LEVEL, this.ctx.currentTime, 0.3);
      }
      this.play("pung");
    } else if (this.ctx) {
      const ctx = this.ctx;
      this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      // Fully asleep once faded, so a muted page costs no battery.
      window.setTimeout(() => !this.enabled && ctx.suspend().catch(() => {}), 900);
    }
    window.dispatchEvent(new Event(EVENT));
  }

  setScene(scene: Scene) {
    if (scene === this.scene && this.layer) return;
    this.scene = scene;
    if (this.ctx) this.startLayer();
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
    playSfx(this.sfx, "doorClose", t);
    playSfx(this.sfx, "doorOpen", t + 0.84);
    this.layer?.muffle();
  }

  private ready() {
    if (!this.ctx || !this.enabled || document.hidden) return false;
    // Safari may still be waking the context from the first tap; sounds scheduled now play as soon as it does.
    if (this.ctx.state !== "running") this.ctx.resume().catch(() => {});
    return true;
  }

  play(name: Sfx) {
    if (!this.ready()) return;
    playSfx(this.sfx, name, this.ctx!.currentTime + 0.01);
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
