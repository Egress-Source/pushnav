import { useEngineState } from "@/hooks/useEngineState";
import { LiveView } from "@/components/live-view/LiveView";
import { CameraControls } from "@/components/controls/CameraControls";
import { Wizard } from "@/components/wizard/Wizard";

export default function App() {
  const state = useEngineState();
  if (!state) return <div className="p-8">Connecting...</div>;
  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="grid md:grid-cols-3 gap-4 max-w-7xl mx-auto">
        <div className="md:col-span-2 space-y-4">
          <LiveView state={state} />
          <Wizard state={state} />
        </div>
        <div className="space-y-4">
          <CameraControls controls={state.controls} />
        </div>
      </div>
    </div>
  );
}
