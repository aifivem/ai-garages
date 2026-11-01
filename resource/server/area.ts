import { entityCoords } from "@aicore-fivem/lib/server";
import { flatDistance } from "@aicore-fivem/lib/shared";
import type { Garage } from "common/garages";

/** A point is inside the garage's area (plus `slack` metres). */
export function inArea(
  point: { x: number; y: number; z: number },
  garage: Garage,
  slack: number,
): boolean {
  return (
    flatDistance(point, garage) <= garage.radius + slack &&
    Math.abs(point.z - garage.z) < 10
  );
}
export const inGarage = (source: number, garage: Garage, slack = 2): boolean =>
  inArea(entityCoords(GetPlayerPed(String(source))), garage, slack);
