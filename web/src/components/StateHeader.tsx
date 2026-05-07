import type { EnginePayload, EngineState } from "@/lib/types";

interface Props {
  state: EnginePayload;
}

const STEPS: { num: number; label: string; states: EngineState[] }[] = [
  { num: 1, label: "Setup", states: ["SETUP"] },
  { num: 2, label: "Sync", states: ["SYNC", "SYNC_CONFIRM"] },
  { num: 3, label: "Calibrate", states: ["CALIBRATE"] },
  { num: 4, label: "Track", states: ["WARMING_UP", "TRACKING"] },
];

const NEXT_ACTION: Record<EngineState, string> = {
  SETUP: "Focus camera, set exposure, then tap Begin Sync",
  SYNC: "Center a star in your eyepiece, tap Solve frame",
  SYNC_CONFIRM: "Tap the star you actually centered",
  CALIBRATE: "Push the scope UP and hold steady",
  WARMING_UP: "Acquiring stars…",
  TRACKING: "Tracking — push the scope to your target",
  RECONNECTING: "Reconnecting to camera…",
  ERROR: "Engine error — restart required",
};

export function StateHeader({ state }: Props) {
  const currentState = state.state;
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-lg tracking-tight">PushNav</span>
      </div>
      <div className="flex items-center gap-1">
        {STEPS.map((step) => {
          const active = step.states.includes(currentState);
          return (
            <span
              key={step.num}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step.num} {step.label}
            </span>
          );
        })}
      </div>
      <div className="flex flex-col md:items-end text-sm">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {currentState}
        </span>
        <span className="text-foreground">{NEXT_ACTION[currentState]}</span>
      </div>
    </div>
  );
}
