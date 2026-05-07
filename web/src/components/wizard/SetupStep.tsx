import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { EnginePayload } from "@/lib/types";

export function SetupStep({ state: _ }: { state: EnginePayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1 — Setup</CardTitle>
        <CardDescription>
          Confirm the camera is in focus and stars are visible, then begin sync.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button onClick={() => api.wizardAdvance()}>Begin Sync</Button>
      </CardContent>
    </Card>
  );
}
