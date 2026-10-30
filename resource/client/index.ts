import {
  AdminWorld,
  cache,
  getVehicleProps,
  loadLocaleTexts,
  notify,
  onCache,
  Points,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import {
  EVENTS,
  readGarages,
  toGarageList,
  type Garage,
  type NuiMessage,
} from "common/garages";

const world = new AdminWorld(["garages", "settings"]);
const texts = loadLocaleTexts();
const BLIP_SPRITE: Record<Garage["type"], number> = {
  car: 357,
  boat: 356,
  air: 359,
};

const send = (m: NuiMessage): void => SendNUIMessage(m);
const errorOf = (v: unknown): string | null =>
  typeof v === "object" &&
  v !== null &&
  "ok" in v &&
  v.ok === false &&
  "error" in v &&
  typeof v.error === "string"
    ? v.error
    : null;
const fail = (error: string) => notify(texts[error] ?? error, "error");

const driving = (): boolean => cache.vehicle !== false && cache.seat === -1;

/**
 * Garages on this client: two points each (park while driving, open the list on foot; impounds only open), blips,
 * and the list screen.
 */
class Garages {
  readonly points = new Points();
  private open: string | null = null;

  rebuild(): void {
    this.points.clear();
    for (const garage of readGarages(world.get("garages")).values()) {
      const coords = { x: garage.x, y: garage.y, z: garage.z };
      if (!garage.impound)
        this.points.add(`park:${garage.id}`, {
          coords,
          label: Locale("GARAGE_PROMPT_PARK", garage.label),
          icon: "square-parking",
          radius: garage.radius,
          height: 10,
          promptOnly: true,
          canShow: driving,
          onPressed: () =>
            cache.vehicle !== false
              ? this.park(garage.id, cache.vehicle)
              : undefined,
        });
      this.points.add(`open:${garage.id}`, {
        ped: garage.ped ?? undefined,
        coords,
        label: Locale(
          garage.impound ? "GARAGE_PROMPT_IMPOUND" : "GARAGE_PROMPT_OPEN",
          garage.label,
        ),
        icon: "warehouse",
        radius: garage.radius,
        height: 10,
        targetRadius: 2,
        blip: garage.blip
          ? {
              sprite: garage.impound ? 68 : BLIP_SPRITE[garage.type],
              color: garage.impound ? 1 : 3,
              scale: 0.6,
              label: garage.label,
            }
          : undefined,
        canShow: () => !driving(),
        onPressed: () => this.openList(garage.id),
      });
    }
  }

  private async openList(id: string): Promise<void> {
    const raw: unknown = await triggerServerCallback(EVENTS.list, [id]).catch(
      () => null,
    );
    const error = errorOf(raw);
    const list = toGarageList(raw);
    if (error || !list) return fail(error ?? "GARAGE_ERR_FAR");
    // Labels are the game's names of the models.
    const labels = Object.fromEntries(
      list.vehicles.map((v) => [
        v.model,
        GetLabelText(GetDisplayNameFromVehicleModel(GetHashKey(v.model))),
      ]),
    );
    this.open = id;
    SetNuiFocus(true, true);
    send({ action: "open", data: { texts, list, labels } });
  }

  private async park(id: string, vehicle: number): Promise<void> {
    const props = getVehicleProps(vehicle);
    TaskLeaveVehicle(cache.ped, vehicle, 0);
    const result: unknown = await triggerServerCallback(EVENTS.park, [
      id,
      NetworkGetNetworkIdFromEntity(vehicle),
      props,
    ]).catch(() => null);
    const error = errorOf(result);
    if (error) fail(error);
    else notify(Locale("GARAGE_PARKED"), "success", 2500);
  }

  async takeOut(vehicleId: number): Promise<boolean> {
    if (!this.open) return false;
    const result: unknown = await triggerServerCallback(
      EVENTS.takeOut,
      [this.open, vehicleId],
      15_000,
    ).catch(() => null);
    const error = errorOf(result);
    if (error) {
      fail(error);
      return false;
    }
    this.close();
    notify(Locale("GARAGE_TAKEN"), "success", 2500);
    return true;
  }

  close(): void {
    this.open = null;
    SetNuiFocus(false, false);
    send({ action: "close", data: null });
  }
}

const garages = new Garages();
garages.rebuild();
world.onChange("garages", () => garages.rebuild());
onCache("seat", () => garages.points.refresh());

RegisterNuiCallback("takeOut", (data: unknown, cb: (r: unknown) => void) => {
  const id =
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof data.id === "number"
      ? data.id
      : null;
  if (id === null) return cb({ ok: false });
  void garages.takeOut(id).then((ok) => cb({ ok }));
});
RegisterNuiCallback("close", (_d: unknown, cb: (r: unknown) => void) => {
  garages.close();
  cb({ ok: true });
});
