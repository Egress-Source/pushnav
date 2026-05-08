import { cn } from "@/lib/utils";
import type { View } from "@/hooks/useView";

interface Props {
  view: View;
  onChange: (v: View) => void;
}

export function TabSwitch({ view, onChange }: Props) {
  return (
    <div className="flex rounded-md border border-border overflow-hidden text-sm">
      <Tab
        label="Navigation"
        active={view === "navigation"}
        onClick={() => onChange("navigation")}
      />
      <Tab
        label="What to see"
        active={view === "catalog"}
        onClick={() => onChange("catalog")}
      />
    </div>
  );
}

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/40 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
