import { online, registerExport } from "@aicore-fivem/lib/server";
import type { GaragedVehicle } from "@aicore-fivem/shared";
import { condition } from "./condition";
import { vehiclesApi } from "./core";
import { garages } from "./panel";

/** An owned vehicle entity's ai-vehicles id, null for any other entity. */
function ownedId(entity: unknown): number | null {
  if (typeof entity !== "number" || !DoesEntityExist(entity)) return null;
  return vehiclesApi.GetVehicleIdByEntity(entity);
}

/** ai-core's garage layer (lib `garages`): impound, store and list through ai-garages. */
registerExport("ImpoundVehicle", (entity: unknown) => {
  const id = ownedId(entity);
  if (id === null) return false;
  vehiclesApi.SaveVehicle(id, condition(entity as number));
  vehiclesApi.StoreVehicle(id, null, "impound");
  return true;
});
registerExport("StoreVehicle", (entity: unknown, garageId: unknown) => {
  const id = ownedId(entity);
  const garage = typeof garageId === "string" ? garages.get(garageId) : null;
  if (id === null || !garage || garage.impound) return false;
  vehiclesApi.SaveVehicle(id, condition(entity as number));
  vehiclesApi.StoreVehicle(id, garage.id, "garage");
  return true;
});
registerExport("GetStoredVehicles", (source: unknown): GaragedVehicle[] => {
  const character =
    typeof source === "number" ? online.character(source) : null;
  if (!character) return [];
  return vehiclesApi
    .GetVehicles({ type: "character", id: String(character.id) })
    .filter((v) => v.state !== "out")
    .map((v) => ({
      plate: v.plate,
      model: v.model,
      garage: v.garage,
      impounded: v.state === "impound",
    }));
});
