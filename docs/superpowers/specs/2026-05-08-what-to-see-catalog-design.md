# "What to See" Catalog Tab — Design

**Status:** Approved (brainstorm)
**Date:** 2026-05-08
**Branch:** `catalog`
**Author:** Arun Venkataswamy

---

## 1. Background

PushNav is a *during-session* tool: solve, sync, push the scope to a target. It currently has no answer to "*which* target should I push to?" — that knowledge sits in a separate tab the user has to context-switch to (e.g., a planetarium app, the Stargazing Buddy site, or the user's memory).

The Stargazing Buddy site (`stargazingbuddy.com/plan`, source at `~/Devel/Github/stargazing-buddy-site`) already curates 161 deep-sky objects with rich metadata (RA/Dec, magnitude, difficulty, visual reward, light-pollution tolerance, minimum equipment, prose descriptions, finder maps). It computes per-object visibility from a date + location and renders a filterable, sortable table with a 12-hour visibility strip. That's a **planning** tool — answer the night before about a 12-hour window.

The new feature is the **in-session** equivalent: answer "what's worth pointing at *right now* (or in the next few hours)" given my current location, my equipment, my sky's light pollution, and my taste for what's worth the time. Tapping an object on this list sets the engine's GOTO target so the existing Navigation tab guides the scope to it.

### 1.1 Why a new top-level tab

The Navigation tab is fully committed to the live frame, wizard, and camera/connectivity/settings. There's no spare real estate to embed a 100-object catalog list. A second top-level tab also frames the mental model cleanly: *Navigation* = "drive the scope", *What to see* = "decide where to drive it".

### 1.2 Why bring the buddy site's data here, not link out

This is field hardware — laptop on a tripod at a dark-sky site, no LTE, no Wi-Fi. The catalog has to ship in the binary. A link out to the live site is reserved for the deep description page (rich images, observation notes), which the user only reads once per object lifetime and can do at home.

---

## 2. Architecture

A new top-bar control toggles between two views in the React app:

```
Top bar:  [PushNav logo]  [Navigation | What to see]   [stats…] [audio mute]
                              ↓ tab toggle (client-side)

Navigation tab (existing)             What to see (new)
┌─────────────────┐ ┌──────────┐      ┌───────────────────┐ ┌────────────┐
│ LiveView        │ │ Camera   │      │ Time control      │ │ Detail     │
│ StepIndicator   │ │ Connect  │      │ Filters           │ │ panel      │
│ Wizard          │ │ Settings │      │ Object table      │ │            │
└─────────────────┘ └──────────┘      └───────────────────┘ └────────────┘
```

- The tab switch is purely client-side React state (URL hash optional).
- Both tabs share the same `useEngineState` WebSocket subscription, the same engine, the same `goto_target`. Switching tabs is free.
- Top bar (logo + tab switcher + stats + audio mute) is identical in both views.

### 2.1 Components added

```
web/src/
  data/
    objects.json                    # vendored catalog (frontmatter + descriptions)
  lib/
    astronomy.ts                    # ported from buddy site
    catalogTypes.ts                 # CatalogObject TypeScript shape
  components/
    catalog/
      WhatToSee.tsx                 # top-level container
      TimeControl.tsx               # slider + Set / Reset
      CatalogFilters.tsx            # equipment / LP / visual reward
      CatalogTable.tsx              # sortable table of visible objects
      CatalogRow.tsx                # individual row
      CatalogDetail.tsx             # right-column detail panel
  components/
    TabSwitch.tsx                   # 'Navigation' | 'What to see' toggle in StateHeader
```

### 2.2 New script

```
scripts/
  sync_catalog.py                   # parses ~/Devel/Github/stargazing-buddy-site/src/content/objects/*.md
                                    # → web/src/data/objects.json
```

Run manually whenever the buddy-site catalog changes. No build-time fetch, no auto-sync — the catalog drifts <1×/quarter.

### 2.3 New backend surface

| Method / Path | Purpose |
|---|---|
| `POST /api/goto/set` | Set the engine's `goto_target` from a non-protocol source (the catalog's "Set as target" button). Body: `{ ra_deg: number, dec_deg: number }`. Returns 204. **Non-dev-gated** — this is a real first-class user action, distinct from the dev-only `/api/dev/inject-target`. |
| `POST /api/settings` | Existing endpoint; extended to accept `{ location: { latitude: number, longitude: number } }`. Persists to `ConfigManager.location`. |

`/ws` payload extended:

