# ai-garages

Garages from the admin panel: public garages for owned vehicles, job and gang garages for their fleet, impound lots for vehicles lost in the world (fee). Park while driving inside the area, open the list on foot. Depends on ai-core (characters, jobs, money, prompts, admin panel) and ai-vehicles (storage, spawning).

## Decisions

- No storage of its own: every vehicle lives in ai-vehicles. Parking needs the vehicle inside the garage area, no other player in it, and the caller driving it or standing beside it; it stores the server's look (the entity's `ai:props` bag, else ai-vehicles' stored props) with the client's dirt and the server-read engine / body health; the client's props only count for a vehicle without any stored look. ai-vehicles' `SaveVehicle` keeps the stored mods and neon (none without stored props), so a mod menu never persists tuning; only ai-mechanic's `SaveTuning` changes them.
- The impound fee is taken before the spawn and refunded to the same account when ai-vehicles cannot spawn the vehicle. The `list` callback is rated 2 per 2 s and reads the character and jobs from lib `online`.
- Blip look per garage kind (car, boat, air, impound) is in `settings.blips` (panel `blip` widgets); each garage only switches its blip on or off.
- Who may use a garage is the record's access fields (lib `ACCESS_FIELDS` / `readAccess`: `jobs`, `gangs`, `onDuty`); the client's `canShow` and blip use `allows`, the server `online.allows`. A public garage (no jobs, no gangs) lists the character's vehicles; a locked one lists the fleet (ai-vehicles owner `job` / `gang`) of each listed job and gang the player passes on its own. QB's gang garages (ballas, families, lostmc, cartel) are records with `gangs` set; like qb-garages they also store a member's own cars (parked there by that member; character vehicles without a garage never show in a locked one), besides the gang's fleet.
- Vehicles are stored per garage (QB style); fleet vehicles without a garage show in every garage of that job or gang. Impound lots list every vehicle in the `impound` state of the player (ai-vehicles moves a vehicle there when its entity disappears while out).
- The list is a snapshot answer of the `list` callback (it changes only by the player's own actions); taking out spawns through ai-vehicles at the garage's exit point.
- The screen is one list in component state (no Redux: one snapshot, no deltas).

## Contracts

- Exports for ai-core's garage layer (lib `garages`, never called by scripts directly): `ImpoundVehicle(entity)` and `StoreVehicle(entity, garageId)` (owned ai-vehicles vehicles, condition and fuel saved first; false for anything else), `GetStoredVehicles(source)` (`GaragedVehicle[]` in `@aicore-fivem/shared`). Parking stores the fuel read through lib `fuel` (any fuel script).
- Callbacks and shapes: `resource/common/garages.ts`. Panel files `data/garages.json`, `data/settings.json` (both `sync: "all"`).

## Entry points

- Server: `resource/server/index.ts` only imports the features: list `server/list.ts`, take out `server/takeOut.ts`, park `server/park/` (who may park `parkable.ts`, stored look `props.ts`), ai-core's garage layer exports `server/exports.ts`; who may use a garage's vehicles `server/access.ts`, garage area `server/area.ts`, stored condition `server/condition.ts`; panel views `server/panel.ts`, schema `server/schema.ts`.
- Client: garage points (lib `RecordObjects` + `Points`, blip on the "open" point; an edited garage rebuilds only its points, a settings change or a membership change rebuilds all / the locked ones) and the list screen `client/garages/`; panel mirror `client/world.ts`.
- NUI (tgiann-realparking look): `web/src/App.tsx`, rows `web/src/features/garage/VehicleRow.tsx`; browser preview `bun run webdev` (`?impound=1`).
