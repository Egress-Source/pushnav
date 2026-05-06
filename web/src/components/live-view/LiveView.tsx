import type { EnginePayload } from "@/lib/types";
import { StarOverlay } from "./StarOverlay";
import { NavOverlay } from "./NavOverlay";

interface Props {
  state: EnginePayload;
}

export function LiveView({ state }: Props) {
  const { image_w, image_h } = state;
  return (
    <div
      className="relative bg-black w-full"
      style={{ aspectRatio: `${image_w} / ${image_h}` }}
    >
      <img
        src="/frame.mjpg"
        alt="Live camera frame"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${image_w} ${image_h}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <StarOverlay state={state} />
        <NavOverlay state={state} />
      </svg>
    </div>
  );
}
