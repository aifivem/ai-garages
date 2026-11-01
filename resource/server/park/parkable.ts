import { entityCoords, isNear } from "@aicore-fivem/lib/server";

/** Seats checked for other occupants (driver -1 to the last passenger seat of the biggest vehicles). */
const SEATS = 16;

/** The caller drives it, or it stands empty with the caller beside it (parking right after stepping out). */
export function parkableBy(source: number, vehicle: number): boolean {
  const ped = GetPlayerPed(String(source));
  const driver = GetPedInVehicleSeat(vehicle, -1);
  for (let seat = 0; seat < SEATS - 1; seat++) {
    const rider = GetPedInVehicleSeat(vehicle, seat);
    if (rider && rider !== ped) return false;
  }
  if (driver === ped) return true;
  return !driver && isNear(source, entityCoords(vehicle), 6);
}
