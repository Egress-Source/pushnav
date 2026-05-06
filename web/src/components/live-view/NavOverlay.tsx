import type { EnginePayload } from "@/lib/types";

interface Props {
  state: EnginePayload;
}

export function NavOverlay({ state }: Props) {
  const nav = state.nav;
  if (!nav || !nav.active) return null;

  if (nav.in_fov && nav.pixel_x !== null && nav.pixel_y !== null) {
    return (
      <g>
        <circle cx={nav.pixel_x} cy={nav.pixel_y} r={20} fill="none" stroke="#fde047" strokeWidth={2} />
        <line x1={nav.pixel_x - 28} y1={nav.pixel_y} x2={nav.pixel_x - 14} y2={nav.pixel_y} stroke="#fde047" strokeWidth={2} />
        <line x1={nav.pixel_x + 14} y1={nav.pixel_y} x2={nav.pixel_x + 28} y2={nav.pixel_y} stroke="#fde047" strokeWidth={2} />
        <line x1={nav.pixel_x} y1={nav.pixel_y - 28} x2={nav.pixel_x} y2={nav.pixel_y - 14} stroke="#fde047" strokeWidth={2} />
        <line x1={nav.pixel_x} y1={nav.pixel_y + 14} x2={nav.pixel_x} y2={nav.pixel_y + 28} stroke="#fde047" strokeWidth={2} />
      </g>
    );
  }

  if (nav.edge_x !== null && nav.edge_y !== null && nav.edge_angle_deg !== null) {
    return (
      <g transform={`translate(${nav.edge_x}, ${nav.edge_y}) rotate(${nav.edge_angle_deg})`}>
        <polygon points="0,-22 -14,10 14,10" fill="#fde047" />
      </g>
    );
  }

  return null;
}
