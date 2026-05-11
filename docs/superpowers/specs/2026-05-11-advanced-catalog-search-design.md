# Advanced Catalog Search — design

**Date:** 2026-05-11
**Status:** Approved for implementation planning

## Goal

Add a second mode to the "What to See" view that lets the user find any
star or deep-sky object by name or designation, using static catalogs
vendored with the app. The existing 161-object Stargazing Buddy view
stays unchanged; the new mode covers everything else an amateur would
search for (NGC/IC, Messier, named stars, Bayer/Flamsteed designations).

The feature must work offline — no Sesame, no internet round-trips —
because PushNav is used at dark-sky sites where connectivity is
unreliable.

## Scope

### In scope

- Two inner tabs under "What to see": **Stargazing Buddy** (current
  behaviour, unchanged) and **Advanced** (new).
- Vendoring the **OpenNGC** and **HYG v3** catalogs with their licenses
  and a build-time trim script that emits JSON consumed by the React
  bundle.
- Search bar with live filtering across both catalogs combined.
- Detail panel for the selected entry showing **only fields that are
  authoritative from the upstream DB** (name, designation, type, RA/Dec,
  mag, constellation) plus derived visibility (Alt/Az, Rise/Transit/Set)
  computed from RA/Dec + observer location + time.
- Manual RA/Dec entry form.
- "Set as target" button that calls the existing `/api/goto/set`
  endpoint.
- Persistence: inner-tab choice survives reloads; Advanced and Buddy
  selections are independent and each survive tab switches.
- License attribution surfaced in the UI footer and in repo README.

### Out of scope

- Sesame or any other online fallback for misses.
- A unified search bar that auto-detects coordinate strings.
- HYG entries dimmer than mag 6 that lack a name or Bayer/Flamsteed
  designation.
- Search history.
- Saved/favourite targets.
- Fuzzy or phonetic matching.
- Catalogs other than OpenNGC and HYG (SAC, NED, VSX, etc.).

## Data

### OpenNGC

- Upstream: <https://github.com/mattiaverga/OpenNGC>
- License: CC-BY-SA 4.0
- Vendored at `data/catalogs/openngc/NGC.csv` (+ any IC supplement CSVs).
- Trimmed fields written to `web/src/data/openngc.json` as an array of:
  ```ts
  {
    id: string;           // canonical "NGC 224" / "IC 1396"
    aliases: string[];    // "M 31", "Andromeda Galaxy", PGC/UGC numbers
    type: string;         // OpenNGC type code, mapped to a label
    ra_deg: number;       // J2000
    dec_deg: number;
    mag: number | null;   // V-mag if present, else B-mag, else null
    constellation: string | null;
  }
  ```
- Filtering: include all NGC/IC rows that have a position. Skip
  duplicate/star entries the DB marks as `Dup` or `*`.

### HYG (trimmed)

- Upstream: <https://www.astronexus.com/hyg> (HYG v3)
- License: CC-BY-SA (verify version when vendoring)
- Vendored at `data/catalogs/hyg/hygdata_v3.csv`.
- Trim rule: keep a row if **any** of the following holds:
  - It has a `proper` name (e.g. "Sirius"), OR
  - It has a `bayer` or `flam` designation, OR
  - Its `mag` ≤ 6.0 (naked-eye limit).
- Deduplicate by HIP/HD identity.
- Written to `web/src/data/hyg-bright.json`:
  ```ts
  {
    id: string;           // best human label: "Sirius" or "α Cyg" or "HIP 11767"
    aliases: string[];    // proper, bayer, flam, HIP, HD, HR, Gliese
    ra_deg: number;       // J2000
    dec_deg: number;
    mag: number;
    spectral: string | null;
    constellation: string | null;
  }
  ```

### Estimated sizes

| File | Rows | Size (compact JSON) |
|---|---|---|
| `openngc.json` | ~14 000 | ~2 MB |
| `hyg-bright.json` | ~5–10 000 | ~0.5–1 MB |

Both ship inside the React bundle. The dev server (Vite) and the
prod-mode aiohttp server already serve `web/src/data/objects.json` the
same way; no new backend route is added.

### Build pipeline

- `scripts/build_catalogs.py` reads the vendored CSVs and writes both
  JSON files. Run on demand by the maintainer, and from each
  `scripts/run_dev*` after the camera build, gated on a "needs rebuild"
  check (timestamp comparison against the source CSVs) so it's a no-op
  in the common case.
- The script depends only on the Python stdlib (`csv`, `json`) plus the
  already-vendored `pyyaml` if any input uses YAML; no new project
  dependencies.

### License vendoring

For each catalog directory under `data/catalogs/<name>/`:

- `LICENSE` — verbatim copy of the upstream license.
- `NOTICE` — short text file with: project name, upstream URL, upstream
  commit hash or version string vendored, author credit.

The Advanced tab footer shows: *"Star data: HYG database
(astronexus.com). Deep-sky data: OpenNGC. CC-BY-SA."* with the names
linking to the upstream URLs.

`README.md` gains a short "Third-party data" section pointing at the
two NOTICE files.

## UI

### Tab structure

`WhatToSee.tsx` becomes a thin shell that renders one of two children
based on a sub-tab state:

- `buddy/BuddyTab.tsx` — extracted from the current `WhatToSee`
  internals. Filters, time control, table, and detail panel as today.
- `advanced/AdvancedTab.tsx` — new.

