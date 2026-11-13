<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application architecture

- Preserve this project's platform configuration and Git metadata when importing source; repository source imports do not establish Git sync.
- Keep the racing simulation in `src/game/`, React responsible for menus and HUD, and Three.js rendering dynamically loaded; this avoids per-frame React work and server-side browser API execution.
- Serve imported car models and engine audio from `public/game-assets` and retain bundled image imports; this keeps the repository's existing media available on this project's origin.
- Keep the game at `/` with its own page metadata and client-only rendering; the engine depends on browser canvas and audio APIs.
- Traffic vehicles are real-scale CC0 GLBs in `public/game-assets/traffic-*.glb` (textures stripped, meshopt) restyled into a few shared materials in `models3d.ts`; keeps draw calls low on phones.
- Sports traffic (Mustang, BMW, Porsche, Bugatti) alternates calm/push moods via pure `nextSportMood` in `traffic-rules.ts` with per-type push strength in `SPORT_PUSH`; merging cars respect the target lane's leader so lanes never overlap.
- User-supplied traffic GLBs are simplified + meshopt offline; a moving part (Bugatti wing) gets `Wing_`-prefixed materials so `models3d.ts` batches it into an `active-wing` group, and render3d draws it as extra instanced parts with per-car lift from pure `stepTrafficWing`.
- Selectable camera views are pure poses in `src/game/camera-views.ts` applied by render3d; scenery and traffic render far behind the car so the reverse camera never exposes unloaded world.
- Bake road environment reflections once in `road-lighting.ts`; use shared contact textures and local light halos rather than full-screen phone post-processing to limit rendering cost.
- PC vs phone layout is decided by pure `detectUi`/`resolveUi` in `src/game/device-ui.ts` with a saved manual override in settings, and phone orientation by `touchOrientation`: phones always use the landscape thumb layout, and in portrait the whole game is CSS-rotated 90° (`rotatedFrame`, `data-phone-rotated`) with touch points remapped by `toRotatedPoint` where raw coordinates are read; no rotate prompt or orientation lock, since those are unreliable on phones.
- Playable Chiron look/perf tweaks are applied at load time in `models3d.ts` (`blackenChironRims`) and race-only in render3d (`trimChironForTrack`), never by editing or swapping the GLB; the garage keeps the full model.
- Traffic car light signatures and wipers live in src/game/vehicle-lights.ts as instanced overlays (one batch per model) — keeps draw calls flat.
- New owner-supplied media uses CDN asset pointers; traffic-audio.ts owns distance-limited Web Audio voices driven by engine telemetry to keep per-frame audio outside React.
- CarStore is an in-game DEMO overlay backed by a pure catalog; selections show the availability notice and never charge coins or unlock vehicles.
- Playable Chiron's rear spoiler (nodes named SK_Spoiler) is split into an `active-wing` group by `splitBugattiWing`, driven by the same `stepAero` as the Revuelto; render3d keeps per-car wing base height/rise.
- Playable cars, their brand and free-claim flag live in `src/game/player-cars.ts` (`PLAYABLE_CARS`, `FREE_CLAIMS_OPEN`); the store's brand tabs come from `src/game/brand-logos.ts`, so adding a car or ending the giveaway is a data change, not a UI change.
- Newer playable cars' wheels are found by material name (`isNewCarWheel` in models3d.ts) and split per corner; front wheels steer via pure `steerAngle` in wheels.ts, paint parts per car in car-paint.ts `PART_MATERIALS`.
- Playable cars' lamps come from their own GLB lens materials (`src/game/player-lights.ts`), split front/rear at the car's middle in render3d `setupRealLamps`; halos and beams are placed from those lens boxes, so lights stay on the real lamp positions.
- Each non-Revuelto playable car plays its own real engine recording from `src/game/player-sounds.ts` (one looped sample, pitch by speed); credits in `public/game-assets/CREDITS.md`.
