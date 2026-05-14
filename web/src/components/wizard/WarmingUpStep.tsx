import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { EnginePayload } from "@/lib/types";

export function WarmingUpStep({ state }: { state: EnginePayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acquiring stars…</CardTitle>
        <CardDescription>
          Solver is starting. First plate-solve usually takes 1–3 seconds.
          {state.failures > 0 && ` Recent failed solves: ${state.failures}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={() => api.wizardAdvance()}>
          Stop and restart
        </Button>
      </CardContent>
    </Card>
  );
}
