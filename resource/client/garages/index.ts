import { onCache, onMembershipChange } from "@aicore-fivem/lib/client";
import { isRecord, readId } from "@aicore-fivem/lib/shared";
import { world } from "../world";
import { garages, page } from "./garages";

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
