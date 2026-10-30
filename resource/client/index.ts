import {
  AdminWorld,
  cache,
  callAction,
  getVehicleProps,
  hud,
  loadLocaleTexts,
  notify,
  onCache,
  Points,
  vehicleLabel,
} from "@aicore-fivem/lib/client";
import { isRecord, readId } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import {
  EVENTS,
  readGarages,
  readSettings,
  toGarageList,
  type NuiMessage,
} from "common/garages";

const world = new AdminWorld(["garages", "settings"]);
const settings = world.view("settings", readSettings);
const texts = loadLocaleTexts();

const send = (m: NuiMessage): void => SendNUIMessage(m);

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
              ...settings.value.blips[garage.impound ? "impound" : garage.type],
              label: garage.label,
            }
          : undefined,
        canShow: () => !driving(),
        onPressed: () => this.openList(garage.id),
      });
    }
  }

  private async openList(id: string): Promise<void> {
    const list = toGarageList(
      await callAction(EVENTS.list, [id], { fallback: "GARAGE_ERR_FAR" }),
    );
    if (!list) return;
    // Labels are the game's names of the models.
    const labels = Object.fromEntries(
      list.vehicles.map((v) => [
        v.model,
        vehicleLabel(v.model),
      ]),
    );
    this.open = id;
    SetNuiFocus(true, true);
    hud.hide("garage");
    send({ action: "open", data: { texts, list, labels } });
  }

  private async park(id: string, vehicle: number): Promise<void> {
    const props = getVehicleProps(vehicle);
    TaskLeaveVehicle(cache.ped, vehicle, 0);
    const result = await callAction(
      EVENTS.park,
      [id, NetworkGetNetworkIdFromEntity(vehicle), props],
      { fallback: "GARAGE_ERR_FAR" },
    );
    if (result) notify(Locale("GARAGE_PARKED"), "success", 2500);
  }

  async takeOut(vehicleId: number): Promise<boolean> {
    if (!this.open) return false;
    const result = await callAction(EVENTS.takeOut, [this.open, vehicleId], {
      fallback: "GARAGE_ERR_SPAWN",
      timeout: 15_000,
    });
    if (!result) return false;
    this.close();
    notify(Locale("GARAGE_TAKEN"), "success", 2500);
    return true;
  }

  close(): void {
    this.open = null;
    SetNuiFocus(false, false);
    hud.show("garage");
    send({ action: "close", data: null });
  }
}

const garages = new Garages();
garages.rebuild();
world.onChange("garages", () => garages.rebuild());
world.onChange("settings", () => garages.rebuild());
onCache("seat", () => garages.points.refresh());

RegisterNuiCallback("takeOut", (data: unknown, cb: (r: unknown) => void) => {
  const id = isRecord(data) ? readId(data.id) : null;
  if (id === null) return cb({ ok: false });
  void garages.takeOut(id).then((ok) => cb({ ok }));
});
RegisterNuiCallback("close", (_d: unknown, cb: (r: unknown) => void) => {
  garages.close();
  cb({ ok: true });
});
