import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import type { EnginePayload } from "@/lib/types";

export function SyncStep({ state }: { state: EnginePayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2 — Sync</CardTitle>
        <CardDescription>
          Center a known bright star in your EYEPIECE (not the camera preview),
          then tap "Solve frame".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          The eyepiece view is what matters — the camera and eyepiece may not
          be perfectly aligned.
        </p>
        {state.sync.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.sync.error}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={state.sync.in_progress}
            onClick={() => api.wizardAdvance()}
          >
            {state.sync.in_progress ? "Solving…" : "Solve frame"}
          </Button>
          {state.has_calibration && (
            <Button variant="outline" onClick={() => api.useCalibration()}>
              Use previous calibration
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