```jsonc
{
  // existing fields...
  "location": {
    "latitude": 13.0878,
    "longitude": 80.2785,
    "source": "stellarium"     // "stellarium" | "manual" | null
  }
}
```

---

## 3. Data

### 3.1 Catalog file

`web/src/data/objects.json` — a JSON array, one entry per object. Schema:

```ts
interface CatalogObject {
  id: string;                      // filename without .md, e.g., "m42-orion-nebula"
  name: string;                    // "Orion Nebula"
  designation: string;             // "M42"
  type: "cluster" | "nebula" | "galaxy" | "star" | "asterism";
  subtype?: string;                // "open-clusters", "emission-nebulae", etc.
  constellation: string;
  magnitude?: number;
  distance?: string;               // human string, "1500 ly"
  bestViewing?: string;            // "October - March"
  difficulty: "beginner" | "intermediate";
  visualReward: "high" | "moderate" | "low";
  lpTolerance: "high" | "medium" | "low";
  minEquipment: "naked-eye" | "binoculars" | "small-telescope" | "medium-telescope" | "large-telescope";
  rightAscension: string;          // "05h 35m 17.3s" — site format
  declination: string;             // "-05° 23' 28″"
  description: string;             // body of the markdown, plain text
}
```

Built by `scripts/sync_catalog.py` which reads each `.md` file, extracts frontmatter via PyYAML, strips markdown body to plain text via a small regex pass, writes the array.

Estimated size: 161 objects × ~800 bytes average → ~130 KB JSON gzipped to ~35 KB. Negligible bundle impact.

### 3.2 Astronomy library

`web/src/lib/astronomy.ts` — ported verbatim (with minor type-tightening) from `~/Devel/Github/stargazing-buddy-site/src/lib/astronomy.ts`. Exports:

- `parseRA(s: string): number | null` — "05h 35m 17.3s" → hours
- `parseDec(s: string): number | null` — "-05° 23' 28″" → degrees
- `altAzFromRaDec({ raHours, decDeg, latDeg, lonDeg, date }): { altDeg, azDeg }`
- `riseSetTransitUtc({ raHours, decDeg, latDeg, lonDeg, dateUtc }): { rise, transit, set, status }`
- (Plus Sun / Moon / phase functions, included but not used by this iteration.)

Pure functions, no React dependency. Can be unit-tested in vitest.

### 3.3 Sync script behaviour

`scripts/sync_catalog.py`:

1. Glob `~/Devel/Github/stargazing-buddy-site/src/content/objects/*.md`.
2. For each file:
   - Split frontmatter (YAML between `---` markers) from body.
   - Parse YAML to dict.
   - Strip markdown from body: drop `<div>`/`<img>`/`<p>` tags, drop "| Property | Value |" tables, drop heading lines (`#`, `##`, etc.) — keep prose paragraphs only. Trim to ~600 chars per object (cap detail-panel render cost).
   - Construct `CatalogObject` dict.
3. Write `web/src/data/objects.json` (sorted by id for stable diffs).

The script lives in PushNav's `scripts/` directory so re-syncs are version-controlled events. No build-time dependency on the buddy site repo existing.

---

## 4. Location

### 4.1 Resolution order

The engine resolves the active observer location in this priority:

1. **Live Stellarium location** — when a Stellarium client is connected and reports a location via Remote Control API. Already pulled into `engine.stellarium_status['location']`.
2. **Manual location** in `ConfigManager.location` — persisted across sessions.
3. **`null`** — neither available.

This resolution happens server-side; the `/ws` payload's `location` field reflects the resolved value plus a `source` field so the React UI can show a "from Stellarium" / "manual" indicator.

### 4.2 ConfigManager additions

```jsonc
{
  "version": 1,
  // ...existing keys...
  "location": {
    "latitude": null,        // float | null
    "longitude": null
  }
}
```

`ConfigManager.location` getter returns `{latitude, longitude}` or `None`. Setter validates: latitude ∈ [-90, 90], longitude ∈ [-180, 180]; rejects malformed input.

### 4.3 Settings UI addition

The Settings card on the Navigation tab grows a "Location" section above "Advanced solver":

- Two number `Input`s (latitude, longitude), 5 decimal places.
- Small text-row indicator: "from Stellarium" (when `source === "stellarium"`) or "manual" (when `source === "manual"`) or "not set" (null).
- A "Use current Stellarium location" button when Stellarium is connected — copies its location into the manual fields.

Inputs `onBlur` → `POST /api/settings` with `{ location: { latitude, longitude } }`.

