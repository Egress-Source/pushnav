import type { EnginePayload } from "@/lib/types";
import { SetupStep } from "./SetupStep";
import { SyncStep } from "./SyncStep";
import { SyncConfirmStep } from "./SyncConfirmStep";
import { CalibrateStep } from "./CalibrateStep";
import { WarmingUpStep } from "./WarmingUpStep";
import { TrackingStep } from "./TrackingStep";

interface Props {
  state: EnginePayload;
}

export function Wizard({ state }: Props) {
  switch (state.state) {
    case "SETUP":        return <SetupStep state={state} />;
    case "SYNC":         return <SyncStep state={state} />;
    case "SYNC_CONFIRM": return <SyncConfirmStep state={state} />;
    case "CALIBRATE":    return <CalibrateStep state={state} />;
    case "WARMING_UP":   return <WarmingUpStep state={state} />;
    case "TRACKING":     return <TrackingStep state={state} />;
    case "RECONNECTING": return <div className="p-4">Reconnecting to camera…</div>;
    case "ERROR":        return <div className="p-4 text-destructive">Error — restart required</div>;
    default:             return null;
  }
}
