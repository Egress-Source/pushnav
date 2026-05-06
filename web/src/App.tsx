import { useEngineState } from "@/hooks/useEngineState";
import { LiveView } from "@/components/live-view/LiveView";

export default function App() {
  const state = useEngineState();
  if (!state) return <div className="p-8">Connecting...</div>;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-4">
        <LiveView state={state} />
      </div>
    </div>
  );
}
