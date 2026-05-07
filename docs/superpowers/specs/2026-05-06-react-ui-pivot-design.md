# React/ShadCN UI Pivot — Design

**Status:** Approved (brainstorm)
**Date:** 2026-05-06
**Branch:** `ui-change`
**Author:** Arun Venkataswamy

---

## 1. Background

### 1.1 The problem

Early users report three categories of UX complaints with the current DearPyGui (DPG) desktop UI:

- **A. Looks dated / unpolished** — fonts, spacing, density feel like an old desktop app.
- **B. Wizard flow is confusing** — Sync → Roll → Track step transitions are unclear.
- **D. Cross-platform inconsistency** — HiDPI, fonts, and window sizing behave differently on macOS / Linux / Windows.

A and D are framework-inherent to DPG; B is a design problem any framework faces, but a polished framework makes the redesign tractable.

### 1.2 Why this is a small change architecturally

Investigation showed the codebase is **already structured** for this pivot:

- The engine is fully UI-independent (per `SPEC_ARCHITECTURE.md` §1: "UI must NOT own core logic. Core engine must be runnable without UI.").
- An aiohttp HTTP + WebSocket server already runs on `:8080`, broadcasting 10 Hz state to a phone-facing web UI (`data/web/index.html`).
- tetra3 has zero UI coupling — solver thread reads frames, writes `PointingState`. The UI only reads.
- The bloat is concentrated: `python/evf/ui/window.py` is **1,896 lines**; everything else is lean.

So this pivot is **replacing one consumer of `PointingState`** (DPG) with another (a React app served by the same aiohttp server). The engine, solver, Stellarium server, LX200 server, camera subprocess, and webserver core are unchanged.

### 1.3 What was rejected and why

- **Tauri:** technically the best result (smallest "real desktop app", best polish). Rejected to keep Rust out of the build pipeline.
- **Electron:** ~120–150 MB shell weight is excessive for an astronomy tool that already has a 39 KB working web UI.
- **Stay on DPG and polish:** ceiling on look-and-feel is too low; HiDPI/cross-platform pain is structural to DPG.
- **"Open browser, no native shell":** viable, but the user values a proper desktop-app feel (window chrome, dock/taskbar icon).

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  pywebview window  →  hosts OS webview                       │
│    macOS:   WebKit                                           │
│    Windows: WebView2 (Edge Chromium)                         │
│    Linux:   GTK WebKit                                       │
│  Loads: http://localhost:8080  (prod)                        │
│         http://localhost:5000  (dev — Vite HMR)              │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP + WS on loopback
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Python engine (unchanged core)                              │
│   aiohttp on :8080                                           │
│       GET  /              → React build (web/dist/)          │
│       GET  /frame.mjpg    → MJPEG stream of latest frame  ★  │
│       GET  /ws            → 10 Hz JSON state push (existing) │
│       POST /api/...       → wizard, controls, settings    ★  │
│   Solver / Stellarium / LX200 / camera subprocess: same      │
└─────────────────────────────────────────────────────────────┘
```

★ = new. Everything else exists.

### 2.1 Process model

```
Main Python Process
    ├── Main thread   — runs pywebview window event loop
    ├── Solver thread — unchanged
    ├── Stellarium thread — unchanged
    ├── LX200 thread — unchanged
    ├── Web server thread (aiohttp event loop) — unchanged + new endpoints
    └── Camera TCP client — unchanged

