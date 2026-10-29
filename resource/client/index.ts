import { AdminWorld, cache, getVehicleProps, hidePrompt, loadLocaleTexts, notify, onCache, onPromptPressed, showPrompt, triggerServerCallback, Zones } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS, readGarages, toGarageList, type Garage, type NuiMessage } from "common/garages";

const world = new AdminWorld(["garages", "settings"]);
const texts = loadLocaleTexts();
const BLIP_TEXT = "AIGARAGE_BLIP";
AddTextEntry(BLIP_TEXT, "~a~");
const BLIP_SPRITE: Record<Garage["type"], number> = { car: 357, boat: 356, air: 359 };

const send = (m: NuiMessage): void => SendNUIMessage(m);
const errorOf = (v: unknown): string | null =>
  typeof v === "object" && v !== null && "ok" in v && v.ok === false && "error" in v && typeof v.error === "string" ? v.error : null;
const fail = (error: string) => notify(texts[error] ?? error, "error");

/**
 * Garages on this client: a zone each with ai-core's prompt (park while driving, open the list on foot), blips, and
 * the list screen. The prompt text follows the player getting in or out while inside.
 */
class Garages {
  private readonly zones = new Zones();
  private blips: number[] = [];
  private list = readGarages(world.get("garages"));
  private inside: string | null = null;
  private open: string | null = null;

  rebuild(): void {
    this.list = readGarages(world.get("garages"));
    this.zones.clear();
    for (const blip of this.blips) RemoveBlip(blip);
    this.blips = [];
    for (const garage of this.list.values()) {
      this.zones.add(garage.id, {
        shape: { type: "cylinder", center: { x: garage.x, y: garage.y, z: garage.z }, radius: garage.radius, height: 10 },
        interval: 500,
        onEnter: () => {
          this.inside = garage.id;
          this.prompt();
        },
        onExit: () => {
          if (this.inside === garage.id) this.inside = null;
          hidePrompt(`garage:${garage.id}`);
        },
      });
      if (garage.blip) this.blips.push(this.blip(garage));
    }
  }

  /** "Park" while driving (not at an impound), "Open" on foot. */
  prompt(): void {
    const garage = this.inside ? this.list.get(this.inside) : undefined;
    if (!garage) return;
    const driving = cache.vehicle !== false && cache.seat === -1;
    if (driving && garage.impound) return hidePrompt(`garage:${garage.id}`);
    showPrompt(`garage:${garage.id}`, Locale(driving ? "GARAGE_PROMPT_PARK" : garage.impound ? "GARAGE_PROMPT_IMPOUND" : "GARAGE_PROMPT_OPEN", garage.label));
  }

  async press(id: string): Promise<void> {
    if (cache.vehicle !== false && cache.seat === -1) return this.park(id, cache.vehicle);
    const raw: unknown = await triggerServerCallback(EVENTS.list, [id]).catch(() => null);
    const error = errorOf(raw);
    const list = toGarageList(raw);
    if (error || !list) return fail(error ?? "GARAGE_ERR_FAR");
    // Labels are the game's names of the models.
    const labels = Object.fromEntries(list.vehicles.map((v) => [v.model, GetLabelText(GetDisplayNameFromVehicleModel(GetHashKey(v.model)))]));
    this.open = id;
    SetNuiFocus(true, true);
    send({ action: "open", data: { texts, list, labels } });
  }

  private async park(id: string, vehicle: number): Promise<void> {
    const props = getVehicleProps(vehicle);
    TaskLeaveVehicle(cache.ped, vehicle, 0);
    const result: unknown = await triggerServerCallback(EVENTS.park, [id, NetworkGetNetworkIdFromEntity(vehicle), props]).catch(() => null);
    const error = errorOf(result);
    if (error) fail(error);
    else notify(Locale("GARAGE_PARKED"), "success", 2500);
  }

  async takeOut(vehicleId: number): Promise<boolean> {
    if (!this.open) return false;
    const result: unknown = await triggerServerCallback(EVENTS.takeOut, [this.open, vehicleId], 15_000).catch(() => null);
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

  private blip(garage: Garage): number {
    const blip = AddBlipForCoord(garage.x, garage.y, garage.z);
    SetBlipSprite(blip, garage.impound ? 68 : BLIP_SPRITE[garage.type]);
    SetBlipColour(blip, garage.impound ? 1 : 3);
    SetBlipScale(blip, 0.6);
    SetBlipAsShortRange(blip, true);
    BeginTextCommandSetBlipName(BLIP_TEXT);
    AddTextComponentSubstringPlayerName(garage.label);
    EndTextCommandSetBlipName(blip);
    return blip;
  }
}

const garages = new Garages();
garages.rebuild();
world.onChange("garages", () => garages.rebuild());
onCache("seat", () => garages.prompt());
onPromptPressed((id) => {
  if (id.startsWith("garage:")) void garages.press(id.slice("garage:".length));
});

RegisterNuiCallback("takeOut", (data: unknown, cb: (r: unknown) => void) => {
  const id = typeof data === "object" && data !== null && "id" in data && typeof data.id === "number" ? data.id : null;
  if (id === null) return cb({ ok: false });
  void garages.takeOut(id).then((ok) => cb({ ok }));
});
RegisterNuiCallback("close", (_d: unknown, cb: (r: unknown) => void) => {
  garages.close();
  cb({ ok: true });
});
