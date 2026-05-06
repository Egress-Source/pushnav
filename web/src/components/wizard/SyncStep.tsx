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
          Center a known bright star in the eyepiece and tap "Solve frame".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {state.sync.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.sync.error}</AlertDescription>
          </Alert>
        )}
        <Button
          disabled={state.sync.in_progress}
          onClick={() => api.wizardAdvance()}
        >
          {state.sync.in_progress ? "Solving…" : "Solve frame"}
        </Button>
      </CardContent>
    </Card>
  );
}
