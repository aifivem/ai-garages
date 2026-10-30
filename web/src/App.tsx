import { useEffect, useState } from "react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCarSide, faDoorOpen } from "@fortawesome/free-solid-svg-icons";
import type { NuiMessage } from "../../resource/common/garages";
import { Button } from "./components/ui/button";
import { VirtualList } from "./components/VirtualList";
import { MOCK_OPEN } from "./dev/mock";
import { setTexts, useLang } from "./lib/lang";
import { VehicleRow } from "./features/VehicleRow";

type OpenData = Extract<NuiMessage, { action: "open" }>["data"];
const OPEN_MOCK = { mockData: MOCK_OPEN, mockDelay: 100 };
const OK = { mockData: { ok: true } };
const close = () => void fetchNui("close", undefined, OK);

/** The garage list (tgiann-realparking look): the player's vehicles parked here (or at the impound), each opens to take it out. */
export function App() {
  const t = useLang();
  const [data, setData] = useState<OpenData | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useNuiEvent<OpenData>(
    "open",
    (d) => {
      setTexts(d.texts);
      setData(d);
      setOpen(d.list.vehicles[0]?.id ?? null);
    },
    OPEN_MOCK,
  );
  useNuiEvent("close", () => setData(null));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && data) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data]);

  if (!data) return null;
  const { garage, vehicles } = data.list;
  const take = async (id: number) => {
    setBusy(id);
    await fetchNui("takeOut", { id }, OK).catch(() => null);
    setBusy(null);
  };
  return (
    <div className="fixed inset-0 animate-fade">
      <section className="absolute right-[2vh] bottom-[2vh] flex w-[80vh] animate-rise flex-col overflow-hidden rounded-[1.4vh] bg-panel [box-shadow:0_2.4vh_6.4vh_rgba(0,0,0,0.6),inset_0_0.1vh_0_rgba(255,255,255,0.06)]">
        <header className="flex h-[6.4vh] shrink-0 items-center justify-between gap-[1vh] bg-header px-[1.2vh]">
          <div className="flex min-w-0 items-baseline gap-[1vh]">
            <h1 className="truncate font-display text-[1.6vh] leading-[1.3] font-extrabold tracking-[-0.01em] uppercase">{garage.label}</h1>
            <span className="shrink-0 text-[1.3vh] font-medium text-text-3">{garage.impound ? t("UI_IMPOUND") : t("UI_GARAGE")}</span>
          </div>
          <Button variant="icon" aria-label={t("UI_CLOSE")} title={t("UI_CLOSE")} onClick={close}>
            <FontAwesomeIcon icon={faDoorOpen} />
          </Button>
        </header>
        <VirtualList
          className="max-h-[50vh] p-[1vh]"
          items={vehicles}
          estimateSize={4.8}
          gap={0.5}
          getItemKey={(v) => v.id}
          empty={
            <div className="flex flex-col items-center gap-[1vh] py-[4vh] text-text-3">
              <FontAwesomeIcon icon={faCarSide} className="text-[2.4vh]" />
              <p className="text-[1.4vh]">{t("UI_EMPTY")}</p>
            </div>
          }
          renderItem={(v) => (
            <VehicleRow
              vehicle={v}
              label={data.labels[v.model] ?? v.model}
              impound={garage.impound}
              open={open === v.id}
              busy={busy === v.id}
              onToggle={() => setOpen(open === v.id ? null : v.id)}
              onTake={() => void take(v.id)}
            />
          )}
        />
      </section>
    </div>
  );
}
