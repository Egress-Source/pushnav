import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { EnginePayload } from "@/lib/types";

interface Props {
  state: EnginePayload | null;
}

export function ErrorModal({ state }: Props) {
  if (!state || state.state !== "ERROR") return null;
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Engine error</DialogTitle>
          <DialogDescription>
            The engine entered an error state. Restart PushNav to recover.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
