import { useEffect, useRef, useState } from "react";
import type { EnginePayload } from "@/lib/types";
import { StarOverlay } from "./StarOverlay";
import { NavOverlay } from "./NavOverlay";
import { SyncCandidatesOverlay } from "./SyncCandidatesOverlay";
import { AxesOverlay } from "./AxesOverlay";
import { LocationOverlay } from "./LocationOverlay";

interface Props {
  state: EnginePayload;
  showStars: boolean;
}

const NO_STARS_STATES = ["CALIBRATE", "WARMING_UP", "TRACKING"];
const FRAME_POLL_MS = 100; // 10 FPS — fallback when MJPEG isn't rendering
const MJPEG_PROBE_MS = 1500; // give the multipart stream this long to draw a
                             // first frame before assuming the WebView can't
                             // render it (WebKit2GTK on Linux notably can't)

export function LiveView({ state, showStars }: Props) {
  const { image_w, image_h } = state;
  const noStars =
    NO_STARS_STATES.includes(state.state) && state.failures >= 3;

  // Most WebViews and browsers render multipart/x-mixed-replace inside <img>
  // efficiently — we keep using /frame.mjpg there. WebKit2GTK (Linux pywebview)
  // doesn't, so when no pixels arrive in MJPEG_PROBE_MS we switch to polling.
  const imgRef = useRef<HTMLImageElement>(null);
  const [usePolling, setUsePolling] = useState(false);
  const [frameTick, setFrameTick] = useState(0);
  useEffect(() => {
    if (usePolling) return;
    const timer = setTimeout(() => {
      const img = imgRef.current;
      if (img && img.naturalWidth === 0) setUsePolling(true);
    }, MJPEG_PROBE_MS);
    return () => clearTimeout(timer);
  }, [usePolling]);
  useEffect(() => {
    if (!usePolling) return;
    const id = setInterval(() => setFrameTick((t) => t + 1), FRAME_POLL_MS);
    return () => clearInterval(id);
  }, [usePolling]);
  const frameSrc = usePolling
    ? `/frame.jpg?t=${frameTick}`
    : "/frame.mjpg";

  return (
    <div
      className="relative bg-black w-full overflow-hidden rounded-xl border"
      style={{ aspectRatio: `${image_w} / ${image_h}` }}
    >
      <img
        ref={imgRef}
        src={frameSrc}
        alt="Live camera frame"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${image_w} ${image_h}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <LocationOverlay state={state} />
        {showStars && <StarOverlay state={state} />}
        {!noStars && <AxesOverlay state={state} />}
        {!noStars && <NavOverlay state={state} />}
        {state.state === "SYNC_CONFIRM" && (
          <SyncCandidatesOverlay state={state} />
        )}
      </svg>
      {noStars && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded font-semibold animate-pulse shadow-lg">
          NO STARS — point at darker sky / clouds?
        </div>
      )}
    </div>
  );
}
