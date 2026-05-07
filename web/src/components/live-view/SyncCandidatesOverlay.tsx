import type { EnginePayload } from "@/lib/types";
import { api } from "@/lib/api";

interface Props {
  state: EnginePayload;
}

/**
 * Renders clickable markers over each sync candidate so the user can pick
 * which star they actually centred in the eyepiece. Selected candidate gets
 * a brighter, larger ring + filled inner dot; unselected get a dim ring.
 */
export function SyncCandidatesOverlay({ state }: Props) {
  const candidates = state.sync.candidates;
  const selectedIdx = state.sync.selected_idx;
  if (!candidates.length) return null;

  return (
    <g>
      {candidates.map((c, i) => {
        const isSelected = c.idx === selectedIdx;
        const ringRadius = isSelected ? 26 : 18;
        const ringStroke = isSelected ? "#ef4444" : "#dc2626";
        const ringOpacity = isSelected ? 1 : 0.55;
        const strokeWidth = isSelected ? 3 : 2;
        const labelNum = i + 1;
        const labelOffset = ringRadius + 12;
        return (
          <g
            key={c.idx}
            style={{ cursor: "pointer" }}
            onClick={() => api.syncSelect(c.idx)}
          >
            {/* Larger transparent hit-target circle */}
            <circle
              cx={c.pixel_x}
              cy={c.pixel_y}
              r={ringRadius + 8}
              fill="transparent"
              stroke="none"
            />
            <circle
              cx={c.pixel_x}
              cy={c.pixel_y}
              r={ringRadius}
              fill="none"
              stroke={ringStroke}
              strokeWidth={strokeWidth}
              opacity={ringOpacity}
            />
            {isSelected && (
              <circle
                cx={c.pixel_x}
                cy={c.pixel_y}
                r={4}
                fill="#ef4444"
              />
            )}
            <text
              x={c.pixel_x + labelOffset}
              y={c.pixel_y - labelOffset / 2}
              fill="#ef4444"
              fontSize={20}
              fontWeight="bold"
              opacity={isSelected ? 1 : 0.75}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {labelNum}
            </text>
          </g>
        );
      })}
    </g>
  );
}
