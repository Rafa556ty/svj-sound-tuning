import { describe, expect, it } from 'vitest';
import { STORE_CARS, selectStoreCar } from './store-catalog';
describe('store prices set by owner', () => {
  it('SVJ costs 13,000 coins', () => expect(STORE_CARS.find(c=>c.id==='svj')?.price).toBe(13000));
  it('Urus costs 8,000 coins', () => expect(STORE_CARS.find(c=>c.id==='urus')?.price).toBe(8000));
  it('Murciélago costs 10,000 coins', () => expect(STORE_CARS.find(c=>c.id==='murcielago')?.price).toBe(10000));
  it('Veneno costs 22,000 coins', () => expect(STORE_CARS.find(c=>c.id==='veneno')?.price).toBe(22000));
  it('Chiron costs 30,000 coins', () => expect(STORE_CARS.find(c=>c.id==='chiron')?.price).toBe(30000));
  it('selection remains DEMO without purchasing', () => {
    for (const car of STORE_CARS) expect(selectStoreCar(car.id)).toEqual({status:'demo',purchased:false});
  });
});