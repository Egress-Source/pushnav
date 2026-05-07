import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { EnginePayload } from "@/lib/types";

const SAMPLES = ["a", "b", "c", "d", "orion"];

interface Props {
  state: EnginePayload;
}

export function DebugPanel({ state }: Props) {
  const [captureMsg, setCaptureMsg] = useState<string>("");

  async function onCapture() {
    try {
      const r = await api.dev.captureFrame();
      setCaptureMsg(r.path ? `Saved: ${r.path}` : (r.error || "Failed"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setCaptureMsg(`Error: ${msg}`);
    }
  }

  function toggleSample(name: string) {
    const next = state.sample_active === name ? null : name;
    api.dev.injectSample(next).catch(console.error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-primary">Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <Button variant="outline" size="sm" onClick={onCapture} className="w-full">
            Capture Frame
          </Button>
          {captureMsg && (
            <div className="mt-1 text-xs text-muted-foreground break-all">
              {captureMsg}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => api.dev.injectTarget(79.1723, 45.998).catch(console.error)}
          className="w-full"
        >
          Inject Capella
        </Button>
        <div>
          <div className="mb-1 text-xs text-muted-foreground">
            Inject sample image as video input:
          </div>
          <div className="space-y-1">
            {SAMPLES.map((n) => {
              const active = state.sample_active === n;
              return (
                <Button
                  key={n}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSample(n)}
                  className="w-full justify-start"
                >
                  {active ? "● " : "  "}Sample {n}.png
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
