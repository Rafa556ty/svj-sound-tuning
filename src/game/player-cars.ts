// Playable cars, which ones can be claimed for free, and the saved garage.
export type PlayerCar = 'revuelto' | 'chiron' | 'huracan-evo' | 'tourbillon' | 'utopia-roadster' | 'huayra' | 'demon' | 'chiron-ss300' | 'laferrari' | 'svj';
export type Brand = 'lamborghini' | 'ferrari' | 'bugatti' | 'koenigsegg' | 'pagani' | 'dodge';

export type PlayableSpec = {
  id: PlayerCar;
  name: string;
  brand: Brand;
  /** Free to claim while the promotion is open; the owner will close it later. */
  freeClaim: boolean;
  /** Engine sound and speed cluster family. */
  sound: 'revuelto' | 'chiron';
};

export const PLAYABLE_CARS: PlayableSpec[] = [
  { id: 'revuelto', name: 'Lamborghini Revuelto', brand: 'lamborghini', freeClaim: false, sound: 'revuelto' },
  { id: 'svj', name: 'Lamborghini Aventador SVJ LP 770-4 2019', brand: 'lamborghini', freeClaim: true, sound: 'revuelto' },
  { id: 'huracan-evo', name: 'Lamborghini Huracán EVO 2019', brand: 'lamborghini', freeClaim: true, sound: 'revuelto' },
  { id: 'laferrari', name: 'Ferrari LaFerrari 2014', brand: 'ferrari', freeClaim: true, sound: 'revuelto' },
  { id: 'chiron', name: 'Bugatti Chiron', brand: 'bugatti', freeClaim: true, sound: 'chiron' },
  { id: 'chiron-ss300', name: 'Bugatti Chiron Super Sport 300+', brand: 'bugatti', freeClaim: true, sound: 'chiron' },
  { id: 'tourbillon', name: 'Bugatti Tourbillon 2026', brand: 'bugatti', freeClaim: true, sound: 'chiron' },
  { id: 'utopia-roadster', name: 'Pagani Utopia Roadster 2025', brand: 'pagani', freeClaim: true, sound: 'revuelto' },
  { id: 'huayra', name: 'Pagani Huayra', brand: 'pagani', freeClaim: true, sound: 'revuelto' },
  { id: 'demon', name: 'Dodge Challenger SRT Demon', brand: 'dodge', freeClaim: true, sound: 'revuelto' },
];

/** Global switch: set to false when free claims end (owned cars stay owned). */
export const FREE_CLAIMS_OPEN = true;

export const carSpec = (id: PlayerCar) => PLAYABLE_CARS.find(c => c.id === id)!;
export const isPlayerCar = (v: unknown): v is PlayerCar => PLAYABLE_CARS.some(c => c.id === v);

export type GarageState = { owned: PlayerCar[]; selectedCar: PlayerCar };
export const DEFAULT_GARAGE: GarageState = { owned: ['revuelto'], selectedCar: 'revuelto' };

export const isOwned = (state: GarageState, car: PlayerCar) => state.owned.includes(car);
export const canClaimFree = (state: GarageState, car: PlayerCar) =>
  FREE_CLAIMS_OPEN && carSpec(car).freeClaim && !isOwned(state, car);

export function choosePlayerCar(state: GarageState, car: PlayerCar): GarageState {
  return isOwned(state, car) ? { ...state, selectedCar: car } : state;
}
export function claimCar(state: GarageState, car: PlayerCar, confirmed: boolean): GarageState {
  if (!confirmed) return state;
  if (isOwned(state, car)) return { ...state, selectedCar: car };
  if (!canClaimFree(state, car)) return state;
  return { owned: [...state.owned, car], selectedCar: car };
}
export const needsClaimConfirmation = (state: GarageState, car: PlayerCar) => !isOwned(state, car);

const GARAGE_KEY = "garage-state-v1";
type KV = Pick<Storage, "getItem" | "setItem">;
export function loadGarage(store: KV): GarageState {
  try {
    const raw = JSON.parse(store.getItem(GARAGE_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return DEFAULT_GARAGE;
    const owned = new Set<PlayerCar>(['revuelto']);
    if (raw.chironOwned === true) owned.add('chiron');
    if (Array.isArray(raw.owned)) for (const c of raw.owned) if (isPlayerCar(c)) owned.add(c);
    const list = PLAYABLE_CARS.map(c => c.id).filter(id => owned.has(id));
    return { owned: list, selectedCar: isPlayerCar(raw.selectedCar) && owned.has(raw.selectedCar) ? raw.selectedCar : 'revuelto' };
  } catch { return DEFAULT_GARAGE; }
}
export function saveGarage(store: KV, state: GarageState) { store.setItem(GARAGE_KEY, JSON.stringify(state)); }