### 4.4 Empty-state in the catalog

When `state.location === null`, the What-to-see tab shows a single Card in the left column instead of the full UI:

> **Set your location**
> The catalog needs your latitude and longitude to compute what's above the horizon. Enter them in the **Settings** panel on the Navigation tab, or connect a Stellarium client to populate them automatically.

---

## 5. Time control

A sticky bar at the top of the left column:

```
┌────────────────────────────────────────────────────┐
│  [Now]   ━━━━●━━━━━━━━   +1h 32m   [Set] [Reset]   │
└────────────────────────────────────────────────────┘
```

- A range slider, value 0 → 360 (minutes), step 1.
- Default value 0 ("Now").
- A live offset label updates as the user drags ("+1h 32m").
- A `[Set]` button commits the offset to a separate `appliedOffset` state. The visibility list is computed against `Date.now() + appliedOffset * 60_000`. Slider scrubbing alone does *not* trigger a recompute — explicit set per the user preference.
- A `[Reset]` button (and clicking the "Now" label) sets `appliedOffset = 0` *and* resets the slider to 0.
- When `appliedOffset === 0`, a `setInterval(60_000)` re-renders the list every minute so it tracks real wall-clock time.

### 5.1 Time format

The label above the slider shows the *applied* time:

- Offset 0: `Now (10:42 PM)`
- Non-zero: `+1h 32m (12:14 AM)`

So the user always knows what time the visibility data corresponds to.

---

## 6. Filters

A horizontal row above the table, three multi-select dropdown buttons:

| Filter | Options | Default |
|---|---|---|
| **Equipment** | Naked eye, Binoculars, Small scope, Medium scope, Large scope | all checked |
| **LP tolerance** | High, Medium, Low | all checked |
| **Visual reward** | High, Moderate, Low | all checked |

