import { useEffect, useState } from "react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCarSide, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { GarageVehicle, NuiMessage } from "../../resource/common/garages";
import { Button } from "./components/ui/button";
import { VirtualList } from "./components/VirtualList";
import { MOCK_OPEN } from "./dev/mock";
import { setTexts, useLang } from "./lib/lang";

type OpenData = Extract<NuiMessage, { action: "open" }>["data"];
const OPEN_MOCK = { mockData: MOCK_OPEN, mockDelay: 100 };

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col gap-[0.4vh]">
      <span className="text-[1.05vh] uppercase tracking-[0.16em] text-text-3">{label}</span>
      <div className="h-[0.5vh] overflow-hidden rounded-full bg-raised">
        <div className={`h-full rounded-full ${value < 25 ? "bg-danger" : value < 60 ? "bg-warn" : "bg-accent"}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Row({ vehicle, label, busy, onTake }: { vehicle: GarageVehicle; label: string; busy: boolean; onTake: () => void }) {
  const t = useLang();
  return (
    <div className="flex h-[9.6vh] items-center gap-[1.6vh] rounded-[1vh] border border-line bg-bg px-[1.6vh]">
      <div className="flex size-[5vh] shrink-0 items-center justify-center rounded-[0.8vh] border border-line bg-raised">
        <FontAwesomeIcon icon={faCarSide} className="text-[2vh] text-text-3" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[0.8vh]">
        <div className="flex items-baseline gap-[1vh]">
          <span className="truncate text-[1.6vh] font-semibold text-text">{label}</span>
          <span className="rounded-[0.4vh] border border-line px-[0.6vh] text-[1.15vh] font-semibold tracking-[0.12em] text-text-2">{vehicle.plate}</span>
        </div>
        <div className="flex gap-[1.2vh]">
          <Bar label={t("UI_FUEL")} value={vehicle.fuel} />
          <Bar label={t("UI_ENGINE")} value={vehicle.engine / 10} />
          <Bar label={t("UI_BODY")} value={vehicle.body / 10} />
        </div>
      </div>
      <Button variant="primary" size="sm" busy={busy} onClick={onTake}>
        {vehicle.fee > 0 ? t("UI_TAKE_OUT_FEE", vehicle.fee) : t("UI_TAKE_OUT")}
      </Button>
    </div>
  );
}

/** The garage list: the player's vehicles parked here (or waiting at the impound), each with a take out button. */
export function App() {
  const t = useLang();
  const [data, setData] = useState<OpenData | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useNuiEvent<OpenData>(
    "open",
    (d) => {
      setTexts(d.texts);
      setData(d);
    },
    OPEN_MOCK,
  );
  useNuiEvent("close", () => setData(null));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && data) void fetchNui("close", undefined, { mockData: { ok: true } });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data]);

  if (!data) return null;
  const take = async (id: number) => {
    setBusy(id);
    await fetchNui("takeOut", { id }, { mockData: { ok: true } }).catch(() => null);
    setBusy(null);
  };
  return (
    <div className="fixed inset-0 flex animate-fade items-center justify-end bg-[rgba(var(--bg-rgb),0.35)] pr-[6vh]">
      <section className="flex w-[64vh] animate-rise flex-col gap-[1.6vh] rounded-[1.2vh] border border-line bg-panel p-[2vh] [box-shadow:0_2.4vh_6.4vh_rgba(0,0,0,0.5)]">
        <header className="flex items-start justify-between">
          <div className="flex flex-col gap-[0.4vh]">
            <span className="text-[1.2vh] uppercase tracking-[0.24em] text-text-3">{data.list.garage.impound ? t("UI_IMPOUND") : t("UI_GARAGE")}</span>
            <h1 className="text-[2.2vh] font-semibold leading-none">{data.list.garage.label}</h1>
          </div>
          <Button variant="icon" aria-label={t("UI_CLOSE")} onClick={() => void fetchNui("close", undefined, { mockData: { ok: true } })}>
            <FontAwesomeIcon icon={faXmark} />
          </Button>
        </header>
        <VirtualList
          className="max-h-[62vh]"
          items={data.list.vehicles}
          estimateSize={9.6}
          gap={0.8}
          getItemKey={(v) => v.id}
          empty={<p className="py-[5vh] text-center text-[1.4vh] text-text-3">{t("UI_EMPTY")}</p>}
          renderItem={(v) => <Row vehicle={v} label={data.labels[v.model] ?? v.model} busy={busy === v.id} onTake={() => void take(v.id)} />}
        />
      </section>
    </div>
  );
}
