import {
  AdminWorld,
  allows,
  cache,
  callAction,
  drivenVehicle,
  getVehicleProps,
  loadLocaleTexts,
  notify,
  NuiScreen,
  onCache,
  onMembershipChange,
  Points,
  vehicleLabel,
} from "@aicore-fivem/lib/client";
import {
  isPublic,
  isRecord,
  readId,
  RecordObjects,
} from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import {
  EVENTS,
  readGarage,
  readSettings,
  toGarageList,
  type Garage,
  type NuiMessage,
} from "common/garages";

const world = new AdminWorld(["garages", "settings"]);
const settings = world.view("settings", readSettings);
const texts = loadLocaleTexts();

/** The list page; closing it forgets which garage was open. */
const page = new NuiScreen<NuiMessage>("garage", {
  onClose: () => garages.forget(),
});

const driving = (): boolean => drivenVehicle() !== false;

/**
 * Garages on this client: two points each (park while driving, open the list on foot; impounds only open), blips,
 * and the list screen. An edited garage rebuilds only its own points.
 */
class Garages {
  readonly points = new Points();
  private open: string | null = null;
  readonly objects = new RecordObjects(world, "garages", readGarage, (id, g) =>
    this.build(id, g),
  );

  private build(id: string, garage: Garage): () => void {
    const coords = { x: garage.x, y: garage.y, z: garage.z };
    if (!garage.impound)
      this.points.add(`park:${id}`, {
        coords,
        label: Locale("GARAGE_PROMPT_PARK", garage.label),
        icon: "square-parking",
        radius: garage.radius,
        height: 10,
        promptOnly: true,
        canShow: driving,
        onPressed: () =>
          cache.vehicle !== false ? this.park(id, cache.vehicle) : undefined,
      });
    this.points.add(`open:${id}`, {
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
      // A job or gang fleet garage shows (and has a blip) only for who passes its access rule.
      blip:
        garage.blip && allows(garage.access)
          ? {
              ...settings.value.blips[garage.impound ? "impound" : garage.type],
              label: garage.label,
            }
          : undefined,
      canShow: () => !driving() && allows(garage.access),
      onPressed: () => this.openList(id),
    });
    return () => {
      this.points.remove(`park:${id}`);
      this.points.remove(`open:${id}`);
    };
  }

  /** Blips follow memberships: only the locked garages are built again. */
  rebuildLocked(): void {
    for (const [id, garage] of this.objects.records)
      if (!isPublic(garage.access)) this.objects.rebuild(id);
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
// Blip styles are settings every garage reads.
world.onChange("settings", () => garages.objects.rebuildAll());
// Blips follow memberships (rare: joining or leaving a job or gang).
onMembershipChange(() => garages.rebuildLocked());
onCache("seat", () => garages.points.refresh());

page.on(
  "takeOut",
  (data) => (isRecord(data) ? readId(data.id) : null),
  async (id) => ({ ok: await garages.takeOut(id) }),
);
