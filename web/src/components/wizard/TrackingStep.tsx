import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { EnginePayload } from "@/lib/types";

export function TrackingStep({ state }: { state: EnginePayload }) {
  const p = state.pointing;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tracking</CardTitle>
          <Badge variant={p.valid ? "default" : "destructive"}>
            {p.valid ? "LOCK" : "LOST"}
          </Badge>
        </div>
        <CardDescription>
          {p.valid
            ? `RA ${p.ra_deg.toFixed(2)}° / Dec ${p.dec_deg.toFixed(2)}° / age ${p.solve_age_s}s`
            : "Acquiring stars…"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {state.nav?.active && (
          <div>
            Target: <strong>{state.nav.target_name ?? "—"}</strong> · {state.nav.direction_text} ·{" "}
            {state.nav.separation_deg !== null ? `${state.nav.separation_deg.toFixed(2)}°` : "—"}
            <Button variant="ghost" size="sm" onClick={() => api.clearGoto()} className="ml-2">
              Clear
            </Button>
          </div>
        )}
        <Button variant="outline" onClick={() => api.wizardAdvance()}>
          Stop tracking
        </Button>
      </CardContent>
    </Card>
  );
}
