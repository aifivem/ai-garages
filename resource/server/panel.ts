import { AdminPanel } from "@aicore-fivem/lib/server";
import { readGarage, readSettings } from "common/garages";
import { garagesSchema } from "./schema";

const panel = new AdminPanel(garagesSchema);
export const garages = panel.records("garages", readGarage);
export const settings = panel.view("settings", readSettings);
