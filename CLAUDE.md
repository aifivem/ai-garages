# ai-garages

Garages from the admin panel: public garages for owned vehicles, job garages for a job's fleet, impound lots for vehicles lost in the world (fee). Park while driving inside the area, open the list on foot. Depends on ai-core (characters, jobs, money, prompts, admin panel) and ai-vehicles (storage, spawning).

## Decisions

- No storage of its own: every vehicle lives in ai-vehicles. Parking needs the vehicle inside the garage area, no other player in it, and the caller driving it or standing beside it; it stores the server's look and tuning (the entity's `ai:props` bag, else ai-vehicles' stored props: only ai-mechanic changes mods) with the client's dirt and the server-read engine / body health. The client's props only count for a vehicle without any stored look, and then without mods or neon, so a mod menu never persists tuning.
- The impound fee is taken before the spawn and refunded to the same account when ai-vehicles cannot spawn the vehicle. The `list` callback is rated 2 per 2 s and reads the character and jobs from lib `online`.
- Blip look per garage kind (car, boat, air, impound) is in `settings.blips` (panel `blip` widgets); each garage only switches its blip on or off.
- Vehicles are stored per garage (QB style); job vehicles without a garage show in every garage of that job. Impound lots list every vehicle in the `impound` state of the player (ai-vehicles moves a vehicle there when its entity disappears while out).
- The list is a snapshot answer of the `list` callback (it changes only by the player's own actions); taking out spawns through ai-vehicles at the garage's exit point.
- The screen is one list in component state (no Redux: one snapshot, no deltas).

## Contracts

- Callbacks and shapes: `resource/common/garages.ts`. Panel files `data/garages.json`, `data/settings.json` (both `sync: "all"`).

## Entry points

- Server: list, take out, park `resource/server/index.ts`; panel `server/schema.ts`.
- Client: garage points (lib `Points`, blip on the "open" point), NUI bridge `resource/client/index.ts`.
- NUI (tgiann-realparking look): `web/src/App.tsx`, rows `web/src/features/VehicleRow.tsx`; browser preview `bun run webdev` (`?impound=1`).
