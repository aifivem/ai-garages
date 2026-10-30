import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCarBurst, faCarSide, faGasPump, faKey, faWrench, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import type { GarageVehicle } from "../../../resource/common/garages";
import { Button } from "../components/ui/button";
import { useLang } from "../lib/lang";
import { cn } from "../lib/utils";

const STAT_COLOR = { engine: "text-text-2", body: "text-warn", fuel: "text-tgi-green" } as const;
const BAR_COLOR = { engine: "bg-text-2", body: "bg-warn", fuel: "bg-tgi-green" } as const;

function StatBar({ kind, icon, label, percent }: { kind: keyof typeof STAT_COLOR; icon: IconDefinition; label: string; percent: number }) {
  const value = Math.max(0, Math.min(100, Math.floor(percent)));
  return (
    <div className="flex min-w-0 flex-col gap-[0.7vh] rounded-[0.8vh] bg-white/3 px-[1.2vh] py-[1vh]">
      <div className="flex items-center gap-[0.8vh]">
        <FontAwesomeIcon icon={icon} className={cn("text-[1.4vh]", STAT_COLOR[kind])} />
        <span className="truncate text-[1.1vh] font-medium text-text-2 uppercase">{label}</span>
        <span className="ml-auto text-[1.2vh] font-bold tabular-nums">{value}%</span>
      </div>
      <div className="h-[0.4vh] w-full rounded-full bg-white/8">
        <div className={cn("h-full rounded-full", BAR_COLOR[kind])} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

interface Props {
  vehicle: GarageVehicle;
  label: string;
  impound: boolean;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onTake: () => void;
}

/** One vehicle (tgiann-realparking row): name and green plate, opens to its condition and the take out button. */
export function VehicleRow({ vehicle, label, impound, open, busy, onToggle, onTake }: Props) {
  const t = useLang();
  return (
    <div className={cn("rounded-[1vh] border bg-white/2 transition-colors duration-150", open ? "border-tgi-green" : "border-white/10 hover:border-tgi-green")}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex h-[4.6vh] w-full items-center justify-between gap-[1vh] px-[1.5vh] text-left">
        <span className="flex min-w-0 items-center gap-[0.9vh]">
          <FontAwesomeIcon icon={faCarSide} className={cn("text-[1.4vh]", open ? "text-tgi-green" : "text-text-4")} />
          <span className="truncate text-[1.5vh] text-white">{label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-[0.8vh] text-[1.5vh]">
          {impound && <span className="rounded-[0.3vh] bg-danger-bg px-[0.6vh] py-[0.3vh] text-[1vh] leading-none font-bold text-danger uppercase">{t("UI_IMPOUND")}</span>}
          <span className="text-text-3">{t("UI_PLATE")}</span>
          <span className="text-tgi-green tabular-nums">{vehicle.plate}</span>
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-[1.2vh] border-t border-white/4 p-[1.5vh]">
          <div className="grid grid-cols-3 gap-[0.8vh]">
            <StatBar kind="engine" icon={faWrench} label={t("UI_ENGINE")} percent={vehicle.engine / 10} />
            <StatBar kind="body" icon={faCarBurst} label={t("UI_BODY")} percent={vehicle.body / 10} />
            <StatBar kind="fuel" icon={faGasPump} label={t("UI_FUEL")} percent={vehicle.fuel} />
          </div>
          <div className="flex items-stretch gap-[0.6vh]">
            <span className="flex h-[4.4vh] shrink-0 items-center rounded-[0.6vh] border-2 border-dashed border-white/10 bg-white/3 px-[1.2vh] text-[1.6vh] font-bold text-text-2 tabular-nums">
              {vehicle.plate}
            </span>
            <Button variant="primary" className="flex-1" busy={busy} onClick={onTake}>
              {!busy && <FontAwesomeIcon icon={faKey} data-icon="inline-start" />}
              {vehicle.fee > 0 ? t("UI_TAKE_OUT_FEE", vehicle.fee) : t("UI_TAKE_OUT")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
