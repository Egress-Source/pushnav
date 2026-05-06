import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { EnginePayload } from "@/lib/types";

export function CalibrateStep({ state: _ }: { state: EnginePayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3 — Calibrate</CardTitle>
        <CardDescription>
          Move the telescope at least 0.5° in any direction and hold steady.
          Calibration completes automatically once movement stabilises.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={() => api.wizardAdvance()}>
          Skip calibration
        </Button>
      </CardContent>
    </Card>
  );
}
