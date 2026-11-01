import { EntityState } from "@aicore-fivem/lib/server";
import { toVehicleProps, type VehicleProps } from "@aicore-fivem/lib/shared";
import { VEHICLE_BAGS, type OwnedVehicle } from "@aicore-fivem/shared";

/** The look and tuning the server knows: ai-vehicles' / ai-mechanic's bag on the entity. */
const propsBag = new EntityState(
  VEHICLE_BAGS.props,
  (v) => toVehicleProps(v) ?? undefined,
);

/**
 * What parking stores: the server's look (the entity's props bag, else the stored props) with the client's dirt and
 * the server's health; a vehicle without a stored look takes the client's colours. ai-vehicles' `SaveVehicle` keeps
 * the stored mods and neon either way (only ai-mechanic's `SaveTuning` changes them).
 */
export function parkedProps(
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
  return { ...(known ?? client), ...health };
}
