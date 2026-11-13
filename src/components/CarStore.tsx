import { useState } from 'react';
import { Coins, ShoppingBag, X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STORE_CARS, selectStoreCar } from '@/game/store-catalog';
import { PLAYABLE_CARS, canClaimFree, isOwned, type Brand, type GarageState, type PlayerCar } from '@/game/player-cars';
import { BRANDS, BRAND_LOGOS } from '@/game/brand-logos';
import chironPhoto from '@/assets/store/chiron-road.jpg.asset.json';
import svjPhoto from '@/assets/store/svj.jpg.asset.json';

type Item = { key: string; name: string; image: string | null; brand: Brand } & ({ kind: 'claim'; id: PlayerCar } | { kind: 'paid'; id: string; price: number });

const ITEMS: Item[] = [
  ...PLAYABLE_CARS.filter(c => c.freeClaim).map(c => ({ key: c.id, kind: 'claim' as const, id: c.id, name: c.name, brand: c.brand, image: c.id === 'chiron' ? chironPhoto.url : c.id === 'svj' ? svjPhoto.url : null })),
  ...STORE_CARS.filter(c => !PLAYABLE_CARS.some(p => p.id === c.id)).map(c => ({ key: c.id, kind: 'paid' as const, id: c.id, name: c.name, brand: c.brand, price: c.price, image: c.image })),
];

export function CarStore({ onClose, garage, onClaim, busy }: { onClose: () => void; garage: GarageState; onClaim: (car: PlayerCar) => void; busy: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [brand, setBrand] = useState<Brand>('lamborghini');
  const items = ITEMS.filter(i => i.brand === brand);
  const brandName = BRANDS.find(b => b.id === brand)!.name;
  return (
    <section role="dialog" aria-modal="true" aria-label="Loja" className="pointer-events-auto absolute inset-0 z-50 flex flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between border-b border-hud-border px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3"><ShoppingBag className="size-6 text-primary" /><h2 className="font-display text-3xl">LOJA</h2></div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar loja" title="Fechar loja"><X className="size-5" /></Button>
      </header>
      <nav role="tablist" aria-label="Marcas" className="flex shrink-0 gap-2 overflow-x-auto border-b border-hud-border px-3 py-3 sm:justify-center sm:px-8" onPointerDown={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
        {BRANDS.map(b => (
          <Button key={b.id} role="tab" aria-selected={brand === b.id} variant="outline" onClick={() => setBrand(b.id)}
            className={`h-auto shrink-0 flex-col gap-1 rounded px-3 py-2 ${brand === b.id ? 'border-primary bg-primary/10 text-primary' : 'border-hud-border bg-card text-foreground'}`}>
            <img src={BRAND_LOGOS[b.id]} alt="" className="size-10 object-contain" />
            <span className="font-display text-xs uppercase tracking-widest">{b.name}</span>
          </Button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-8" style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }} onPointerDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
        <div className="mx-auto max-w-5xl">
          <h3 className="mb-5 flex items-center gap-3 border-b border-primary pb-3 font-display text-2xl uppercase text-primary"><img src={BRAND_LOGOS[brand]} alt="" className="size-8 object-contain" />{brandName}</h3>
          {items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Nenhum carro {brandName} disponível ainda.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {items.map(car => {
                const owned = car.kind === 'claim' && isOwned(garage, car.id);
                const free = car.kind === 'claim' && canClaimFree(garage, car.id);
                return (
                  <Button key={car.key} disabled={busy} variant="outline" className="block h-auto w-full overflow-hidden rounded border-hud-border bg-card p-0 text-left text-foreground whitespace-normal hover:border-primary hover:bg-card hover:text-foreground" onClick={() => {
                    if (car.kind === 'claim') { if (owned || free) onClaim(car.id); return; }
                    if (selectStoreCar(car.id).status === 'demo') setSelected(car.name);
                  }} aria-label={car.name}>
                    {car.image ? <img src={car.image} alt={car.name} loading="lazy" className="h-20 w-full bg-secondary object-cover sm:h-24" /> : <img src={BRAND_LOGOS[car.brand]} alt="" loading="lazy" className="h-20 w-full bg-secondary object-contain p-3 sm:h-24" />}
                    <div className="flex flex-col items-start gap-1 p-2.5">
                      <span className="font-display text-base leading-tight">{car.name}</span>
                      {car.kind === 'claim' ? (
                        <>
                          <span className="text-xs font-semibold text-primary">{owned ? 'DISPONÍVEL NA GARAGEM' : free ? 'RESGATAR GRÁTIS' : 'INDISPONÍVEL'}</span>
                          {free && <span className="text-[10px] text-muted-foreground">Grátis por tempo limitado</span>}
                        </>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Coins className="size-4" />{car.price.toLocaleString('pt-BR')} <span className="text-xs">moedas</span></span>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {selected && (
        <div role="alertdialog" aria-modal="true" aria-label="Loja em DEMO" className="absolute inset-0 z-10 flex items-center justify-center bg-scrim p-5">
          <div className="w-full max-w-sm rounded border border-hud-border bg-card p-6 text-center">
            <ShoppingBag className="mx-auto mb-3 size-8 text-primary" />
            <h3 className="font-display text-3xl text-primary">AINDA ESTAMOS EM DEMO</h3>
            <p className="mt-3 font-semibold">{selected}</p>
            <p className="mt-2 text-sm text-muted-foreground">Vamos implementar a loja nas próximas atualizações.</p>
            <Button variant="race" className="mt-5 w-full" onClick={() => setSelected(null)}><ChevronLeft className="size-4" />VOLTAR À LOJA</Button>
          </div>
        </div>
      )}
    </section>
  );
}
