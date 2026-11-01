import { aiLog, onClientCallback } from "@aicore-fivem/lib/server";
import { fail, readId, readText } from "@aicore-fivem/lib/shared";
import { EVENTS } from "common/garages";
import { available, mayUse } from "./access";
import { inGarage } from "./area";
import { core, vehiclesApi } from "./core";
import { garages, settings } from "./panel";

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
    const garage = garages.get(garageId);
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
