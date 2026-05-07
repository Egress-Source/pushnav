import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { EnginePayload, EngineState } from "@/lib/types";

interface Props {
  state: EnginePayload;
}

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
    <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
      <span className="font-semibold text-lg tracking-tight text-primary">
        PushNav
      </span>
      <div className="flex items-center gap-3">
        <div className="flex flex-col md:items-end text-sm">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {currentState}
          </span>
          <span className="text-foreground">{NEXT_ACTION[currentState]}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            api.setSettings({ audio_enabled: !state.audio_enabled })
          }
          title={state.audio_enabled ? "Mute audio" : "Unmute audio"}
        >
          {state.audio_enabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