Camera Subprocess — unchanged
```

The DPG render loop on the main thread is replaced by the pywebview event loop. All other threads and the camera subprocess are bit-for-bit unchanged.

---

## 3. Repo Layout

```
pushnav/
  python/evf/
    ui/                    # DELETED (window.py was 1896 lines of DPG)
    webserver/server.py    # extended — see §5
    main.py                # simplified — spawns engine, opens pywebview window
  web/                     # NEW — React front-end
    package.json
    vite.config.ts
    tsconfig.json
    tailwind.config.ts
    postcss.config.js
    components.json        # shadcn config
    index.html
    src/
      main.tsx
      App.tsx
      pages/
        Wizard.tsx
        Tracking.tsx
        Settings.tsx
      components/
        ui/                # shadcn-generated primitives (Button, Slider, Dialog, …)
        live-view/         # MJPEG <img> + SVG overlay (centroids, nav arrow)
        wizard/            # Sync / Sync-confirm / Calibrate / Track step UIs
        controls/          # exposure/gain sliders bound to /api/control
        navigation/        # in-FOV reticle + edge arrow
      hooks/
        useEngineState.ts  # WebSocket subscription → typed state
        useFrameStream.ts  # MJPEG <img> hook
        useApi.ts          # POST helpers
      lib/
        api.ts             # fetch wrappers
        types.ts           # mirrors WS payload schema
    public/                # logos, fonts, favicons
    dist/                  # build output (gitignored)
  data/web/                # DELETED — replaced by web/dist/
  data/sounds/             # unchanged
  pyproject.toml           # remove dearpygui, add pywebview
```

### 3.1 Pre-existing files migrating from `data/web/`

- `data/web/inapp-title.png` → `web/public/inapp-title.png`
- `data/web/logo.png` → `web/public/logo.png`
- `data/web/index.html` → deleted (replaced by Vite-generated `web/index.html` + React app)

---

## 4. Development Workflow

### 4.1 Daily UI work (HMR loop)

Two terminals:

```bash
# Terminal 1 — engine + aiohttp on :8080
uv run python -m evf.main --dev
# --dev: skip pywebview window, just run engine + server. Frees you to use
# normal browser dev tools.

# Terminal 2 — Vite on :5000 with React HMR
cd web && npm run dev
```

Open `http://localhost:5000` in your normal browser (Chrome dev tools, React DevTools, etc.). Edit `.tsx` → instant HMR. **Python engine never restarts.**

Vite is configured to proxy these paths to `localhost:8080`:

- `/ws` (WebSocket upgrade)
- `/frame.mjpg`
- `/api/*`
- `/sounds/*`
- `/assets/*`

This means the React app uses **relative URLs** in code; it works identically in dev (via Vite proxy) and in prod (served from the same origin as the engine).

### 4.2 Production-feel testing

```bash
# Build React, then run the app exactly as users will:
(cd web && npm run build)
uv run python -m evf.main
# Engine starts, pywebview opens at http://localhost:8080,
# aiohttp serves web/dist/ at /.
```

### 4.3 Python engine edits

Python edits still require restarting the Python process — that's normal. The win is that **UI iteration** (which is where the user spends the bulk of UX-polish time) is decoupled and instant.

---

## 5. New Engine API Surface

`python/evf/ui/window.py` currently calls these engine methods directly. Each gets an HTTP/WebSocket equivalent:

| Today (window.py → engine) | New endpoint |
|---|---|
| Live frame texture (DPG `set_value`) | `GET /frame.mjpg` (multipart MJPEG, ~10 Hz, source: `frame_buffer.jpeg_bytes`) |
| `engine.step_advance()` | `POST /api/wizard/advance` |
| `engine.sync_retry()` | `POST /api/sync/retry` |
| `engine.set_sync_selected(idx)` | `POST /api/sync/select` body: `{"idx": int}` |
| `engine.use_previous_calibration()` | `POST /api/calibration/use-previous` |
| `engine.set_control(name, value)` | `POST /api/control` body: `{"name": str, "value": number}` |
| `engine.clear_goto_target()` | `POST /api/goto/clear` |
| `engine.audio_enabled = bool` | `POST /api/settings` body: `{"audio_enabled": bool}` |
| HiDPI toggle | `POST /api/settings` body: `{"hidpi": bool}` (no-op for webview but persists to config) |

### 5.1 `/ws` payload extension

The existing `/ws` payload (`webserver/server.py:_build_payload`) gets new fields. All values are read-only snapshots; mutations go through `POST /api/*`.

