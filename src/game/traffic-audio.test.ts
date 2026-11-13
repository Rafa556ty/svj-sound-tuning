import { describe, it, expect } from 'vitest';
import { TRAFFIC_SOUNDS, trafficSoundLevel, type SoundCar } from './traffic-audio';
const car: SoundCar = { type: 'ferrari-sf90', x: 0, z: 0, speed: 100, cruise: 230, sportPush: true };
describe('owner-supplied traffic recordings', () => {
  it('assigns first recording to Ferrari', () => expect(TRAFFIC_SOUNDS['ferrari-sf90']).toContain('ferrari-engine.mp3'));
  it('assigns second recording to Bugatti', () => expect(TRAFFIC_SOUNDS['bugatti-chiron']).toContain('bugatti-engine.mp3'));
  it('assigns third recording to both Mustang GT colours', () => { expect(TRAFFIC_SOUNDS['mustang-blue']).toContain('mustang-engine.mp3'); expect(TRAFFIC_SOUNDS['mustang-black']).toBe(TRAFFIC_SOUNDS['mustang-blue']); });
  it('plays cruise more softly than acceleration', () => expect(trafficSoundLevel({...car, sportPush:false},0,0,1,true).gain).toBeLessThan(trafficSoundLevel(car,0,0,1,true).gain));
  it('does not rev merely because a push is blocked by traffic', () => expect(trafficSoundLevel({...car,speed:230},0,0,1,true).accelerating).toBe(false));
  it('silences cars when paused', () => expect(trafficSoundLevel(car,0,0,1,false).gain).toBe(0));
  it('silences distant cars', () => expect(trafficSoundLevel({...car,z:100},0,0,1,true).gain).toBe(0));
});