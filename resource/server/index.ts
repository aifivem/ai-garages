import {
  AdminPanel,
  aiLog,
  aiLogChannels,
  onClientCallback,
  resourceExport,
} from "@aicore-fivem/lib/server";
import type { OwnedVehicle, VehicleOwner } from "@aicore-fivem/shared";
import {
  EVENTS,
  readGarages,
  readSettings,
  type Garage,
  type GarageList,
} from "common/garages";
import { garagesSchema } from "./schema";

const core = resourceExport("ai-core");
const vehiclesApi = resourceExport("ai-vehicles");
const panel = new AdminPanel(garagesSchema);
/** Panel content, parsed again after every change. */
const content = {
  garages: readGarages(panel.get("garages")),
  settings: readSettings(panel.get("settings")),
};
panel.onChange(
  "garages",
  () => (content.garages = readGarages(panel.get("garages"))),
);
panel.onChange(
  "settings",
  () => (content.settings = readSettings(panel.get("settings"))),
);
aiLogChannels({ garage: { active: false }, impound: {} });

const fail = (error: string) => ({ ok: false as const, error });

function inGarage(source: number, garage: Garage, slack = 2): boolean {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
  return (
    Math.hypot(x - garage.x, y - garage.y) <= garage.radius + slack &&
    Math.abs(z - garage.z) < 10
  );
}

/** Owners whose vehicles the player may use at this garage: the character, or the garage's jobs the player has. */
function ownersAt(source: number, garage: Garage): VehicleOwner[] {
  const character = core.GetCharacter(source);
  if (!character) return [];
  if (garage.jobs.length === 0)
    return [{ type: "character", id: String(character.id) }];
  return (core.GetJobs(source) ?? [])
    .filter((m) => garage.jobs.includes(m.job))
    .map((m) => ({ type: "job", id: m.job }));
}

/** What the player can take out here: stored in this garage, or (impound) everything waiting at the impound. */
function available(source: number, garage: Garage): OwnedVehicle[] {
  const list = ownersAt(source, garage).flatMap((owner) =>
    vehiclesApi.GetVehicles(owner),
  );
  return list.filter((v) =>
    garage.impound
      ? v.state === "impound"
      : v.state === "garage" &&
        (v.garage === garage.id ||
          (garage.jobs.length > 0 && v.garage === null)),
  );
}

const mayUse = (
  source: number,
  garage: Garage,
  vehicle: OwnedVehicle,
): boolean =>
  ownersAt(source, garage).some(
    (o) => o.type === vehicle.owner.type && o.id === vehicle.owner.id,
  );

onClientCallback(
  EVENTS.list,
  { args: ([id]) => (typeof id === "string" ? [id] : null) },
  (source, garageId) => {
    const garage = content.garages.get(garageId);
    if (!garage || !inGarage(source, garage)) return fail("GARAGE_ERR_FAR");
    const fee = garage.impound ? content.settings.impoundFee : 0;
    const result: GarageList = {
      ok: true,
      garage: { id: garage.id, label: garage.label, impound: garage.impound },
      vehicles: available(source, garage).map((v) => ({
        id: v.id,
        plate: v.plate,
        model: v.model,
        fuel: v.fuel,
        engine: v.engine,
        body: v.body,
        fee,
      })),
    };
    return result;
  },
);

onClientCallback(
  EVENTS.takeOut,
  {
    args: ([garageId, vehicleId]) =>
      typeof garageId === "string" && typeof vehicleId === "number"
        ? [garageId, vehicleId]
        : null,
    lock: true,
  },
  async (source, garageId, vehicleId) => {
    const garage = content.garages.get(garageId);
    const vehicle = vehiclesApi.GetVehicle(vehicleId);
    if (!garage || !inGarage(source, garage)) return fail("GARAGE_ERR_FAR");
    if (
      !vehicle ||
      !mayUse(source, garage, vehicle) ||
      !available(source, garage).some((v) => v.id === vehicleId)
    )
      return fail("GARAGE_ERR_GONE");
    if (garage.impound) {
      const fee = content.settings.impoundFee;
      if (
        fee > 0 &&
        !content.settings.accounts.some((a) =>
          core.RemoveMoney(source, a, fee, "impound"),
        )
      )
        return fail("GARAGE_ERR_MONEY");
      aiLog("impound", `took ${vehicle.plate} out of the impound for $${fee}`, {
        source,
        metadata: { plate: vehicle.plate, fee },
      });
    }
    const netId = await new Promise<number | null>((resolve) =>
      vehiclesApi.SpawnVehicle(vehicleId, garage.spawn, source, resolve),
    );
    if (netId === null) return fail("GARAGE_ERR_SPAWN");
    aiLog("garage", `took ${vehicle.plate} out of ${garage.id}`, {
      source,
      metadata: { plate: vehicle.plate, garage: garage.id },
    });
    return { ok: true, netId };
  },
);

onClientCallback(
  EVENTS.park,
  {
    args: ([garageId, netId, props]) =>
      typeof garageId === "string" && typeof netId === "number"
        ? [garageId, netId, props]
        : null,
    lock: true,
  },
  (source, garageId, netId, props) => {
    const garage = content.garages.get(garageId);
    if (!garage || garage.impound || !inGarage(source, garage, 4))
      return fail("GARAGE_ERR_FAR");
    const entity = NetworkGetEntityFromNetworkId(netId);
    const id =
      entity && DoesEntityExist(entity)
        ? vehiclesApi.GetVehicleIdByEntity(entity)
        : null;
    const vehicle = id !== null ? vehiclesApi.GetVehicle(id) : null;
    if (!vehicle || id === null) return fail("GARAGE_ERR_NOT_OWNED");
    if (!mayUse(source, garage, vehicle)) return fail("GARAGE_ERR_NOT_YOURS");
    vehiclesApi.SaveVehicle(id, {
      props,
      engine: GetVehicleEngineHealth(entity),
      body: GetVehicleBodyHealth(entity),
    });
    vehiclesApi.StoreVehicle(id, garage.id, "garage");
    aiLog("garage", `parked ${vehicle.plate} in ${garage.id}`, {
      source,
      metadata: { plate: vehicle.plate, garage: garage.id },
    });
    return { ok: true };
  },
);
