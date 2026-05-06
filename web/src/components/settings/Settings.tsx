import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import type { EnginePayload } from "@/lib/types";

interface Props {
  state: EnginePayload;
}

export function Settings({ state }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Row label="Audio feedback">
          <Switch
            checked={state.audio_enabled}
            onCheckedChange={(v) => api.setSettings({ audio_enabled: v })}
          />
        </Row>
        <Separator />
        <div>
          <div className="text-sm font-medium mb-1">Phone web URL</div>
          {state.webserver.url ? (
            <div className="flex items-center gap-3">
              <QRCodeSVG value={state.webserver.url} size={96} />
              <code className="text-xs break-all">{state.webserver.url}</code>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No LAN IP detected</div>
          )}
        </div>
        <Separator />
        <Row label="Stellarium">
          <code className="text-xs">{state.stellarium.address ?? "off"}</code>
        </Row>
        <Row label="LX200 (SkySafari)">
          <code className="text-xs">{state.lx200.address ?? "off"}</code>
        </Row>
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}
