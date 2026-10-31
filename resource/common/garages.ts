import {
  bool,
  int,
  num,
  type PlacePed,
  readBlipStyle,
  readPlacePed,
  record,
  str,
  vec4,
  type Vec4,
} from "@aicore-fivem/lib/shared";

/** ai-garages' contracts and panel content. No natives. */

export const EVENTS = {
  /** Callback: (garageId) -> GarageList | { ok: false, error } the vehicles the player can take out here. */
  list: "ai-garages:list",
  /** Callback: (garageId, vehicleId) -> { ok } spawn it at the garage. */
  takeOut: "ai-garages:takeOut",
  /** Callback: (garageId, netId, props) -> { ok } park the vehicle the player drives. */
  park: "ai-garages:park",
} as const;

export type GarageType = "car" | "boat" | "air";

export interface Garage {
  /** NPC standing at the place (panel), null for none. */
  ped: PlacePed | null;
  id: string;
  label: string;
  type: GarageType;
  x: number;
  y: number;
  z: number;
  radius: number;
  spawn: Vec4;
  /** Empty: a public garage for owned vehicles. Otherwise the fleet of these jobs. */
  jobs: string[];
  /** Lists vehicles waiting at the impound instead (fee to take out). */
  impound: boolean;
  blip: boolean;
}

export interface BlipStyle {
  sprite: number;
  color: number;
  scale: number;
}

export interface Settings {
  impoundFee: number;
  accounts: string[];
  /** Map blip look per garage type, impound lots apart. */
  blips: Record<GarageType | "impound", BlipStyle>;
}

export const DEFAULT_BLIPS: Settings["blips"] = {
  car: { sprite: 357, color: 3, scale: 0.6 },
  boat: { sprite: 356, color: 3, scale: 0.6 },
  air: { sprite: 360, color: 3, scale: 0.6 },
  impound: { sprite: 68, color: 3, scale: 0.6 },
};

const readBlip = (v: unknown, d: BlipStyle): BlipStyle => {
  const r = record(v);
  return readBlipStyle(r, { sprite: d.sprite, color: d.color, scale: d.scale });
};

/** One row of the garage screen. */
export interface GarageVehicle {
  id: number;
  plate: string;
  model: string;
  fuel: number;
  engine: number;
  body: number;
  /** Fee to take it out (impound), 0 otherwise. */
  fee: number;
}

export interface GarageList {
  ok: true;
  garage: { id: string; label: string; impound: boolean };
  vehicles: GarageVehicle[];
}

const TYPES: GarageType[] = ["car", "boat", "air"];

export function readGarages(raw: unknown): Map<string, Garage> {
  const out = new Map<string, Garage>();
  for (const [id, value] of Object.entries(record(raw))) {
    const v = record(value);
    const c = record(v.coords);
    out.set(id, {
      ped: readPlacePed(v.ped),
      id,
      label: str(v.label, id, 48),
      type: TYPES.includes(v.type as GarageType)
        ? (v.type as GarageType)
        : "car",
      x: num(c.x, 0),
      y: num(c.y, 0),
      z: num(c.z, 0),
      radius: num(v.radius, 12, 2, 50),
      spawn: vec4(v.spawn, {
        x: num(c.x, 0),
        y: num(c.y, 0),
        z: num(c.z, 0),
        heading: 0,
      }),
      jobs: Array.isArray(v.jobs)
        ? v.jobs.filter((j): j is string => typeof j === "string")
        : [],
      impound: bool(v.impound, false),
      blip: bool(v.blip, true),
    });
  }
  return out;
}

export function readSettings(raw: unknown): Settings {
  const s = record(raw);
  const accounts = Array.isArray(s.accounts)
    ? s.accounts.filter((a): a is string => typeof a === "string")
    : [];
  const blips = record(s.blips);
  return {
    impoundFee: int(s.impoundFee, 500, 0, 1_000_000),
    accounts: accounts.length ? accounts : ["cash", "bank"],
    blips: {
      car: readBlip(blips.car, DEFAULT_BLIPS.car),
      boat: readBlip(blips.boat, DEFAULT_BLIPS.boat),
      air: readBlip(blips.air, DEFAULT_BLIPS.air),
      impound: readBlip(blips.impound, DEFAULT_BLIPS.impound),
    },
  };
}

/** The server's list answer, checked (msgpack may turn values into null). */
export function toGarageList(v: unknown): GarageList | null {
  const r = record(v);
  const g = record(r.garage);
  if (r.ok !== true || typeof g.id !== "string" || !Array.isArray(r.vehicles))
    return null;
  const vehicles = r.vehicles.flatMap((row): GarageVehicle[] => {
    const x = record(row);
    if (
      typeof x.id !== "number" ||
      typeof x.plate !== "string" ||
      typeof x.model !== "string"
    )
      return [];
    return [
      {
        id: x.id,
        plate: x.plate,
        model: x.model,
        fuel: num(x.fuel, 100),
        engine: num(x.engine, 1000),
        body: num(x.body, 1000),
        fee: num(x.fee, 0),
      },
    ];
  });
  return {
    ok: true,
    garage: {
      id: g.id,
      label: str(g.label, g.id, 48),
      impound: g.impound === true,
    },
    vehicles,
  };
}

/** Client -> NUI messages. */
export type NuiMessage =
  | {
      action: "open";
      data: {
        texts: Record<string, string>;
        list: GarageList;
        labels: Record<string, string>;
      };
    }
  | { action: "close"; data: null };