A small tab switcher at the top of the left island toggles between
them. Persisted in `localStorage` under `pushnav.catalog.subtab`.

The **right island** (LocationPanel + CatalogDetail) is owned by the
shell, not by either tab — both tabs share the same observer location
and the same time control, and the selected-entry detail panel is the
same component parameterized for the entry shape.

### Advanced tab — left island

Replaces the Buddy filters + table with:

1. **Search input** — a single text field. Live-filters as the user
   types, debounced 100 ms.
2. **Manual coordinates panel** — collapsible, below the search input.
   Two text inputs (RA and Dec) and a "Use these coordinates" button.
   Accepts decimal degrees, HMS / DMS strings, or decimal hours for RA.
   Parser explicit, no auto-detect ambiguity with search.
3. **Results list** — virtualized, capped at 200 visible rows, scrolls
   inside the left island the same way the Buddy table does. Each row
   shows: id, type/source badge (NGC / Star / etc.), mag, constellation,
   click-to-select.
4. **Attribution footer** — single muted-text line referencing the
   licenses.

### Right island (shared)

`LocationPanel` unchanged. `CatalogDetail` is parameterized over an
entry shape:

```ts
type Entry =
  | { source: "buddy";  /* existing fields */ }
  | { source: "ngc";    id, aliases, type, ra_deg, dec_deg, mag, constellation }
  | { source: "star";   id, aliases, ra_deg, dec_deg, mag, spectral, constellation }
  | { source: "manual"; ra_deg, dec_deg }
```

The component renders only the fields present on the active variant:

- **Buddy**: today's full layout (equipment, LP, reward, description).
- **NGC / Star**: name, designation, type or spectral class, RA/Dec,
  mag, constellation, **plus derived Alt/Az + Rise/Transit/Set**. No
  equipment/LP/reward/description.
- **Manual**: just RA/Dec + derived visibility. No name.

"Set as target" lives in the same place as today (just under the
properties grid). It calls the existing `/api/goto/set` endpoint.

### Clear semantics

Three distinct "clears" exist, intentionally separate:

- **× inside the search input** — clears the typed query and the
  results list. Local UI only. Does not affect the current selection or
  the telescope's GOTO target.
- **Clear button on the Manual coordinates panel** — resets the RA and
  Dec inputs and unsets the Advanced-tab selection if it was a manual
  entry. Local UI only.
- **Clearing the telescope's GOTO target** — handled by the existing
  navigation-tab UI calling `/api/goto/clear`. The Advanced tab does
  **not** add a separate control for this; it stays consistent with
  where targets are managed elsewhere.

### Selection state

- Buddy selection: `localStorage` key `pushnav.catalog.selected` (already
  exists from a prior change).
- Advanced selection: new key `pushnav.catalog.advanced.selected`, value
  is the `id` of the entry plus a `source` tag (so we can rebuild it
  from the right list on reload), or the literal coordinates for the
  manual case.
- Tab switches do not clear either selection.

## Search algorithm

Pure function in `advanced/advancedSearch.ts`:

```ts
function advancedSearch(query: string, list: Entry[]): Entry[]
```

1. Normalize query: lowercase, strip punctuation and whitespace into a
   canonical form (`"M 31"`, `"m31"`, `"M  31."` all normalize the same).
2. Build per-entry haystacks at module load time (id + aliases joined,
   pre-normalized).
3. Score every entry:
   - exact match → 100
   - prefix match → 60
   - substring match → 30
   - no match → exclude
4. Sort by score desc, then by mag asc (brighter first) as a tiebreaker,
   then by id alphabetically.
5. Return top 200.

The whole pass is O(N) substring scan across ~19 000 entries — well
under one frame on any modern machine. No index needed.

## Backend

No backend changes. Reuses existing endpoints:

- `POST /api/goto/set { ra_deg, dec_deg }` for "Set as target".
- `POST /api/goto/clear` for "Clear target".

## Testing

- Unit tests for `advancedSearch` covering: punctuation normalization
  (`M31` ↔ `M 31`), prefix vs substring ordering, mag tiebreaker, empty
  query returns empty, query against aliases (`"Andromeda" → NGC 224`).
- Unit tests for the RA/Dec parser covering: decimal degrees, decimal
  hours, HMS strings (`05 35 17.3`, `05h35m17.3s`), DMS strings
  (`-05 23 28`, `-5d23'28"`), and rejection of obviously bad inputs.
- A small component test for `AdvancedTab` asserting that typing in the
  search bar populates the results list and clicking a row selects it.

## Risks and open questions

- **Bundle size:** adding ~3 MB to the JS bundle. Acceptable on desktop,
  the only deployment target. If it ever matters, the catalogs can move
  to a dynamic `import()` so they're fetched lazily after first paint.
- **HYG license version:** HYG v3 has historically been CC-BY-SA 2.5 or
  3.0. Verify at vendor time and copy the exact license text. The
  Advanced footer text must match.
- **Duplicate handling between catalogs:** a few bright stars appear in
  OpenNGC as `*` rows; those are filtered out at trim time. Spot-check
  Polaris, Sirius, Altair to confirm they come from HYG only.
- **Tab switcher style:** match the existing top-level `TabSwitch`
  component or use a simpler shadcn `Tabs`. Both fine; pick at
  implementation time.
- **Footer placement on narrow screens:** the attribution line must not
  push the results list out of view. Test the `lg:max-h-none` /
  `max-h-[70vh]` constraints with both tabs.