```jsonc
{
  // existing fields
  "state": "TRACKING",
  "failures": 0,
  "pointing": { "valid": true, "ra_deg": ..., "dec_deg": ..., "roll_deg": ..., "matches": ..., "prob": ..., "solve_age_s": ... },
  "nav": { ... } | null,
  "origin_x": ..., "origin_y": ..., "image_w": 1280, "image_h": 720,
  "finder_rotation": ..., "fov_h_deg": 8.86,

  // NEW fields — currently only available to DPG window.py
  "controls": [
    { "name": "exposure", "label": "Exposure", "min": 0, "max": 100, "step": 1, "value": 50, "unit": "ms" },
    { "name": "gain",     "label": "Gain",     "min": 0, "max": 100, "step": 1, "value": 50, "unit": "dB" }
  ],
  "sync": {
    "in_progress": false,
    "candidates": [ { "idx": 0, "name": "Vega", "ra_deg": ..., "dec_deg": ..., "magnitude": 0.03 } ],
    "selected_idx": null,
    "error": null
  },
  "stellarium": { "active": false, "status": "...", "object": {"name": "...", "localized-name": "..."} | null },
  "lx200":      { "active": false, "address": "0.0.0.0:4030" },
  "webserver":  { "url": "http://192.168.1.42:8080" },
  "audio_enabled": true,
  "camera": { "connected": true, "all_centroids": [...], "matched_centroids": [...] }
}
```

### 5.2 Star overlay and navigation arrow

Drawn in **SVG layered over the MJPEG `<img>`** using data already in `/ws`:

- `pointing.all_centroids` → small open circles (detected stars).
- `pointing.matched_centroids` → filled circles in a different color (matched stars).
- `nav.in_fov` true → in-FOV target reticle at `(nav.pixel_x, nav.pixel_y)`.
- `nav.in_fov` false → edge arrow at `(nav.edge_x, nav.edge_y)` rotated by `nav.edge_angle_deg`.

`webserver/server.py` already computes the edge-arrow geometry — that logic stays.

### 5.3 MJPEG endpoint

```
GET /frame.mjpg
Content-Type: multipart/x-mixed-replace; boundary=frame
```

Each part: `Content-Type: image/jpeg` + the raw bytes from `frame_buffer.jpeg_bytes`. Browsers and OS webviews render this natively in an `<img>` tag — **no JavaScript decoding required**.

Pacing: server-side, sleep until next 100 ms tick (10 Hz, matching the existing `/ws` cadence).

Bandwidth: ~30 KB/frame × 10 fps = ~300 KB/s on loopback — negligible.

Concurrency cap: ≤ 4 simultaneous MJPEG streams (defensive bound; in practice there is one webview client + maybe one phone).

---

## 6. Production Packaging

`scripts/build_mac.sh`, `scripts/build_linux.sh`, `scripts/build_windows.bat` each gain one extra step before invoking Nuitka:

```bash
(cd web && npm ci && npm run build)
# Result: web/dist/  (HTML + bundled JS/CSS + assets)
```

Nuitka is configured (via `--include-data-dir`) to bundle `web/dist/` into the app bundle at the same location `data/web/` lives today. `evf.paths.web_dir()` returns this location for both dev and release.

`pyproject.toml` changes:

- Remove: `dearpygui`
- Add: `pywebview >= 5.0`

### 6.1 pywebview platform notes

| Platform | Backend | Notes |
|---|---|---|
| macOS  | WebKit (PyObjC) | Best polish. Native window chrome. |
| Windows | WebView2 (Edge Chromium) | Best rendering fidelity. Requires WebView2 runtime — pre-installed on Windows 11; auto-installed by Edge updates on Windows 10. |
| Linux  | GTK WebKit (gi/PyGObject) | Most platform variation. **Test early.** Risk callout in §9. |

---

## 7. Migration Strategy

Incremental — DPG keeps working until the React app reaches feature parity.

