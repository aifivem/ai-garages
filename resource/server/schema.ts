import type { PanelSchema } from "@aicore-fivem/shared";

/** ai-garages' panel: garages, job garages, impound lots and the impound fee. */
export const garagesSchema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "square-parking",
  files: {
    garages: {
      kind: "records",
      sync: "all",
      labelPath: "label",
      newRecord: { label: "", type: "car", coords: { x: 0, y: 0, z: 0 }, radius: 12, spawn: { x: 0, y: 0, z: 0, heading: 0 }, jobs: [], impound: false, blip: true },
      sections: {
        label: { type: "text", min: 1, max: 48 },
        type: { type: "enum", values: ["car", "boat", "air"] },
        coords: { type: "vec3" },
        radius: { type: "number", min: 2, max: 50 },
        spawn: { type: "vec4" },
        jobs: { type: "names", max: 20, itemMax: 32, pattern: "^[a-z0-9_]{2,32}$" },
        impound: { type: "bool" },
        blip: { type: "bool" },
      },
    },
    settings: {
      kind: "settings",
      sync: "all",
      sections: { impoundFee: { type: "number", min: 0, max: 1_000_000, integer: true }, accounts: { type: "names", max: 5, itemMax: 32, pattern: "^[a-z0-9_]{2,32}$" } },
    },
  },
  tabs: [
    {
      id: "garages",
      file: "garages",
      icon: "square-parking",
      label: "ADMIN_TAB_GARAGES",
      desc: "ADMIN_TAB_GARAGES_DESC",
      listSub: "type",
      createLabel: "ADMIN_NEW_GARAGE",
      deleteLabel: "ADMIN_DELETE_GARAGE",
      deleteDesc: "ADMIN_DELETE_GARAGE_DESC",
      cards: [
        {
          icon: "square-parking",
          title: "ADMIN_C_GARAGE",
          desc: "ADMIN_C_GARAGE_DESC",
          fields: [
            { widget: "text", path: "label", label: "ADMIN_F_LABEL", placeholder: "ADMIN_P_LABEL" },
            {
              widget: "select",
              path: "type",
              label: "ADMIN_F_TYPE",
              options: [
                { value: "car", label: "ADMIN_O_CAR" },
                { value: "boat", label: "ADMIN_O_BOAT" },
                { value: "air", label: "ADMIN_O_AIR" },
              ],
            },
            { widget: "point", path: "coords", label: "ADMIN_F_COORDS", hint: "ADMIN_H_COORDS", ground: true },
            { widget: "number", path: "radius", label: "ADMIN_F_RADIUS", hint: "ADMIN_H_RADIUS", min: 2, max: 50, unit: "m" },
            { widget: "point", path: "spawn", label: "ADMIN_F_SPAWN", hint: "ADMIN_H_SPAWN", heading: true, ground: true },
            { widget: "tags", path: "jobs", label: "ADMIN_F_JOBS", hint: "ADMIN_H_JOBS", placeholder: "ADMIN_P_JOBS" },
            { widget: "switch", path: "impound", label: "ADMIN_F_IMPOUND", hint: "ADMIN_H_IMPOUND" },
            { widget: "switch", path: "blip", label: "ADMIN_F_BLIP" },
          ],
        },
      ],
    },
    {
      id: "settings",
      file: "settings",
      icon: "sliders",
      label: "ADMIN_TAB_SETTINGS",
      desc: "ADMIN_TAB_SETTINGS_DESC",
      cards: [
        {
          icon: "car-rear",
          title: "ADMIN_C_IMPOUND",
          desc: "ADMIN_C_IMPOUND_DESC",
          fields: [
            { widget: "number", path: "impoundFee", label: "ADMIN_F_FEE", hint: "ADMIN_H_FEE", min: 0, max: 1_000_000, step: 50, unit: "$" },
            { widget: "tags", path: "accounts", label: "ADMIN_F_ACCOUNTS", hint: "ADMIN_H_ACCOUNTS", placeholder: "ADMIN_P_ACCOUNTS" },
          ],
        },
      ],
    },
  ],
};
