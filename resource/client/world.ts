import { AdminWorld } from "@aicore-fivem/lib/client";
import { readSettings } from "common/garages";

export const world = new AdminWorld(["garages", "settings"]);
export const settings = world.view("settings", readSettings);