- Each dropdown is a shadcn `Popover` with a list of `Checkbox` rows (matches the buddy site's pattern).
- Selected counts shown in the trigger button: e.g., "Equipment (3 of 5)".
- State persists in `localStorage` keys `pushnav.catalog.equipment`, `pushnav.catalog.lp`, `pushnav.catalog.reward`.
- Subtype + difficulty filters from the buddy site are intentionally omitted: subtype is too power-user for in-field triage; difficulty is irrelevant once you've shown up.

---

## 7. Object table

A scrollable table in the left column below the filters.

### 7.1 Visibility threshold

Rows are restricted to objects with `altitudeDeg > 20` at the applied time, AND the object passes all three filters. 20° corresponds to where atmospheric extinction becomes acceptable for deep-sky objects on most nights. Below 20° the object is technically up but practically not worth pointing the scope at. The threshold is a constant — not user-configurable in this iteration.

### 7.2 Columns

| Column | Content | Sortable |
|---|---|---|
| Name | Designation + common name (e.g., "M42 / Orion Nebula") | yes |
| Type | "Emission nebula", "Open cluster", … (subtype label) | yes |
| Mag | Visual magnitude (or `—` if unknown) | yes |
| Alt | Altitude in degrees, integer (e.g., "62°") | yes (default desc) |
| Az | Azimuth as compass label ("SSE", "NW", "N", …) — derived from azimuth degrees | no |
| Reward | Single-letter chip: H / M / L | no |

- Default sort: **Alt descending** (highest first).
- Click column header to sort by that column; click again to flip direction.
- Selected row highlighted with `bg-primary/20`.

### 7.3 Empty state

If the table would be empty (no objects pass filters at altitude > 20° at the chosen time):

> No objects above 20° altitude with these filters at this time. Try widening the filters or scrubbing forward.

---

## 8. Detail panel (right column)

A persistent panel — **not** a modal — in the right column, mirroring the Navigation tab's right column pattern.

### 8.1 Empty state

When no row is selected:

> **Pick an object** from the list on the left to see its details and set it as your target.

Muted-foreground prose, takes the full column.

### 8.2 Selected state

Top-down content:

1. **Header**: `<designation>` heavy + `<name>` light, e.g., "**M42** Orion Nebula"
2. **Tag row**: type / subtype + constellation + season ("Emission nebula · Orion · Oct–Mar")
3. **Stats grid** (2-column):
   - RA / Dec
   - Magnitude / Distance
   - Best month / Difficulty
4. **Tag chips** (badges): visual reward, LP tolerance, min equipment
5. **Description** — the prose body from the catalog (~600 chars).
6. **`Set as target`** primary button (full width). On click → `POST /api/goto/set { ra_deg, dec_deg }` → 204 → toast "Target set: M42. Switch to Navigation."
7. **`Read full details on stargazingbuddy.com →`** muted text link to `https://stargazingbuddy.com/objects/<id>` (target=`_blank`).

### 8.3 Currently-set target indicator

If the engine's `goto_target` is currently set to coordinates *matching* (within 0.01°) the selected object's RA/Dec, the "Set as target" button text changes to **"Already set"** and is disabled with a small filled-in green/red dot. Avoids redundant POSTs and gives the user feedback that this *is* the active target.

### 8.4 Mobile collapse

Below `md`, the grid collapses to a single stack: filters + table on top, detail panel below. Detail panel scrolls into view automatically when a row is tapped (use `scrollIntoView({ behavior: "smooth" })` on selection).

---

## 9. Set-as-target flow (cross-tab)

The full sequence when the user picks something to point at:

1. User on **What to see** tab, taps a row in the table.
2. Detail panel populates on the right.
3. User taps **`Set as target`**.
4. React POSTs `/api/goto/set { ra_deg: <obj.ra>, dec_deg: <obj.dec> }`.
5. Engine's `engine.goto_target.set(ra, dec)` fires; `on_change` callbacks reset cached metadata; the goto-ack sound plays (existing behaviour).
6. Toast / snackbar: **"Target set: M42. Switch to Navigation to push the scope."**
7. User taps the **Navigation** tab in the top bar.
8. Existing Navigation UI now shows the comet-tail arrow / in-FOV reticle pointing at M42, just like a Stellarium-sourced GOTO would.

The user never has to touch a planetarium app to slew at a Messier object.

---

## 10. Out of scope

- **Planet & Moon.** The buddy site computes ephemeris for these live; we'd need to vendor `Astronomy Engine` or similar. Defer.
- **Conjunctions / events / "tonight's highlights".** Higher-level curation, requires more data per object (event windows). Defer.
- **Auto-pushing to Stellarium / SkySafari.** We set the engine's internal target only; a connected planetarium client doesn't get the GOTO. The user can already do that via Stellarium directly if they want bidirectional sync.
- **Catalog search / fuzzy filter by name.** Pure list + filters for now; if users want search, add later.
- **Auto-syncing the catalog from the buddy site.** Manual `scripts/sync_catalog.py` for now.
- **Custom user "tonight" lists / favourites.** Out.
- **Finder map images.** Linked to the buddy site instead.
- **Editing equipment defaults to remember user's actual scope.** Just filters per session for now; can be persisted in localStorage but no engine-side modeling.

---

## 11. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Buddy-site frontmatter schema drifts | Medium | `sync_catalog.py` validates each entry; CI / manual run flags missing required fields. |
| `astronomy.ts` port introduces precision differences vs the buddy site | Low | Verbatim port + a vitest snapshot test that pins a few known objects' alt/az at known times. |
| Detail panel prose looks bad after markdown stripping | Medium | Sync script keeps it simple but capped at 600 chars; if quality is poor, expand the parser to preserve paragraph breaks. |
| Time slider feels wrong (live vs explicit-set) | Low | Already settled; reset-to-now button covers the common case. |
| Setting a target while in mid-sync confuses the engine state machine | Low | `goto_target.set` is independent of state machine — already proven via Stellarium and dev-inject paths. |

---

## 12. Acceptance criteria

This feature is "done" when:

1. The top bar has a working **Navigation | What to see** tab toggle that swaps the main view client-side.
2. With a Stellarium client connected, the catalog tab shows a populated, sorted table of objects above 20° altitude at the current time.
3. With Stellarium disconnected and manual location entered in Settings, the catalog tab still works.
4. With no location available, the catalog tab shows the empty-state prompt instead of crashing.
5. The time slider scrubs an offset; the **Set** button commits; the table recomputes correctly.
6. All three filters (equipment / LP / visual reward) modify the table in real time and persist across reloads.
7. Tapping a row populates the detail panel with the object's data; tapping `Set as target` POSTs to `/api/goto/set` and the engine's `goto_target` is set; switching to Navigation shows the existing arrow/reticle pointing at the new target.
8. `Read full details on stargazingbuddy.com →` opens the matching URL in a new tab.
9. `scripts/sync_catalog.py` regenerates `web/src/data/objects.json` from the buddy-site repo without errors.
10. The astronomy library port has at least three vitest cases (parse RA, parse Dec, alt/az for a known object at known time + location matching the buddy-site result within 0.05°).
