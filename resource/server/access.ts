import { online } from "@aicore-fivem/lib/server";
import { isPublic } from "@aicore-fivem/lib/shared";
import type { OwnedVehicle, VehicleOwner } from "@aicore-fivem/shared";
import type { Garage } from "common/garages";
import { vehiclesApi } from "./core";

/**
 * Owners whose vehicles the player may use at this garage: the character (public garage), or each of the garage's
 * jobs and gangs the player passes the access rule for (grade, duty) on its own.
 */
function ownersAt(source: number, garage: Garage): VehicleOwner[] {
  const character = online.character(source);
  if (!character) return [];
  const rule = garage.access;
  if (isPublic(rule)) return [{ type: "character", id: String(character.id) }];
  const owners: VehicleOwner[] = [];
  for (const job of rule.jobs)
    if (online.allows(source, { ...rule, jobs: [job], gangs: [] }))
      owners.push({ type: "job", id: job });
  for (const gang of rule.gangs)
    if (online.allows(source, { ...rule, jobs: [], gangs: [gang] }))
      owners.push({ type: "gang", id: gang });
  // A gang garage also stores its members' own cars, as qb-garages does.
  if (owners.some((o) => o.type === "gang"))
    owners.push({ type: "character", id: String(character.id) });
  return owners;
}

/** What the player can take out here: stored in this garage, or (impound) everything waiting at the impound. */
export function available(source: number, garage: Garage): OwnedVehicle[] {
  const list = ownersAt(source, garage).flatMap((owner) =>
    vehiclesApi.GetVehicles(owner),
  );
  return list.filter((v) =>
    garage.impound
      ? v.state === "impound"
      : v.state === "garage" &&
        (v.garage === garage.id ||
          (!isPublic(garage.access) &&
            v.garage === null &&
            v.owner.type !== "character")),
  );
}

export const mayUse = (
  source: number,
  garage: Garage,
  vehicle: OwnedVehicle,
): boolean =>
  ownersAt(source, garage).some(
    (o) => o.type === vehicle.owner.type && o.id === vehicle.owner.id,
  );
