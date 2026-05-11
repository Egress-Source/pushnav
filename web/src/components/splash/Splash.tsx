import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EnginePayload } from "@/lib/types";

interface Props { state: EnginePayload | null }

export function Splash({ state }: Props) {
  // Local "dismissed" flag so the user can close the camera-not-found
  // dialog and keep using the catalog, connected clients, and settings.
  // The dialog is server-driven (re-renders at 10 Hz off state.camera.connected),
  // so a controlled `open`/`onOpenChange` pair without this flag would
  // immediately reopen on the next WebSocket tick.
  const [dismissed, setDismissed] = useState(false);

  if (state === null) {
    return (
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Connecting…</DialogTitle>
            <DialogDescription>Waiting for engine.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }
  if (!state.camera.connected && !dismissed) {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) setDismissed(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Camera not found</DialogTitle>
            <DialogDescription>
              Plug in the USB camera and restart PushNav, or close this
              dialog to keep using the catalog and connected clients
              without plate-solving.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }
  return null;
}
