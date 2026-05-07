import type { EnginePayload } from "@/lib/types";

interface Props {
  state: EnginePayload;
}

export function LocationOverlay({ state }: Props) {
  const loc = state.stellarium?.location;
  if (!loc) return null;
  const line1 = loc.name && loc.country
    ? `${loc.name}, ${loc.country}`
    : (loc.name || "");
  const line2 = loc.latitude !== undefined && loc.longitude !== undefined
    ? `${loc.latitude.toFixed(4)}°, ${loc.longitude.toFixed(4)}°`
    : "";
  const lines = [line1, line2].filter(Boolean);
  if (lines.length === 0) return null;
  const lineH = 26;
  const boxH = lines.length * lineH + 10;
  return (
    <g>
      <rect
        x={4}
        y={4}
        width={300}
        height={boxH}
        rx={4}
        fill="rgba(0, 0, 0, 0.5)"
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={12}
          y={26 + i * lineH}
          fill="rgba(255, 70, 70, 0.63)"
          fontSize={20}
          fontWeight="bold"
        >
          {line}
        </text>
      ))}
    </g>
  );
}
