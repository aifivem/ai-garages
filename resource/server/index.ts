import {
  AdminPanel,
  aiLog,
  aiLogChannels,
  entityCoords,
  EntityState,
  isNear,
  onClientCallback,
  online,
  resourceExport,
  vehicleFromNet,
} from "@aicore-fivem/lib/server";
import {
  fail,
  readId,
  readText,
  toVehicleProps,
  type VehicleProps,
} from "@aicore-fivem/lib/shared";
import {
  VEHICLE_BAGS,
  type OwnedVehicle,
  type VehicleOwner,
} from "@aicore-fivem/shared";
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
const garages = panel.view("garages", readGarages);
const settings = panel.view("settings", readSettings);
aiLogChannels({ garage: { active: false }, impound: {} });

/** The look and tuning the server knows: ai-vehicles' / ai-mechanic's bag on the entity. */
const propsBag = new EntityState(
  VEHICLE_BAGS.props,
  (v) => toVehicleProps(v) ?? undefined,
);

/** A point is inside the garage's area (plus `slack` metres). */
function inArea(
  point: { x: number; y: number; z: number },
  garage: Garage,
  slack: number,
): boolean {
  return (
    Math.hypot(point.x - garage.x, point.y - garage.y) <=
      garage.radius + slack && Math.abs(point.z - garage.z) < 10
  );
}
const inGarage = (source: number, garage: Garage, slack = 2): boolean =>
  inArea(entityCoords(GetPlayerPed(String(source))), garage, slack);

/** Owners whose vehicles the player may use at this garage: the character, or the garage's jobs the player has. */
function ownersAt(source: number, garage: Garage): VehicleOwner[] {
  const character = online.character(source);
  if (!character) return [];
  if (garage.jobs.length === 0)
    return [{ type: "character", id: String(character.id) }];
  return online
    .jobs(source)
    .filter((job) => garage.jobs.includes(job))
    .map((job) => ({ type: "job", id: job }));
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

/** Seats checked for other occupants (driver -1 to the last passenger seat of the biggest vehicles). */
const SEATS = 16;

/** The caller drives it, or it stands empty with the caller beside it (parking right after stepping out). */
function parkableBy(source: number, vehicle: number): boolean {
  const ped = GetPlayerPed(String(source));
  const driver = GetPedInVehicleSeat(vehicle, -1);
  for (let seat = 0; seat < SEATS - 1; seat++) {
    const rider = GetPedInVehicleSeat(vehicle, seat);
    if (rider && rider !== ped) return false;
  }
  if (driver === ped) return true;
  return !driver && isNear(source, entityCoords(vehicle), 6);
}

/**
 * What parking stores: the server's look and tuning (only ai-mechanic changes them) with the client's dirt and the
 * server's health. A vehicle without a stored look keeps the client's colours, never its mods (no paid tuning yet).
 */
function parkedProps(
  client: VehicleProps,
  vehicle: OwnedVehicle,
  entity: number,
): VehicleProps {
  const health = {
    plate: vehicle.plate,
    model: GetEntityModel(entity),
    dirt: Math.min(15, Math.max(0, client.dirt)),
    engineHealth: GetVehicleEngineHealth(entity),
    bodyHealth: GetVehicleBodyHealth(entity),
  };
  const known = propsBag.get(entity) ?? toVehicleProps(vehicle.props);
  if (known) return { ...known, ...health };
  return {
    ...client,
    ...health,
    mods: {},
    neon: [false, false, false, false],
  };
}

onClientCallback(
  EVENTS.list,
  {
    args: ([id]) => {
      const garageId = readText(id, 64);
      return garageId === null ? null : [garageId];
    },
    rate: { count: 2, windowMs: 2000 },
  },
  (source, garageId) => {
    const garage = garages.value.get(garageId);
    if (!garage || !inGarage(source, garage)) return fail("GARAGE_ERR_FAR");
    const fee = garage.impound ? settings.value.impoundFee : 0;
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

/** Takes the impound fee from the first account that has it; the account, or null when none could pay. */
function chargeFee(source: number, fee: number): string | null {
  return (
    settings.value.accounts.find((a) =>
      core.RemoveMoney(source, a, fee, "impound"),
    ) ?? null
  );
}

onClientCallback(
  EVENTS.takeOut,
  {
    args: ([garageId, vehicleId]) => {
      const garage = readText(garageId, 64);
      const id = readId(vehicleId);
      return garage === null || id === null ? null : [garage, id];
    },
    lock: true,
  },
  async (source, garageId, vehicleId) => {
    const garage = garages.value.get(garageId);
    const vehicle = vehiclesApi.GetVehicle(vehicleId);
    if (!garage || !inGarage(source, garage)) return fail("GARAGE_ERR_FAR");
    if (
      !vehicle ||
      !mayUse(source, garage, vehicle) ||
      !available(source, garage).some((v) => v.id === vehicleId)
    )
      return fail("GARAGE_ERR_GONE");
    const fee = garage.impound ? settings.value.impoundFee : 0;
    const paidFrom = fee > 0 ? chargeFee(source, fee) : null;
    if (fee > 0 && paidFrom === null) return fail("GARAGE_ERR_MONEY");
    const netId = await new Promise<number | null>((resolve) =>
      vehiclesApi.SpawnVehicle(vehicleId, garage.spawn, source, resolve),
    );
    if (netId === null) {
      if (paidFrom !== null)
        core.AddMoney(source, paidFrom, fee, "impound refund");
      return fail("GARAGE_ERR_SPAWN");
    }
    if (garage.impound)
      aiLog("impound", `took ${vehicle.plate} out of the impound for $${fee}`, {
        source,
        metadata: { plate: vehicle.plate, fee },
      });
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
    args: ([garageId, netId, props]) => {
      const garage = readText(garageId, 64);
      const id = readId(netId);
      const parsed = toVehicleProps(props);
      return garage === null || id === null || !parsed
        ? null
        : [garage, id, parsed];
    },
    lock: true,
  },
  (source, garageId, netId, props) => {
    const garage = garages.value.get(garageId);
    if (!garage || garage.impound || !inGarage(source, garage, 4))
      return fail("GARAGE_ERR_FAR");
    const entity = vehicleFromNet(netId);
    if (!entity || !inArea(entityCoords(entity), garage, 4))
      return fail("GARAGE_ERR_FAR");
    if (!parkableBy(source, entity)) return fail("GARAGE_ERR_OCCUPIED");
    const id = vehiclesApi.GetVehicleIdByEntity(entity);
    const vehicle = id !== null ? vehiclesApi.GetVehicle(id) : null;
    if (!vehicle || id === null) return fail("GARAGE_ERR_NOT_OWNED");
    if (!mayUse(source, garage, vehicle)) return fail("GARAGE_ERR_NOT_YOURS");
    vehiclesApi.SaveVehicle(id, {
      props: parkedProps(props, vehicle, entity),
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
