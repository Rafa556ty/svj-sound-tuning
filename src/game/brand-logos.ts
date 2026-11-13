import type { Brand } from "./player-cars";
import lamborghini from "@/assets/brands/lamborghini.png";
import ferrari from "@/assets/brands/ferrari.png";
import bugatti from "@/assets/brands/bugatti.png";
import koenigsegg from "@/assets/brands/koenigsegg.png";
import pagani from "@/assets/brands/pagani.png";
import dodge from "@/assets/brands/dodge.png";

export const BRANDS: { id: Brand; name: string }[] = [
  { id: "lamborghini", name: "Lamborghini" },
  { id: "ferrari", name: "Ferrari" },
  { id: "bugatti", name: "Bugatti" },
  { id: "koenigsegg", name: "Koenigsegg" },
  { id: "pagani", name: "Pagani" },
  { id: "dodge", name: "Dodge" },
];
export const BRAND_LOGOS: Record<Brand, string> = { lamborghini, ferrari, bugatti, koenigsegg, pagani, dodge };
