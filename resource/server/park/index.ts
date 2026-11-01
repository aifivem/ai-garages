import {
  aiLog,
  entityCoords,
  onClientCallback,
  vehicleFromNet,
} from "@aicore-fivem/lib/server";
import {
  fail,
  readId,
  readText,
  toVehicleProps,
} from "@aicore-fivem/lib/shared";
import { EVENTS } from "common/garages";
import { mayUse } from "../access";
import { inArea, inGarage } from "../area";
import { condition } from "../condition";
import { vehiclesApi } from "../core";
import { garages } from "../panel";
import { parkableBy } from "./parkable";
import { parkedProps } from "./props";

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
    const garage = garages.get(garageId);
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
      ...condition(entity),
    });
    vehiclesApi.StoreVehicle(id, garage.id, "garage");
    aiLog("garage", `parked ${vehicle.plate} in ${garage.id}`, {
      source,
      metadata: { plate: vehicle.plate, garage: garage.id },
    });
    return { ok: true };
  },
);
