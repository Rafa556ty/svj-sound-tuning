import { rpmIn, REDLINE } from "@/game/gearbox";
import { carSpec, type PlayerCar } from "@/game/player-cars";

/** Arc helper: point on circle for angle in degrees (0 = right, clockwise). */
const pt = (cx: number, cy: number, r: number, a: number) => {
  const rad = (a * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
};

/** Lamborghini-style digital cluster: segmented RPM arc, big gear, digital speed. */
function RevueltoCluster({ speed, gear }: { speed: number; gear: number }) {
  const rpm = Math.min(10000, rpmIn(gear, speed));
  const SEGS = 24;
  const lit = Math.round((rpm / 10000) * SEGS);
  const segs = Array.from({ length: SEGS }, (_, i) => {
    const a0 = 180 + (i / SEGS) * 180 + 0.9;
    const a1 = 180 + ((i + 1) / SEGS) * 180 - 0.9;
    const [x0, y0] = pt(100, 96, 86, a0), [x1, y1] = pt(100, 96, 86, a1);
    const [x2, y2] = pt(100, 96, 72, a1), [x3, y3] = pt(100, 96, 72, a0);
    const red = (i + 1) / SEGS > REDLINE / 10000 - 0.08;
    const fill = i < lit ? (red ? "var(--color-brake)" : "var(--color-primary)") : "var(--color-hud-border)";
    return <path key={i} d={`M${x0} ${y0} L${x1} ${y1} L${x2} ${y2} L${x3} ${y3}Z`} fill={fill} opacity={i < lit ? 1 : 0.45} />;
  });
  const labels = Array.from({ length: 11 }, (_, n) => {
    const [x, y] = pt(100, 96, 61, 180 + n * 18);
    return <text key={n} x={x} y={y + 3} textAnchor="middle" fontSize="8" fontWeight="700" fill={n >= 9 ? "var(--color-primary)" : "var(--color-foreground)"} fontStyle="italic">{n}</text>;
  });
  return (
    <svg viewBox="0 0 200 118" className="h-full w-full drop-shadow-lg" aria-label={`${Math.round(speed)} km/h, marcha ${gear}`}>
      <path d="M8 100 A92 92 0 0 1 192 100 L176 114 L24 114Z" fill="var(--color-hud)" opacity="0.72" stroke="var(--color-brake)" strokeWidth="0.8" />
      {segs}{labels}
      <text x="100" y="78" textAnchor="middle" fontSize="40" fontWeight="900" fontStyle="italic" fill="none" stroke="var(--color-primary)" strokeWidth="1.6">{speed < 1 ? "N" : gear}</text>
      <text x="128" y="52" fontSize="5" fill="var(--color-muted-foreground)">RPM x1000</text>
      <path d="M60 92 L140 92 L146 108 L54 108Z" fill="var(--color-foreground)" opacity="0.92" />
      <text x="114" y="105" textAnchor="end" fontSize="15" fontWeight="900" fontStyle="italic" fill="var(--color-background)" className="tabular-nums">{String(Math.round(speed)).padStart(3, "0")}</text>
      <text x="117" y="105" fontSize="5.5" fontWeight="700" fill="var(--color-background)">km/h</text>
    </svg>
  );
}

/** Bugatti-style analog dial 0–500 km/h with needle and LCD readout. */
function ChironCluster({ speed, gear }: { speed: number; gear: number }) {
  const A0 = 120, SPAN = 300; // 0 at bottom-left, 500 at bottom-right
  const ang = A0 + (Math.min(500, speed) / 500) * SPAN;
  const ticks = [];
  for (let v = 0; v <= 500; v += 10) {
    const a = A0 + (v / 500) * SPAN, major = v % 50 === 0;
    const [x0, y0] = pt(100, 100, 88, a), [x1, y1] = pt(100, 100, major ? 76 : 82, a);
    ticks.push(<line key={v} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--color-chiron-glow)" strokeWidth={major ? 2 : 0.8} />);
    if (major) {
      const [tx, ty] = pt(100, 100, 64, a);
      ticks.push(<text key={`t${v}`} x={tx} y={ty + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-foreground)">{v}</text>);
    }
  }
  const [nx, ny] = pt(100, 100, 74, ang);
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-lg" aria-label={`${Math.round(speed)} km/h, marcha ${gear}`}>
      <defs>
        <radialGradient id="chiron-face"><stop offset="0.6" stopColor="var(--color-hud)" /><stop offset="1" stopColor="var(--color-chiron-glow)" stopOpacity="0.35" /></radialGradient>
      </defs>
      <circle cx="100" cy="100" r="97" fill="url(#chiron-face)" opacity="0.8" stroke="var(--color-muted-foreground)" strokeWidth="3" />
      {ticks}
      <text x="100" y="66" textAnchor="middle" fontSize="16" fontWeight="900" fill="var(--color-muted-foreground)" letterSpacing="-3">EB</text>
      <line x1="100" y1="100" x2={nx} y2={ny} stroke="var(--color-foreground)" strokeWidth="3" strokeLinecap="round" style={{ transition: "all 90ms linear" }} />
      <circle cx="100" cy="100" r="9" fill="var(--color-hud)" stroke="var(--color-foreground)" strokeWidth="2" />
      <rect x="66" y="140" width="68" height="34" rx="6" fill="var(--color-chiron-glow)" opacity="0.28" />
      <text x="118" y="163" textAnchor="end" fontSize="20" fontWeight="700" fill="var(--color-chiron-glow)" className="tabular-nums">{String(Math.round(speed)).padStart(3, "0")}</text>
      <text x="120" y="163" fontSize="6" fill="var(--color-foreground)">km/h</text>
      <text x="100" y="172" textAnchor="middle" fontSize="7" fontWeight="700" fill="var(--color-foreground)">{speed < 1 ? "N" : `D${gear}`}</text>
    </svg>
  );
}

export function SpeedCluster({ car, speed, gear }: { car: PlayerCar; speed: number; gear: number }) {
  return carSpec(car).sound === "chiron" ? (
    <div className="h-32 w-32 sm:h-40 sm:w-40"><ChironCluster speed={speed} gear={gear} /></div>
  ) : (
    <div className="h-[6.5rem] w-44 sm:h-32 sm:w-56"><RevueltoCluster speed={speed} gear={gear} /></div>
  );
}
