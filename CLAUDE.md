# ai-garages

Garages from the admin panel: public garages for owned vehicles, job garages for a job's fleet, impound lots for vehicles lost in the world (fee). Park while driving inside the area, open the list on foot. Depends on ai-core (characters, jobs, money, prompts, admin panel) and ai-vehicles (storage, spawning).

## Decisions

- No storage of its own: every vehicle lives in ai-vehicles; parking saves the props the driver's client read (`getVehicleProps`) and the server-read engine / body health, then stores the vehicle.
- Vehicles are stored per garage (QB style); job vehicles without a garage show in every garage of that job. Impound lots list every vehicle in the `impound` state of the player (ai-vehicles moves a vehicle there when its entity disappears while out).
- The list is a snapshot answer of the `list` callback (it changes only by the player's own actions); taking out spawns through ai-vehicles at the garage's exit point.
- The screen is one list in component state (no Redux: one snapshot, no deltas).

## Contracts

- Callbacks and shapes: `resource/common/garages.ts`. Panel files `data/garages.json`, `data/settings.json` (both `sync: "all"`).

## Entry points

- Server: list, take out, park `resource/server/index.ts`; panel `server/schema.ts`.
- Client: garage points (lib `Points`, blip on the "open" point), NUI bridge `resource/client/index.ts`.
- NUI (tgiann-realparking look): `web/src/App.tsx`, rows `web/src/features/VehicleRow.tsx`; browser preview `bun run webdev` (`?impound=1`).
