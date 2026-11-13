// Real engine recordings per playable car (CC BY / CC BY-SA, see public/game-assets/CREDITS.md).
// Revuelto and Huracán EVO share the multi-layer gearbox engine in audio.ts; the SVJ uses svj-audio.ts.
import type { PlayerCar } from "./player-cars";
import bugatti from "@/assets/sounds/bugatti-engine.mp3.asset.json";
import laferrari from "@/assets/sounds/laferrari-engine.mp3.asset.json";
import huayra from "@/assets/sounds/huayra-engine.mp3.asset.json";
import challenger from "@/assets/sounds/challenger-engine.mp3.asset.json";

export const PLAYER_RECORDINGS: Partial<Record<PlayerCar, string>> = {
  chiron: bugatti.url,
  "chiron-ss300": bugatti.url,
  tourbillon: bugatti.url,
  laferrari: laferrari.url,
  huayra: huayra.url,
  "utopia-roadster": huayra.url,
  demon: challenger.url,
};
export const recordingFor = (car: PlayerCar) => PLAYER_RECORDINGS[car] ?? null;
