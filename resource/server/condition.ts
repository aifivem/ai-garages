import { fuel } from "@aicore-fivem/lib/server";

/** The server-read condition stored with a parked vehicle; fuel through ai-core's fuel layer (any fuel script). */
export function condition(entity: number): {
  engine: number;
  body: number;
  fuel?: number;
} {
  const level = fuel.get(entity);
  return {
    engine: GetVehicleEngineHealth(entity),
    body: GetVehicleBodyHealth(entity),
    ...(level !== null ? { fuel: level } : {}),
  };
}
