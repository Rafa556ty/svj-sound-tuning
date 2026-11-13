// Garage customisation rules (pure): which parts can be changed, the colour
// palette, the finishes each part allows and how a choice is saved per car.
import { PLAYABLE_CARS, type PlayerCar } from "./player-cars";

export type CarPart = "body" | "seats" | "rims" | "calipers";
export type Finish = "gloss" | "metallic" | "matte" | "chrome" | "carbon" | "leather" | "alcantara";

/** `null` keeps the car's factory colour / finish for that part. */
export type PartStyle = { color: string | null; finish: Finish | null };
export type CarCustom = Record<CarPart, PartStyle>;
export type GarageCustom = Record<PlayerCar, CarCustom>;

export const CAR_PARTS: CarPart[] = ["body", "seats", "rims", "calipers"];

export const PART_LABELS: Record<CarPart, string> = {
  body: "Carroceria",
  seats: "Bancos",
  rims: "Rodas",
  calipers: "Freios",
};

export const FINISH_LABELS: Record<Finish, string> = {
  gloss: "Brilhante",
  metallic: "Metálico",
  matte: "Fosco",
  chrome: "Cromado",
  carbon: "Fibra de carbono",
  leather: "Couro",
  alcantara: "Alcântara",
};

/** Seats only take upholstery; brake calipers only take paint. */
export const PART_FINISHES: Record<CarPart, Finish[]> = {
  body: ["gloss", "metallic", "matte", "chrome", "carbon"],
  seats: ["leather", "alcantara", "carbon"],
  rims: ["gloss", "metallic", "matte", "chrome", "carbon"],
  calipers: ["gloss", "metallic", "matte"],
};

export const PALETTE: { name: string; color: string }[] = [
  { name: "Preto", color: "#0a0a0c" },
  { name: "Branco", color: "#f2f2f0" },
  { name: "Prata", color: "#b9bec4" },
  { name: "Grafite", color: "#3a3d42" },
  { name: "Vermelho", color: "#c8101a" },
  { name: "Laranja", color: "#ff5a0a" },
  { name: "Amarelo", color: "#f5c400" },
  { name: "Verde", color: "#2fa84f" },
  { name: "Verde-limão", color: "#9be51c" },
  { name: "Azul", color: "#1546c8" },
  { name: "Azul-claro", color: "#3fa9f5" },
  { name: "Roxo", color: "#6a2bc4" },
  { name: "Rosa", color: "#e8378f" },
  { name: "Marrom", color: "#6b3a1e" },
  { name: "Bege", color: "#d8c3a0" },
  { name: "Dourado", color: "#c9a23a" },
];

const FACTORY: PartStyle = { color: null, finish: null };
export const factoryCustom = (): CarCustom => ({
  body: { ...FACTORY },
  seats: { ...FACTORY },
  rims: { ...FACTORY },
  calipers: { ...FACTORY },
});
const allFactory = () => Object.fromEntries(PLAYABLE_CARS.map(c => [c.id, factoryCustom()])) as GarageCustom;
export const DEFAULT_GARAGE_CUSTOM: GarageCustom = allFactory();

const HEX = /^#[0-9a-f]{6}$/i;
export const isFinishAllowed = (part: CarPart, finish: Finish) => PART_FINISHES[part].includes(finish);

export function setPartColor(c: CarCustom, part: CarPart, color: string | null): CarCustom {
  if (color !== null && !HEX.test(color)) return c;
  return { ...c, [part]: { ...c[part], color: color?.toLowerCase() ?? null } };
}

export function setPartFinish(c: CarCustom, part: CarPart, finish: Finish | null): CarCustom {
  if (finish !== null && !isFinishAllowed(part, finish)) return c;
  return { ...c, [part]: { ...c[part], finish } };
}

export const resetPart = (c: CarCustom, part: CarPart): CarCustom => ({ ...c, [part]: { ...FACTORY } });

/** PBR values for a finish. Carbon also gets the woven fibre pattern. */
export function finishParams(finish: Finish) {
  switch (finish) {
    case "gloss": return { metalness: 0.15, roughness: 0.1, clearcoat: 1, weave: false };
    case "metallic": return { metalness: 0.85, roughness: 0.24, clearcoat: 0.7, weave: false };
    case "matte": return { metalness: 0.1, roughness: 0.72, clearcoat: 0, weave: false };
    case "chrome": return { metalness: 1, roughness: 0.04, clearcoat: 0.3, weave: false };
    case "carbon": return { metalness: 0.35, roughness: 0.28, clearcoat: 1, weave: true };
    case "leather": return { metalness: 0, roughness: 0.55, clearcoat: 0, weave: false };
    case "alcantara": return { metalness: 0, roughness: 0.96, clearcoat: 0, weave: false };
  }
}

/** Carbon with no colour picked is classic black weave; chrome with none is silver. */
export function effectiveColor(style: PartStyle): string | null {
  if (style.color) return style.color;
  if (style.finish === "carbon") return "#1c1d20";
  if (style.finish === "chrome") return "#d9dde2";
  return null;
}

const KEY = "car-custom-v1";
type KV = Pick<Storage, "getItem" | "setItem">;

function cleanCar(raw: unknown): CarCustom {
  let out = factoryCustom();
  if (!raw || typeof raw !== "object") return out;
  for (const part of CAR_PARTS) {
    const p = (raw as Record<string, unknown>)[part] as Partial<PartStyle> | undefined;
    if (!p || typeof p !== "object") continue;
    if (typeof p.color === "string") out = setPartColor(out, part, p.color);
    if (typeof p.finish === "string") out = setPartFinish(out, part, p.finish as Finish);
  }
  return out;
}

export function loadCustom(store: KV): GarageCustom {
  try {
    const raw = JSON.parse(store.getItem(KEY) ?? "null");
    return Object.fromEntries(PLAYABLE_CARS.map(c => [c.id, cleanCar(raw?.[c.id])])) as GarageCustom;
  } catch {
    return allFactory();
  }
}

export function saveCustom(store: KV, custom: GarageCustom) {
  store.setItem(KEY, JSON.stringify(custom));
}
