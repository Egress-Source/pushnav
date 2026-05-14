import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { EnginePayload } from "@/lib/types";

export function SetupStep({ state }: { state: EnginePayload }) {
  const noCamera = !state.camera.connected;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1 — Setup</CardTitle>
        <CardDescription>
          Make sure you can see stars; they should look like small bright
          dots, not blurry blobs. Adjust the Exposure slider if the image
          is too dark or too bright. When the stars look sharp, press Next.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2 items-center">
        <Button
          onClick={() => api.wizardAdvance()}
          disabled={noCamera}
          title={noCamera ? "Camera not connected" : undefined}
        >
          Next
        </Button>
        {noCamera && (
          <span className="text-xs text-muted-foreground">
            Plate-solving needs a camera — wizard disabled.
          </span>
        )}
      </CardContent>
    </Card>
  );
}
