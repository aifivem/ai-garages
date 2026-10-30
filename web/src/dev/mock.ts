import en from "../../../locales/en.json"

/** Browser preview only (`bun run webdev`): `?impound=1` shows the impound lot. */
const impound =
  new URLSearchParams(window.location.search).get("impound") !== null

export const MOCK_OPEN = {
  texts: en,
  labels: {
    sultan: "Karin Sultan",
    adder: "Truffade Adder",
    bison: "Bravado Bison",
    elegy: "Annis Elegy RH8",
    comet2: "Pfister Comet",
    baller: "Gallivanter Baller",
  },
  list: {
    ok: true as const,
    garage: {
      id: impound ? "impound" : "legion",
      label: impound ? "Impound Lot" : "Legion Square Parking",
      impound,
    },
    vehicles: [
      {
        id: 1,
        plate: "AI00001",
        model: "sultan",
        fuel: 82,
        engine: 1000,
        body: 940,
        fee: impound ? 500 : 0,
      },
      {
        id: 2,
        plate: "AI00002",
        model: "adder",
        fuel: 18,
        engine: 560,
        body: 410,
        fee: impound ? 500 : 0,
      },
      {
        id: 3,
        plate: "AI00003",
        model: "bison",
        fuel: 51,
        engine: 880,
        body: 990,
        fee: impound ? 500 : 0,
      },
      {
        id: 4,
        plate: "48KTR215",
        model: "elegy",
        fuel: 94,
        engine: 990,
        body: 1000,
        fee: impound ? 500 : 0,
      },
      {
        id: 5,
        plate: "07BXN933",
        model: "comet2",
        fuel: 66,
        engine: 720,
        body: 650,
        fee: impound ? 500 : 0,
      },
      {
        id: 6,
        plate: "19PZA746",
        model: "baller",
        fuel: 37,
        engine: 940,
        body: 870,
        fee: impound ? 500 : 0,
      },
    ],
  },
}
