import {
  AdminWorld,
  cache,
  callAction,
  getVehicleProps,
  hasJob,
  loadLocaleTexts,
  notify,
  NuiScreen,
  onCache,
  onMembershipChange,
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

/** The list page; closing it forgets which garage was open. */
const page = new NuiScreen<NuiMessage>("garage", {
  onClose: () => garages.forget(),
});

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
        // A job fleet garage shows (and has a blip) only for that job's members.
        blip:
          garage.blip && (garage.jobs.length === 0 || hasJob(garage.jobs))
            ? {
                ...settings.value.blips[
                  garage.impound ? "impound" : garage.type
                ],
                label: garage.label,
              }
            : undefined,
        canShow: () => !driving() && hasJob(garage.jobs),
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
      list.vehicles.map((v) => [v.model, vehicleLabel(v.model)]),
    );
    this.open = id;
    page.open({ action: "open", data: { texts, list, labels } });
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
    page.close();
    notify(Locale("GARAGE_TAKEN"), "success", 2500);
    return true;
  }

  forget(): void {
    this.open = null;
  }
}

const garages = new Garages();
garages.rebuild();
world.onChange("garages", () => garages.rebuild());
world.onChange("settings", () => garages.rebuild());
// Blips follow memberships: a rebuild (rare: joining or leaving a job).
onMembershipChange(() => garages.rebuild());
onCache("seat", () => garages.points.refresh());

page.on(
  "takeOut",
  (data) => (isRecord(data) ? readId(data.id) : null),
  async (id) => ({ ok: await garages.takeOut(id) }),
);
