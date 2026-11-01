import { onClientCallback } from "@aicore-fivem/lib/server";
import { fail, readText } from "@aicore-fivem/lib/shared";
import { EVENTS, type GarageList } from "common/garages";
import { available } from "./access";
import { inGarage } from "./area";
import { garages, settings } from "./panel";

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
    const garage = garages.get(garageId);
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