1. **Scaffold `web/`** — Vite + React + TS + Tailwind + shadcn. Empty page that connects to `/ws` and prints state. Verify HMR loop.
2. **Wire `/frame.mjpg`** — add MJPEG endpoint to `webserver/server.py`. Verify `<img src="/frame.mjpg">` shows live frames in the browser.
3. **Extend `/ws` payload** — add `controls`, `sync`, `stellarium`, `lx200`, `webserver`, `audio_enabled`, `camera` fields per §5.1.
4. **Add `POST /api/*` endpoints** — wire each to the existing `engine.*` method per §5.
5. **Build the React UI feature-by-feature**, against the new endpoints. Each milestone verified on the live rig:
   1. Live view + camera control sliders.
   2. Wizard: Sync (candidate selection) → Sync-confirm → Calibrate → Tracking.
   3. Settings panel (audio, HiDPI, web URL + QR code, addresses).
   4. Star overlay + navigation arrows in SVG.
6. **Cutover.** Once feature parity verified:
   - Delete `python/evf/ui/window.py` (1896 lines).
   - Delete `python/evf/ui/__init__.py` references.
   - Delete `data/web/index.html`.
   - Move `data/web/{logo,inapp-title}.png` → `web/public/`.
   - Remove `dearpygui` from `pyproject.toml`.
   - Replace `main.py` body with: spawn engine → `webview.create_window(...)` → `webview.start()` → on close, `engine.shutdown()`.

DPG and React run **side by side** during steps 1–5. The user can run either by toggling a flag — keeps the live rig usable while the new UI matures.

---

## 8. Testing Strategy

- **Existing pytest** for engine/solver/protocols — **unchanged**. These tests do not depend on the UI layer.
- **React component tests:** `vitest` + `@testing-library/react`. Focus: wizard transitions, state-driven rendering of the live-view overlay, control slider → API call wiring. No effort spent on visual regression — manual review covers it.
- **No new E2E framework.** Manual testing on the live rig (camera + scope + sky) remains the integration test, same as today.
- **Type safety across the wire:** `web/src/lib/types.ts` mirrors the `/ws` payload. Schema kept in sync by hand (small surface, low churn). If schema drift becomes painful, revisit (but don't preemptively introduce codegen).

---

## 9. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| pywebview on Linux (GTK WebKit) has rendering glitches or stability issues | Medium | Test on Linux dev box at end of step 1 (scaffold). If blocked, switch shell to Tauri — the React app itself doesn't change; only `main.py` and the build scripts do. |
| MJPEG stream stalls a slow webview | Low | 10 Hz × 30 KB on loopback is trivial. If a problem appears, fallback is binary-frame WebSocket. |
| Schema drift between `/ws` payload and `types.ts` | Medium | Small surface, edited together in one PR. If churn rises, add a JSON-schema codegen step. |
| Node toolchain enters dev environment | Certain | Accepted — direct consequence of choosing React. Documented in `CLAUDE.md` after this lands. |
| Feature parity slips and DPG lingers indefinitely | Medium | Migration §7 is structured so each step is independently shippable. If the project stalls mid-migration, the side-by-side state is still functional. |

---

## 10. Out of Scope

- Replacing the existing phone-facing UI separately — the React app **is** the new phone UI too (responsive layout). The old `data/web/index.html` goes away in step 7-cutover.
- Changing engine internals (state machine, solver, sync, navigation, protocols).
- Changing the camera subprocess or its TCP protocol.
- Adding new product features (INDI driver, equatorial mount support, etc.) — listed in `SPEC_ARCHITECTURE.md` §15 as future work, unaffected by this pivot.

---

## 11. Acceptance Criteria

This pivot is "done" when:

1. `python/evf/ui/window.py` is deleted; DearPyGui is removed from `pyproject.toml`.
2. `uv run python -m evf.main` opens a pywebview window showing the React app, with full feature parity to today's DPG UI:
   - Live camera frame visible.
   - Camera controls (exposure, gain) functional.
   - Wizard flow Sync → Sync-confirm → Calibrate → Tracking completes.
   - Star overlay and navigation arrow render.
   - Settings panel works (audio toggle, HiDPI, web URL + QR, addresses).
   - Stellarium / LX200 / phone web client all still connect (their protocols are untouched).
3. `npm run dev` HMR loop works: edit `.tsx` → browser updates without Python restart.
4. Production builds (mac `.dmg`, Linux AppImage, Windows installer) produce working apps on each platform.
5. App looks materially more polished than the DPG version on all three platforms (subjective — verified by the user).
