import { useEffect, useRef, useState } from "react";
import { toRotatedPoint } from "@/game/device-ui";
import type * as THREE from "three";
import { X } from "lucide-react";
import revueltoPhoto from "@/assets/revuelto.png";
import chironPhoto from "@/assets/store/chiron-road.jpg.asset.json";
import { PLAYABLE_CARS, carSpec, type PlayerCar } from "@/game/player-cars";
import { BRAND_LOGOS } from "@/game/brand-logos";
import { Button } from "@/components/ui/button";
import { CAR_PARTS, FINISH_LABELS, PALETTE, PART_FINISHES, PART_LABELS, loadCustom, resetPart, saveCustom, setPartColor, setPartFinish, DEFAULT_GARAGE_CUSTOM, type CarPart, type GarageCustom } from "@/game/car-custom";

export type GarageLabels = {
  title: string;
  hint: string;
  loading: string;
  error: string;
  close: string;
};

export function GarageViewer({ labels, onClose, selectedCar, owned, onSelect, busy }: { labels: GarageLabels; onClose: () => void; selectedCar: PlayerCar; owned: PlayerCar[]; onSelect: (car: PlayerCar) => void; busy: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [custom, setCustom] = useState<GarageCustom>(DEFAULT_GARAGE_CUSTOM);
  const [part, setPart] = useState<CarPart>("body");
  const [tab, setTab] = useState<"color" | "material">("color");
  const [panelOpen, setPanelOpen] = useState(true);
  const carRef = useRef<THREE.Object3D | null>(null);
  const customRef = useRef(custom);
  customRef.current = custom;

  useEffect(() => { setCustom(loadCustom(localStorage)); }, []);
  // Repaint the 3D car whenever a choice changes.
  useEffect(() => {
    const car = carRef.current;
    if (!car || status !== "ready") return;
    void import("@/game/car-paint").then(({ applyCarCustom }) => applyCarCustom(car, selectedCar, custom[selectedCar]));
  }, [custom, selectedCar, status]);

  const update = (fn: (c: GarageCustom[PlayerCar]) => GarageCustom[PlayerCar]) => {
    setCustom(prev => {
      const next = { ...prev, [selectedCar]: fn(prev[selectedCar]) };
      try { saveCustom(localStorage, next); } catch { /* storage full/blocked: keep in memory */ }
      return next;
    });
  };
  const current = custom[selectedCar][part];

  useEffect(() => {
    setStatus("loading"); setProgress(0);
    let disposed = false;
    let raf = 0;
    let teardown: (() => void) | null = null;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
      if (disposed) return;

      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);

      const lowEnd = navigator.maxTouchPoints > 0 && ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4) <= 4;
      const renderer = new THREE.WebGLRenderer({
        antialias: !lowEnd,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      const canvas = renderer.domElement;
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.touchAction = "none";
      container.appendChild(canvas);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x303a40);
      scene.fog = new THREE.Fog(0x303a40, 20, 45);

      const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 120);

      // Studio-style reflections so the paint, glass and chrome read properly.
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;
      scene.environmentIntensity = 0.6;

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(lowEnd ? 512 : 1024, lowEnd ? 512 : 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 40;
      keyLight.shadow.bias = -0.0006;
      scene.add(keyLight);
      scene.add(keyLight.target);

      const rimWarm = new THREE.DirectionalLight(0xffb347, 1.5);
      rimWarm.position.set(-6, 3, -5);
      scene.add(rimWarm);

      const rimCool = new THREE.DirectionalLight(0x7fb2ff, 0.8);
      rimCool.position.set(5, 2, -6);
      scene.add(rimCool);

      scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x1a1208, 0.55));

      const { loadCar } = await import("@/game/models3d");
      const template = await loadCar(selectedCar);
      if (disposed) return;
      const car = template.clone(true);
      // Cached model geometry/materials belong to the shared loader, not this view.
      car.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry = o.geometry.clone(); o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); } });
      setProgress(1);
      carRef.current = car;
      const pivot = new THREE.Group();
      pivot.add(car);
      scene.add(pivot);

      car.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });

      pivot.rotation.y = -Math.PI / 2;

      // Rest the car on the floor and spin it around its own centre.
      pivot.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(pivot);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      pivot.position.set(-center.x, -bounds.min.y, -center.z);
      pivot.updateMatrixWorld(true);

      const carLength = Math.max(size.x, size.z);
      const carHeight = Math.max(0.4, size.y);

      const { addGarageEnvironment } = await import("@/game/garage-environment");
      addGarageEnvironment(scene);
      keyLight.position.set(carLength * 0.9, carHeight * 6, carLength * 1.1);
      keyLight.target.position.set(0, carHeight * 0.4, 0);
      const shadowSpan = carLength * 0.9;
      keyLight.shadow.camera.left = -shadowSpan;
      keyLight.shadow.camera.right = shadowSpan;
      keyLight.shadow.camera.top = shadowSpan;
      keyLight.shadow.camera.bottom = -shadowSpan;
      keyLight.shadow.camera.updateProjectionMatrix();

      const target = new THREE.Vector3(0, carHeight * 0.45, 0);
      const viewDirection = new THREE.Vector3(0.68, 0.34, 0.65).normalize();

      /**
       * Distance that keeps the whole car inside the frame. A phone held
       * upright is tall and narrow, so the horizontal field of view is the one
       * that clips the car: it is derived from the FOV and the current aspect.
       */
      const frameDistance = () => {
        const halfVertical = Math.tan((camera.fov * Math.PI) / 360);
        const halfHorizontal = halfVertical * camera.aspect;
        return Math.max(carLength / 2 / halfHorizontal, carHeight / 2 / halfVertical) * 1.4;
      };

      let baseDistance = frameDistance();
      camera.position.copy(target).addScaledVector(viewDirection, baseDistance);
      camera.lookAt(target);

      // Phone standing up: the game is drawn turned sideways, so turn the
      // finger's screen position the same way before the orbit controls read it.
      const remap = (e: PointerEvent) => {
        if (!container.closest("[data-phone-rotated]")) return;
        const p = toRotatedPoint(e.clientX, e.clientY, window.innerWidth);
        for (const [k, v] of [["clientX", p.x], ["clientY", p.y], ["pageX", p.x], ["pageY", p.y]] as const)
          Object.defineProperty(e, k, { value: v, configurable: true });
      };
      for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel"] as const)
        container.addEventListener(type, remap, { capture: true });

      const controls = new OrbitControls(camera, canvas);
      controls.target.copy(target);
      controls.enableDamping = true;
      controls.dampingFactor = 0.075;
      controls.enablePan = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.85;
      controls.minDistance = baseDistance * 0.4;
      controls.maxDistance = baseDistance * 2.4;
      controls.minPolarAngle = Math.PI * 0.12;
      controls.maxPolarAngle = Math.PI * 0.495;
      controls.update();

      // Hand the turntable back a moment after the player lets go.
      let resumeTimer: ReturnType<typeof setTimeout> | undefined;
      const onStart = () => {
        if (resumeTimer) clearTimeout(resumeTimer);
        controls.autoRotate = false;
      };
      const onEnd = () => {
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
          controls.autoRotate = true;
        }, 2200);
      };
      controls.addEventListener("start", onStart);
      controls.addEventListener("end", onEnd);

      const resize = () => {
        const w = Math.max(1, container.clientWidth);
        const h = Math.max(1, container.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);

        // Keep the whole car framed through a rotation, but leave a zoom the
        // player already made alone.
        const next = frameDistance();
        const current = camera.position.distanceTo(controls.target);
        if (Math.abs(current - baseDistance) < 0.01) {
          const dir = camera.position.clone().sub(controls.target).normalize();
          camera.position.copy(controls.target).addScaledVector(dir, next);
        }
        baseDistance = next;
        controls.minDistance = baseDistance * 0.4;
        controls.maxDistance = baseDistance * 2.4;
      };
      const observer = new ResizeObserver(resize);
      observer.observe(container);

      const frame = () => {
        raf = requestAnimationFrame(frame);
        controls.update();
        renderer.render(scene, camera);
      };
      frame();

      container.dataset["sceneReady"] = "true";
      container.dataset["car"] = selectedCar;
      setStatus("ready");

      teardown = () => {
        cancelAnimationFrame(raf);
        carRef.current = null;
        observer.disconnect();
        controls.removeEventListener("start", onStart);
        controls.removeEventListener("end", onEnd);
        for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel"] as const)
          container.removeEventListener(type, remap, { capture: true });
        if (resumeTimer) clearTimeout(resumeTimer);
        controls.dispose();
        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry?.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of materials) {
            if (!material) continue;
            for (const value of Object.values(material as unknown as Record<string, unknown>)) {
              // Textures remain owned by the shared model cache.
            }
            material.dispose();
          }
        });
        scene.environment = null;
        envTexture.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        if (canvas.parentNode === container) container.removeChild(canvas);
      };
    })().catch((err: unknown) => {
      if (disposed) return;
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    });

    return () => {
      disposed = true;
      if (teardown) teardown();
    };
  }, [selectedCar]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-hud-border bg-scrim-top px-5 pb-3 pt-[max(env(safe-area-inset-top),18px)] phone-landscape:pb-1.5 phone-landscape:pt-2">
        <div>
          <h2 className="font-display text-2xl leading-none tracking-[0.25em] text-primary">
            {labels.title}
          </h2>
          <p className="mt-1 font-display text-[11px] tracking-[0.3em] text-muted-foreground">
            {carSpec(selectedCar).name.toUpperCase()}
          </p>
        </div>
        <Button
          variant="ghost" size="icon"
          onClick={onClose}
          aria-label={labels.close}
          className="corner-cut border border-hud-border bg-hud p-2 text-foreground transition-colors hover:bg-secondary"
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1">
      <div ref={containerRef} className="relative min-h-0 flex-1 touch-none">
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95">
            <div className="h-1 w-40 overflow-hidden bg-secondary">
              <div
                className="h-full bg-primary transition-[width] duration-150"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="animate-pulse-soft font-display text-sm tracking-[0.25em] text-primary">
              {labels.loading} {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-display text-lg tracking-[0.2em] text-brake">{labels.error}</p>
            <p className="text-xs text-muted-foreground">{errorMsg}</p>
            <Button
              variant="outline"
              size="sm"
              className="border-hud-border bg-hud text-xs"
              onClick={onClose}
            >
              {labels.close}
            </Button>
          </div>
        )}
      </div>
      {panelOpen ? (
        <aside aria-label="Personalizar carro" className="garage-panel flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l border-hud-border bg-hud p-3 phone-landscape:w-56 phone-landscape:gap-2 phone-landscape:p-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm tracking-[0.25em] text-primary">PERSONALIZAR</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setPanelOpen(false)}>OCULTAR</Button>
          </div>
          <div role="tablist" className="grid grid-cols-2 gap-1">
            {(["color", "material"] as const).map(id => (
              <Button key={id} role="tab" aria-selected={tab === id} variant="outline" size="sm" onClick={() => setTab(id)}
                className={`h-7 text-[11px] ${tab === id ? "border-primary bg-primary/15 text-primary" : "border-hud-border bg-card"}`}>
                {id === "color" ? "CORES" : "MATERIAL"}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {CAR_PARTS.map(p => (
              <Button key={p} variant="outline" size="sm" aria-pressed={part === p} onClick={() => setPart(p)}
                className={`h-7 text-[11px] ${part === p ? "border-primary bg-primary/15 text-primary" : "border-hud-border bg-card"}`}>
                {p === "seats" ? "Interior" : p === "rims" ? "Calotas" : PART_LABELS[p]}
              </Button>
            ))}
          </div>
          {tab === "color" ? (
            <div>
              <div className="grid grid-cols-6 gap-1.5">
                {PALETTE.map(c => (
                  <button key={c.color} type="button" title={c.name} aria-label={c.name} aria-pressed={current.color === c.color}
                    onClick={() => update(cc => setPartColor(cc, part, c.color))}
                    className={`garage-swatch aspect-square rounded-sm border ${current.color === c.color ? "border-primary ring-2 ring-primary" : "border-hud-border"}`}
                    style={{ backgroundColor: c.color }} />
                ))}
              </div>
              <label className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                Cor livre
                <input type="color" aria-label="Escolher cor livre" value={current.color ?? "#808080"}
                  onChange={e => update(cc => setPartColor(cc, part, e.target.value))}
                  className="h-7 w-14 cursor-pointer rounded-sm border border-hud-border bg-card" />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {PART_FINISHES[part].map(f => (
                <Button key={f} variant="outline" size="sm" aria-pressed={current.finish === f}
                  onClick={() => update(cc => setPartFinish(cc, part, f))}
                  className={`h-8 text-[11px] ${current.finish === f ? "border-primary bg-primary/15 text-primary" : "border-hud-border bg-card"}`}>
                  {FINISH_LABELS[f]}
                </Button>
              ))}
            </div>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={() => update(cc => resetPart(cc, part))}>
            Restaurar original
          </Button>
        </aside>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setPanelOpen(true)} className="absolute right-3 top-3 z-10 border-primary bg-hud text-xs text-primary">
          PERSONALIZAR
        </Button>
      )}
      </div>

      <div className="flex shrink-0 justify-start gap-3 overflow-x-auto border-t border-hud-border bg-hud px-3 py-3 sm:justify-center phone-landscape:py-1.5" onPointerDown={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
        {PLAYABLE_CARS.filter(c => owned.includes(c.id)).map(c => ({ ...c, image: c.id === 'revuelto' ? revueltoPhoto : c.id === 'chiron' ? chironPhoto.url : null })).map(c => (
          <Button key={c.id} variant="outline" disabled={busy} aria-pressed={selectedCar === c.id} aria-label={`Selecionar ${c.name}`} onClick={() => onSelect(c.id)} className={`h-auto w-40 shrink-0 flex-col gap-1 overflow-hidden whitespace-normal p-0 pb-2 phone-landscape:py-1.5 ${selectedCar === c.id ? 'border-primary bg-primary/10' : 'border-hud-border bg-card'}`}>
            {c.image ? <img src={c.image} alt={c.name} className="h-16 w-full object-cover phone-landscape:hidden" /> : <img src={BRAND_LOGOS[c.brand]} alt="" className="h-16 w-full bg-secondary object-contain p-2 phone-landscape:hidden" />}
            <span className="px-1 text-center text-xs">{c.name}</span>
            <span className="text-[10px] text-primary">{c.id === selectedCar ? 'SELECIONADO' : 'DISPONÍVEL'}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
