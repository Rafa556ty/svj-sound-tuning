// Aventador SVJ engine built from the real SVJ recording (aventador_SVJ.mp3):
//  - a pitch-flattened, seamless full-throttle loop with NO gear changes baked in,
//    pitched by the game's rpm (so gears are heard only when the game shifts)
//  - the real upshift slice played exactly at each in-game upshift
//  - the real lift-off (overrun crackle) slice when the throttle is released
//  - the real engine-braking slice when the brake is pressed, rev-match blips on downshift
//  - the real off-throttle burble loop while coasting
import { GEAR_TOP, REDLINE } from "./gearbox";
import pull from "@/assets/sounds/svj-pull.wav.asset.json";
import overrun from "@/assets/sounds/svj-overrun.wav.asset.json";
import shift from "@/assets/sounds/svj-shift.wav.asset.json";
import lift from "@/assets/sounds/svj-lift.wav.asset.json";
import brake from "@/assets/sounds/svj-brake.wav.asset.json";
import blip from "@/assets/sounds/svj-blip.wav.asset.json";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export type SvjEvent = "shift" | "blip" | "lift" | "brake" | "throttle-on";
export interface SvjState { gear: number; throttle: boolean; brake: boolean; lastBlip: number }
export interface SvjInput { t: number; speed: number; throttle: boolean; brake: boolean; gear: number }

export const newSvjState = (): SvjState => ({ gear: 0, throttle: false, brake: false, lastBlip: -9 });

/** Pure decision: which real SVJ sound events fire on this frame. Mutates state. */
export function svjEvents(s: SvjState, i: SvjInput): SvjEvent[] {
  const ev: SvjEvent[] = [];
  const brakeOn = i.brake && !i.throttle;
  if (i.gear > s.gear && i.throttle) ev.push("shift");
  else if (i.gear < s.gear && !i.throttle && i.speed > 20 && i.t - s.lastBlip > 0.3) {
    ev.push("blip");
    s.lastBlip = i.t;
  }
  if (brakeOn && !s.brake && i.speed > 30) ev.push("brake");
  else if (s.throttle && !i.throttle && !brakeOn && i.speed > 30) ev.push("lift");
  if (i.throttle && !s.throttle) ev.push("throttle-on");
  s.gear = i.gear;
  s.throttle = i.throttle;
  s.brake = brakeOn;
  return ev;
}

/** Engine rpm for a 0-based gear and speed (km/h). */
export const svjRpm = (speed: number, gear: number) =>
  speed < 6 ? 1000 : clamp((REDLINE * speed) / (GEAR_TOP[gear] ?? GEAR_TOP[GEAR_TOP.length - 1]!), 2500, REDLINE);
/** Playback rate of the gearless pull loop: matches the recording's pre-shift pitch at the shift point. */
export const pullRate = (rpm: number) => 0.6 + (0.5 * rpm) / REDLINE;

export class SvjEngine {
  private bufs: Partial<Record<"pull" | "overrun" | "shift" | "lift" | "brake" | "blip", AudioBuffer>> = {};
  private bus: GainNode;
  private pullGain: GainNode;
  private overGain: GainNode;
  private pullSrc: AudioBufferSourceNode | null = null;
  private overSrc: AudioBufferSourceNode | null = null;
  private oneShot: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private state = newSvjState();
  private duckUntil = 0;
  private loaded = false;

  constructor(private ctx: AudioContext, out: AudioNode) {
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(out);
    this.pullGain = ctx.createGain();
    this.pullGain.gain.value = 0;
    this.pullGain.connect(this.bus);
    this.overGain = ctx.createGain();
    this.overGain.gain.value = 0;
    this.overGain.connect(this.bus);
    void this.load();
  }

