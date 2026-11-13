import svj from '@/assets/store/svj.jpg.asset.json';
import urus from '@/assets/store/urus.jpg.asset.json';
import murcielago from '@/assets/store/murcielago.jpg.asset.json';
import veneno from '@/assets/store/veneno.jpg.asset.json';
import chiron from '@/assets/store/chiron-road.jpg.asset.json';

export const STORE_CARS = [
  { id: 'svj', name: 'Lamborghini SVJ', brand: 'lamborghini', price: 13000, image: svj.url },
  { id: 'urus', name: 'Lamborghini Urus', brand: 'lamborghini', price: 8000, image: urus.url },
  { id: 'murcielago', name: 'Lamborghini Murciélago', brand: 'lamborghini', price: 10000, image: murcielago.url },
  { id: 'veneno', name: 'Lamborghini Veneno', brand: 'lamborghini', price: 22000, image: veneno.url },
  { id: 'chiron', name: 'Bugatti Chiron', brand: 'bugatti', price: 30000, image: chiron.url },
] as const;
export function selectStoreCar(_id: string) { return { status: 'demo', purchased: false } as const; }