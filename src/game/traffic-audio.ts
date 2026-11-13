import ferrari from '@/assets/sounds/ferrari-engine.mp3.asset.json';
import bugatti from '@/assets/sounds/bugatti-engine.mp3.asset.json';
import mustang from '@/assets/sounds/mustang-engine.mp3.asset.json';

export const TRAFFIC_SOUNDS: Record<string, string> = {
  'ferrari-sf90': ferrari.url,
  'bugatti-chiron': bugatti.url,
  'mustang-blue': mustang.url,
  'mustang-black': mustang.url,
};
export type SoundCar = { type: string; x: number; z: number; speed: number; cruise: number; sportPush?: boolean; hit?: boolean };
export function trafficSoundLevel(car: SoundCar, playerZ: number, playerX: number, ppm: number, running: boolean) {
  const distance = Math.hypot(car.z - playerZ, (car.x - playerX) / Math.max(0.01, ppm));
  const accelerating = !!car.sportPush && car.speed < car.cruise - 4;
  return {
    accelerating,
    gain: !running || car.hit || !TRAFFIC_SOUNDS[car.type] || distance >= 95 ? 0 : (accelerating ? 0.38 : 0.085) * (1 - distance / 95) ** 2,
    pan: Math.max(-0.9, Math.min(0.9, (car.x - playerX) / Math.max(1, ppm * 10))),
    rate: accelerating ? 0.9 + Math.min(0.25, car.speed / 1000) : 0.76 + Math.min(0.16, car.speed / 1400),
    cutoff: accelerating ? 8500 : 1800,
  };
}

type Voice = { source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode; pan: StereoPannerNode; accelerating: boolean };
/** Own recording per model; at most six nearby cars, never React work per frame. */
export class TrafficAudio {
  private buffers = new Map<string, AudioBuffer>();
  private voices = new Map<SoundCar, Voice>();
  private disposed = false;
  constructor(private ctx: AudioContext, private output: AudioNode) { void this.load(); }
  private async load() {
    await Promise.all([...new Set(Object.values(TRAFFIC_SOUNDS))].map(async url => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
        if (!this.disposed) this.buffers.set(url, buffer);
      } catch (error) { console.warn('Traffic recording unavailable', error); }
    }));
  }
  update(cars: readonly SoundCar[], playerZ: number, playerX: number, ppm: number, running: boolean) {
    const nearby = running ? cars.filter(c => TRAFFIC_SOUNDS[c.type] && !c.hit && Math.abs(c.z - playerZ) < 95)
      .sort((a,b) => Math.abs(a.z-playerZ)-Math.abs(b.z-playerZ)).slice(0,6) : [];
    const keep = new Set(nearby);
    for (const [car, voice] of this.voices) if (!keep.has(car)) { this.stopVoice(voice); this.voices.delete(car); }
    for (const car of nearby) {
      const url = TRAFFIC_SOUNDS[car.type];
      if (!url) continue;
      const buffer = this.buffers.get(url);
      if (!buffer) continue;
      const level = trafficSoundLevel(car, playerZ, playerX, ppm, running);
      let voice = this.voices.get(car);
      if (!voice) {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer; source.loop = true;
        const gain = this.ctx.createGain(); gain.gain.value = 0;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass';
        const pan = this.ctx.createStereoPanner();
        source.connect(filter); filter.connect(gain); gain.connect(pan); pan.connect(this.output);
        voice = { source, gain, filter, pan, accelerating: level.accelerating };
        this.setLoop(voice, buffer, level.accelerating);
        source.start(this.ctx.currentTime, source.loopStart);
        this.voices.set(car, voice);
      }
      if (voice.accelerating !== level.accelerating) this.setLoop(voice, buffer, level.accelerating);
      const now = this.ctx.currentTime;
      voice.gain.gain.setTargetAtTime(level.gain, now, 0.12);
      voice.source.playbackRate.setTargetAtTime(level.rate, now, 0.2);
      voice.filter.frequency.setTargetAtTime(level.cutoff, now, 0.2);
      voice.pan.pan.setTargetAtTime(level.pan, now, 0.1);
    }
  }
  private setLoop(voice: Voice, buffer: AudioBuffer, accelerating: boolean) {
    // Pick a sustained engine section, rather than silence or the recording's introduction.
    const samples = buffer.getChannelData(0), span = Math.min(buffer.duration, accelerating ? 4 : 1.4);
    let best = 0, score = accelerating ? -Infinity : Infinity;
    for (let t = 0; t + span <= buffer.duration; t += 0.2) {
      let energy = 0;
      for (let i = Math.floor(t*buffer.sampleRate); i < (t+span)*buffer.sampleRate; i += 64) energy += (samples[i] ?? 0) ** 2;
      if (energy < 0.05) continue;
      if (accelerating ? energy > score : energy < score) { best = t; score = energy; }
    }
    voice.source.loopStart = best; voice.source.loopEnd = best + span;
    voice.accelerating = accelerating;
  }
  private stopVoice(voice: Voice) {
    const now = this.ctx.currentTime;
    voice.gain.gain.setTargetAtTime(0, now, 0.025);
    voice.source.stop(now + 0.15);
    voice.source.onended = () => { voice.source.disconnect(); voice.filter.disconnect(); voice.gain.disconnect(); voice.pan.disconnect(); };
  }
  dispose() { this.disposed = true; for (const voice of this.voices.values()) this.stopVoice(voice); this.voices.clear(); this.buffers.clear(); }
}