  private async load() {
    const entries = Object.entries({ pull, overrun, shift, lift, brake, blip });
    await Promise.all(
      entries.map(async ([k, a]) => {
        try {
          const res = await fetch(a.url);
          if (!res.ok) return;
          this.bufs[k as keyof SvjEngine["bufs"]] = await this.ctx.decodeAudioData(await res.arrayBuffer());
        } catch { /* missing piece stays silent */ }
      }),
    );
    const loop = (b?: AudioBuffer, g?: GainNode) => {
      if (!b || !g) return null;
      const s = this.ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      s.connect(g);
      s.start();
      return s;
    };
    this.pullSrc = loop(this.bufs.pull, this.pullGain);
    this.overSrc = loop(this.bufs.overrun, this.overGain);
    this.loaded = true;
  }

  get ready() { return this.loaded; }

  private play(name: "shift" | "lift" | "brake" | "blip", t: number, vol: number, rate = 1) {
    const b = this.bufs[name];
    if (!b) return;
    const layer = name === "blip"; // a downshift blip sits on top of the lift/brake crackle
    if (!layer) this.stopOneShot(t, 0.04);
    const src = this.ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = rate;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(gain);
    gain.connect(this.bus);
    src.start(t);
    src.onended = () => { gain.disconnect(); if (this.oneShot?.src === src) this.oneShot = null; };
    if (!layer) this.oneShot = { src, gain };
  }

  private stopOneShot(t: number, tau: number) {
    const o = this.oneShot;
    if (!o) return;
    o.gain.gain.cancelScheduledValues(t);
    o.gain.gain.setTargetAtTime(0, t, tau);
    try { o.src.stop(t + tau * 6); } catch { /* already stopped */ }
    this.oneShot = null;
  }

  update(speed: number, throttle: boolean, brakeIn: boolean, gear: number, running: boolean) {
    const t = this.ctx.currentTime;
    if (!running) {
      this.bus.gain.setTargetAtTime(0, t, 0.12);
      this.stopOneShot(t, 0.05);
      this.state = newSvjState();
      return;
    }
    this.bus.gain.setTargetAtTime(1, t, 0.08);
    const rpm = svjRpm(speed, gear);
    const rate = pullRate(rpm);
    this.pullSrc?.playbackRate.setTargetAtTime(rate, t, 0.05);
    this.overSrc?.playbackRate.setTargetAtTime(0.74 + 0.3 * Math.min(speed / 300, 1), t, 0.2);

    for (const e of svjEvents(this.state, { t, speed, throttle, brake: brakeIn, gear })) {
      if (e === "shift") {
        // Real upshift: duck the gearless loop while the recorded ignition cut + bang plays.
        this.play("shift", t, 1, clamp(rate * 1.1, 0.85, 1.25));
        // Dip and recovery are scheduled on the audio clock so a dropped frame never leaves a gap.
        this.pullGain.gain.cancelScheduledValues(t);
        this.pullGain.gain.setTargetAtTime(0.04, t, 0.015);
        this.pullGain.gain.setTargetAtTime(1, t + 0.2, 0.05);
        this.duckUntil = t + 0.3;
      } else if (e === "blip") {
        this.play("blip", t, 0.75, clamp(0.85 + (0.25 * rpm) / REDLINE, 0.85, 1.1));
      } else if (e === "lift") {
        this.play("lift", t, 0.95);
      } else if (e === "brake") {
        this.play("brake", t, 0.95);
      } else if (e === "throttle-on") {
        if (this.oneShot && !this.duckUntil) this.stopOneShot(t, 0.05);
      }
    }

    const ducking = t < this.duckUntil;
    if (!ducking) this.duckUntil = 0;
    if (throttle) {
      if (!ducking) this.pullGain.gain.setTargetAtTime(1, t, 0.05);
      this.overGain.gain.setTargetAtTime(0, t, 0.05);
    } else {
      // Not accelerating: the real off-throttle burble, under any lift/brake slice.
      this.pullGain.gain.setTargetAtTime(0, t, 0.06);
      const idle = speed < 6;
      this.overGain.gain.setTargetAtTime(idle ? 0.45 : this.oneShot ? 0.25 : 0.6, t, this.oneShot ? 0.35 : 0.15);
    }
  }
}
