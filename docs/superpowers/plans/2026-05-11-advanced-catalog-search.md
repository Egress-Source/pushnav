# Advanced Catalog Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Advanced" sub-tab under "What to See" that searches a vendored OpenNGC + trimmed-HYG catalog by name/designation, supports manual RA/Dec entry, and reuses the existing "Set as target" pipeline. The existing Stargazing Buddy view stays unchanged.

**Architecture:** Two static catalog CSVs vendored under `data/catalogs/`. A Python build script trims them into JSON files under `web/src/data/`. The React side gains a sub-tab structure inside `WhatToSee` — `BuddyTab` (extracted from today's `WhatToSee` body, no behaviour change) and `AdvancedTab` (new — search input, results list, manual coords). `CatalogDetail` is parameterized over an `Entry` discriminated union so it renders only the fields a given catalog authoritatively provides. No backend changes: "Set as target" reuses `/api/goto/set`.

**Tech Stack:** Python stdlib (csv, json) for the build; TypeScript + React + Vite + Tailwind + shadcn/ui for the UI; Vitest + @testing-library/react for component tests; pytest for the build-script test.

---

## File Structure

**Created:**

```
data/catalogs/openngc/
  NGC.csv                                       # vendored
  LICENSE                                       # CC-BY-SA 4.0 verbatim
  NOTICE                                        # attribution + commit hash
data/catalogs/hyg/
  hygdata_v3.csv                                # vendored
  LICENSE
  NOTICE
scripts/build_catalogs.py                       # CSV → JSON trim
tests/test_build_catalogs.py                    # pytest unit + integration
web/src/data/openngc.json                       # generated, committed
web/src/data/hyg-bright.json                    # generated, committed
web/src/lib/advancedSearch.ts                   # pure search function
web/src/lib/advancedSearch.test.ts              # vitest
web/src/lib/raDecParse.ts                       # RA/Dec parser
web/src/lib/raDecParse.test.ts                  # vitest
web/src/components/catalog/buddy/BuddyTab.tsx   # extracted Buddy UI
web/src/components/catalog/advanced/AdvancedTab.tsx
web/src/components/catalog/advanced/SearchInput.tsx
web/src/components/catalog/advanced/ManualEntry.tsx
web/src/components/catalog/advanced/ResultsList.tsx
web/src/components/catalog/advanced/AdvancedTab.test.tsx
```

**Modified:**

```
web/src/lib/catalogTypes.ts          # add Entry union + NgcEntry/StarEntry
web/src/components/catalog/CatalogDetail.tsx  # branch on entry.source
web/src/components/catalog/WhatToSee.tsx      # becomes shell w/ sub-tab
scripts/run_dev.sh                   # invoke build_catalogs.py (gated)
scripts/run_dev_linux.sh             # same
scripts/run_dev_windows.bat          # same
README.md                            # add "Third-party data" section
```

**Untouched:** every `scripts/build_*.sh` / `scripts/build_*.bat` / `scripts/pushnav.iss`. Production builds rely on the JSON files being committed.

---

### Task 1: Vendor the OpenNGC catalog

**Files:**
- Create: `data/catalogs/openngc/NGC.csv` (downloaded)
- Create: `data/catalogs/openngc/LICENSE`
- Create: `data/catalogs/openngc/NOTICE`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p data/catalogs/openngc
```

- [ ] **Step 2: Download `NGC.csv` from upstream at a pinned commit**

Pick the latest release tag at <https://github.com/mattiaverga/OpenNGC/releases> (e.g. `v20240801`). Substitute the tag below:

```bash
TAG=v20240801   # replace with the latest release tag at run time
curl -fL "https://raw.githubusercontent.com/mattiaverga/OpenNGC/${TAG}/database_files/NGC.csv" \
     -o data/catalogs/openngc/NGC.csv
test -s data/catalogs/openngc/NGC.csv && head -1 data/catalogs/openngc/NGC.csv
```

Expected: first line is the CSV header starting with `Name;Type;RA;Dec;...`.

- [ ] **Step 3: Add `LICENSE` (CC-BY-SA 4.0 verbatim)**

Copy the upstream `LICENSE` file verbatim:

```bash
curl -fL "https://raw.githubusercontent.com/mattiaverga/OpenNGC/${TAG}/LICENSE" \
     -o data/catalogs/openngc/LICENSE
```

- [ ] **Step 4: Write `NOTICE`**

Create `data/catalogs/openngc/NOTICE` with:

```
OpenNGC — open deep-sky object database
Source: https://github.com/mattiaverga/OpenNGC
Version vendored: <TAG>      (record the tag chosen above)
Author: Mattia Verga
License: CC-BY-SA 4.0 (see LICENSE in this directory)

This data is unmodified from the upstream release. PushNav's
scripts/build_catalogs.py reads NGC.csv at build time and emits a
trimmed JSON projection at web/src/data/openngc.json; that derived
JSON is therefore also distributed under CC-BY-SA 4.0.
```

- [ ] **Step 5: Commit**

```bash
git add data/catalogs/openngc/
git commit -m "data: vendor OpenNGC ${TAG} (CC-BY-SA 4.0)"
```

---

### Task 2: Vendor the HYG catalog

**Files:**
- Create: `data/catalogs/hyg/hygdata_v3.csv`
- Create: `data/catalogs/hyg/LICENSE`
- Create: `data/catalogs/hyg/NOTICE`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p data/catalogs/hyg
```

- [ ] **Step 2: Download `hygdata_v3.csv` from upstream at a pinned commit**

Pick the latest commit on the `main` branch of <https://github.com/astronexus/HYG-Database> (or a release tag if one exists). Find the file by browsing — at time of writing the path is `hyg/v3/hyg_v36.csv` or similar; the exact filename has shifted across revisions.

```bash
COMMIT=<40-char-sha>
curl -fL "https://raw.githubusercontent.com/astronexus/HYG-Database/${COMMIT}/hyg/v3/hyg_v36.csv" \
     -o data/catalogs/hyg/hygdata_v3.csv
test -s data/catalogs/hyg/hygdata_v3.csv && head -1 data/catalogs/hyg/hygdata_v3.csv
```

Expected: first line is a CSV header including `id,hip,hd,hr,gl,bf,proper,ra,dec,...`.

If the filename has changed upstream, adjust the URL and keep the local filename `hygdata_v3.csv` for consistency with the rest of the plan.

- [ ] **Step 3: Copy upstream `LICENSE` verbatim**

```bash
curl -fL "https://raw.githubusercontent.com/astronexus/HYG-Database/${COMMIT}/LICENSE" \
     -o data/catalogs/hyg/LICENSE
```

If the upstream tree has no `LICENSE` at the root, check the project's README (or `hyg/README.md`) for the license text and copy that. The HYG database has historically been distributed under CC-BY-SA — record the exact version stated upstream.

- [ ] **Step 4: Write `NOTICE`**

Create `data/catalogs/hyg/NOTICE` with:

```
HYG v3 — merged star catalog (Hipparcos + Yale Bright Star + Gliese)
Source: https://github.com/astronexus/HYG-Database
Commit vendored: <COMMIT>
Author: David Nash (astronexus.com)
License: CC-BY-SA <version as stated upstream> (see LICENSE in this directory)

This data is unmodified from the upstream snapshot. PushNav's
scripts/build_catalogs.py reads hygdata_v3.csv at build time and emits a
trimmed JSON projection (named stars, Bayer/Flamsteed designations, and
all rows with mag ≤ 6.0) at web/src/data/hyg-bright.json; that derived
JSON is therefore also distributed under CC-BY-SA.
```

- [ ] **Step 5: Commit**

```bash
git add data/catalogs/hyg/
git commit -m "data: vendor HYG v3 (CC-BY-SA)"
```

---

### Task 3: Build script `scripts/build_catalogs.py` with tests

**Files:**
- Create: `scripts/build_catalogs.py`
- Create: `tests/test_build_catalogs.py`
- Create: `tests/fixtures/openngc_sample.csv`
- Create: `tests/fixtures/hyg_sample.csv`
- Create (output): `web/src/data/openngc.json`
- Create (output): `web/src/data/hyg-bright.json`

- [ ] **Step 1: Write the OpenNGC fixture**

`tests/fixtures/openngc_sample.csv` (semicolon-separated, mimicking real OpenNGC schema with only the columns we read):

```
Name;Type;RA;Dec;Const;V-Mag;B-Mag;M;NGC;IC;Common names;Identifiers
NGC0224;G;00:42:44.30;+41:16:09.4;And;3.44;4.36;31;;;Andromeda Galaxy;PGC 2557,UGC 454
NGC0598;G;01:33:50.89;+30:39:35.8;Tri;5.72;6.27;33;;;Triangulum Galaxy,Pinwheel Galaxy;PGC 5818
NGC1976;Neb;05:35:17.30;-05:23:28.0;Ori;4.00;;;42;;Great Orion Nebula;
NGC0001;G;00:07:15.86;+27:42:29.7;Peg;13.7;14.4;;;;;PGC 632
DUMMY01;Dup;00:00:00.00;+00:00:00.0;;;;;;;;
DUMMY02;*;00:00:00.00;+00:00:00.0;;;;;;;;
```

- [ ] **Step 2: Write the HYG fixture**

`tests/fixtures/hyg_sample.csv` (comma-separated, only the columns we read):

```
id,hip,hd,hr,gl,bf,proper,ra,dec,mag,spect,con
1,32349,48915,2491,,9Alp CMa,Sirius,6.7525,-16.7161,-1.46,A1V,CMa
2,91262,172167,7001,,3Alp Lyr,Vega,18.6157,38.7836,0.03,A0Vvar,Lyr
3,97649,187642,7557,,53Alp Aql,Altair,19.8463,8.8683,0.76,A7V,Aql
4,108248,213306,8571,,,,18.6457,52.8478,4.62,F7V,Cyg
5,99999,888888,,,Gl 411,,,,9.5,M2V,UMa
6,11111,222222,,,,,12.3456,-45.6789,8.5,K0V,Sco
7,22222,333333,,,15Bet Cyg,Albireo,19.5125,27.9595,3.05,K2II,Cyg
8,33333,,,,,,2.0,2.0,11.5,M5V,Ori
```

Notes about what each row exercises:
- Sirius, Vega, Altair: proper name + bayer-flam, bright. Kept.
- Row 4 (HIP 108248): no proper, no bf, mag 4.62 — kept because mag ≤ 6.
- Row 5 (Gl 411): no proper, no bf, mag 9.5 → mag rule fails — but it has a `bf` ("Gl 411") so kept? Wait: `bf` is the Bayer-Flamsteed combined field. Gl 411 is a Gliese ID, not a Bayer-Flamsteed. Drop. This row tests the "no name, no Bayer/Flamsteed, dim" exclusion.
- Row 6: no proper, no bf, mag 8.5 — dropped.
- Albireo (HIP 22222): proper + bf, dim. Kept by name rule.
- Row 8: bare HIP, mag 11.5 — dropped.

Expected kept rows: Sirius, Vega, Altair, HIP 108248, Albireo. Dropped: Gl 411, HIP 11111, HIP 33333.

- [ ] **Step 3: Write the failing unit tests**

`tests/test_build_catalogs.py`:

```python
# Copyright (C) 2026 Arun Venkataswamy
#
# This file is part of PushNav. See LICENSE in repo root.

"""Unit tests for scripts/build_catalogs.py."""

import json
from pathlib import Path

import pytest

# scripts/ isn't on sys.path by default — make the module importable.
import sys
SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS))

import build_catalogs  # noqa: E402


FIXTURES = Path(__file__).resolve().parent / "fixtures"


# ----- OpenNGC ---------------------------------------------------------------

def test_openngc_trim_keeps_real_objects():
    entries = build_catalogs.trim_openngc(FIXTURES / "openngc_sample.csv")
    ids = {e["id"] for e in entries}
    assert "NGC 224" in ids       # Andromeda
    assert "NGC 598" in ids       # Triangulum
    assert "NGC 1976" in ids      # Orion Nebula
    assert "NGC 1" in ids         # plain DSO


def test_openngc_trim_drops_duplicate_and_star_rows():
    entries = build_catalogs.trim_openngc(FIXTURES / "openngc_sample.csv")
    ids = {e["id"] for e in entries}
    assert "DUMMY 01" not in ids
    assert "DUMMY 02" not in ids


def test_openngc_aliases_include_messier_and_common_names():
    entries = build_catalogs.trim_openngc(FIXTURES / "openngc_sample.csv")
    by_id = {e["id"]: e for e in entries}
    m31 = by_id["NGC 224"]
    assert "M 31" in m31["aliases"]
    assert "Andromeda Galaxy" in m31["aliases"]
    # Cross-IDs from the Identifiers column
    assert "PGC 2557" in m31["aliases"]


def test_openngc_ra_dec_in_degrees():
    entries = build_catalogs.trim_openngc(FIXTURES / "openngc_sample.csv")
    m31 = next(e for e in entries if e["id"] == "NGC 224")
    # 00:42:44.30 → 10.6846° ;  +41:16:09.4 → 41.2693°
    assert m31["ra_deg"] == pytest.approx(10.6846, abs=0.001)
    assert m31["dec_deg"] == pytest.approx(41.2693, abs=0.001)


def test_openngc_prefers_v_mag_else_b_mag_else_null():
    entries = build_catalogs.trim_openngc(FIXTURES / "openngc_sample.csv")
    by_id = {e["id"]: e for e in entries}
    assert by_id["NGC 224"]["mag"] == pytest.approx(3.44)
    # NGC 1976 has V-Mag only
    assert by_id["NGC 1976"]["mag"] == pytest.approx(4.00)


# ----- HYG -------------------------------------------------------------------

def test_hyg_trim_keeps_named_or_bayer_or_bright():
    entries = build_catalogs.trim_hyg(FIXTURES / "hyg_sample.csv")
    ids = {e["id"] for e in entries}
    assert "Sirius" in ids
    assert "Vega" in ids
    assert "Altair" in ids
    assert "Albireo" in ids
    # Bright unnamed row (HIP 108248, mag 4.62, no Bayer/Flam)
    assert "HIP 108248" in ids


def test_hyg_trim_drops_dim_unnamed_rows():
    entries = build_catalogs.trim_hyg(FIXTURES / "hyg_sample.csv")
    ids = {e["id"] for e in entries}
    assert "HIP 11111" not in ids
    assert "HIP 33333" not in ids


def test_hyg_ra_dec_converted_from_hours_to_degrees():
    entries = build_catalogs.trim_hyg(FIXTURES / "hyg_sample.csv")
    sirius = next(e for e in entries if e["id"] == "Sirius")
    # HYG RA is in decimal hours: 6.7525 h × 15 = 101.2875°
    assert sirius["ra_deg"] == pytest.approx(101.2875, abs=0.001)
    assert sirius["dec_deg"] == pytest.approx(-16.7161, abs=0.001)


def test_hyg_aliases_include_hip_hd_hr_and_bayer():
    entries = build_catalogs.trim_hyg(FIXTURES / "hyg_sample.csv")
    sirius = next(e for e in entries if e["id"] == "Sirius")
    assert "HIP 32349" in sirius["aliases"]
    assert "HD 48915"  in sirius["aliases"]
    assert "HR 2491"   in sirius["aliases"]
    # The "9Alp CMa" raw bf should be normalised to "α CMa"
    assert "α CMa" in sirius["aliases"]


def test_hyg_skips_self_origin_row():
    """HYG row 0 is the Sun (id=0). Make sure we don't ship it."""
    # Our fixture starts at id=1, so the assertion is implicit — but be
    # explicit so the trim function stays defensive against id == 0.
    entries = build_catalogs.trim_hyg(FIXTURES / "hyg_sample.csv")
    for e in entries:
        assert e["id"] != "Sun"
```

- [ ] **Step 4: Run the tests to verify they fail**

```bash
uv run pytest tests/test_build_catalogs.py -v
```

Expected: ImportError or AttributeError because `build_catalogs.trim_openngc` and `trim_hyg` don't exist yet.

- [ ] **Step 5: Implement `scripts/build_catalogs.py`**

```python
# Copyright (C) 2026 Arun Venkataswamy
#
# This file is part of PushNav.
#
# PushNav is free software: you can redistribute it and/or modify it
# under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# PushNav is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with PushNav. If not, see <https://www.gnu.org/licenses/>.

"""Trim vendored OpenNGC + HYG CSVs into the JSON projections that
the React UI imports.

Run from the repo root:

    uv run python scripts/build_catalogs.py

The script is idempotent and gated on source-CSV mtimes inside
scripts/run_dev*, so dev workflows don't pay the trim cost on every
launch.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parent.parent
OPENNGC_CSV = REPO_ROOT / "data" / "catalogs" / "openngc" / "NGC.csv"
HYG_CSV     = REPO_ROOT / "data" / "catalogs" / "hyg"     / "hygdata_v3.csv"
OPENNGC_OUT = REPO_ROOT / "web" / "src" / "data" / "openngc.json"
HYG_OUT     = REPO_ROOT / "web" / "src" / "data" / "hyg-bright.json"


# ----- shared helpers --------------------------------------------------------

def _hms_to_deg(s: str) -> float:
    """'HH:MM:SS.s' → decimal degrees of arc on the equator (×15 from hours)."""
    h, m, sec = s.strip().split(":")
    return (float(h) + float(m) / 60 + float(sec) / 3600) * 15


def _dms_to_deg(s: str) -> float:
    """'±DD:MM:SS.s' → decimal degrees."""
    s = s.strip()
    sign = -1 if s.startswith("-") else 1
    if s[0] in "+-":
        s = s[1:]
    d, m, sec = s.split(":")
    return sign * (float(d) + float(m) / 60 + float(sec) / 3600)


_GREEK = {
    "Alp": "α", "Bet": "β", "Gam": "γ", "Del": "δ", "Eps": "ε",
    "Zet": "ζ", "Eta": "η", "The": "θ", "Iot": "ι", "Kap": "κ",
    "Lam": "λ", "Mu":  "μ", "Nu":  "ν", "Xi":  "ξ", "Omi": "ο",
    "Pi":  "π", "Rho": "ρ", "Sig": "σ", "Tau": "τ", "Ups": "υ",
    "Phi": "φ", "Chi": "χ", "Psi": "ψ", "Ome": "ω",
}


def _bayer_flam_pretty(bf: str) -> tuple[str | None, str | None]:
    """HYG's `bf` field encodes Flamsteed + Bayer in one string:

        "9Alp CMa"   → flam="9 CMa", bayer="α CMa"
        "15Bet Cyg"  → flam="15 Cyg", bayer="β Cyg"
        "21Alp Cyg"  → flam="21 Cyg", bayer="α Cyg"
        "53Alp Aql"  → flam="53 Aql", bayer="α Aql"

    The leading digits are the Flamsteed number; the 3-letter Greek
    abbreviation is the Bayer letter; the trailing 3-letter token is
    the IAU constellation abbreviation.

    Returns (flam_label, bayer_label), either of which may be None if
    the corresponding piece is absent.
    """
    bf = bf.strip()
    if not bf:
        return None, None
    m = re.match(r"^\s*(\d+)?\s*([A-Z][a-z]{2})?\s*([A-Z][a-z]{2})\s*$", bf)
    if not m:
        return None, None
    flam_num, bayer_abbr, con = m.groups()
    flam = f"{flam_num} {con}" if flam_num else None
    bayer = f"{_GREEK[bayer_abbr]} {con}" if bayer_abbr and bayer_abbr in _GREEK else None
    return flam, bayer


# ----- OpenNGC --------------------------------------------------------------

def _format_ngc_id(raw: str) -> str:
    """'NGC0224' / 'IC1396'  →  'NGC 224' / 'IC 1396'.

    Falls back to the raw token (with a single space inserted between
    the alphabetic prefix and the trailing number) for anything that
    doesn't start with NGC/IC.
    """
    m = re.match(r"^\s*([A-Za-z]+)\s*0*(\d+)\s*$", raw)
    if not m:
        return raw.strip()
    return f"{m.group(1).upper()} {m.group(2)}"


def _parse_float(s: str) -> float | None:
    s = (s or "").strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _split_comma(s: str) -> list[str]:
    return [x.strip() for x in (s or "").split(",") if x.strip()]


def trim_openngc(csv_path: Path) -> list[dict]:
    out: list[dict] = []
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            kind = (row.get("Type") or "").strip()
            if kind in {"Dup", "*", ""}:
                continue
            ra_raw = (row.get("RA") or "").strip()
            dec_raw = (row.get("Dec") or "").strip()
            if not ra_raw or not dec_raw:
                continue
            ra_deg = _hms_to_deg(ra_raw)
            dec_deg = _dms_to_deg(dec_raw)
            v_mag = _parse_float(row.get("V-Mag", ""))
            b_mag = _parse_float(row.get("B-Mag", ""))
            mag = v_mag if v_mag is not None else b_mag
            aliases: list[str] = []
            messier = (row.get("M") or "").strip()
            if messier:
                aliases.append(f"M {int(messier)}")
            for name in _split_comma(row.get("Common names", "")):
                aliases.append(name)
            for ident in _split_comma(row.get("Identifiers", "")):
                aliases.append(ident)
            out.append({
                "id": _format_ngc_id(row.get("Name", "")),
                "aliases": aliases,
                "type": kind,
                "ra_deg": round(ra_deg, 6),
                "dec_deg": round(dec_deg, 6),
                "mag": round(mag, 2) if mag is not None else None,
                "constellation": (row.get("Const") or "").strip() or None,
            })
    return out


# ----- HYG ------------------------------------------------------------------

def trim_hyg(csv_path: Path) -> list[dict]:
    out: list[dict] = []
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            proper = (row.get("proper") or "").strip()
            bf_raw = (row.get("bf") or "").strip()
            mag = _parse_float(row.get("mag", ""))
            # Trim rule: any of named / Bayer-Flamsteed / bright
            has_bf = bool(bf_raw)
            bright = mag is not None and mag <= 6.0
            if not (proper or has_bf or bright):
                continue
            ra_h = _parse_float(row.get("ra", ""))
            dec_d = _parse_float(row.get("dec", ""))
            if ra_h is None or dec_d is None:
                continue
            hip = (row.get("hip") or "").strip()
            hd  = (row.get("hd")  or "").strip()
            hr  = (row.get("hr")  or "").strip()
            gl  = (row.get("gl")  or "").strip()
            spect = (row.get("spect") or "").strip() or None
            con = (row.get("con") or "").strip() or None
            flam_label, bayer_label = _bayer_flam_pretty(bf_raw)
            # Best human label, in priority order.
            if proper:
                ident = proper
            elif bayer_label:
                ident = bayer_label
            elif flam_label:
                ident = flam_label
            elif hip:
                ident = f"HIP {hip}"
            elif hd:
                ident = f"HD {hd}"
            elif hr:
                ident = f"HR {hr}"
            elif gl:
                ident = f"Gl {gl}"
            else:
                continue                       # nothing to call this row
            if ident == "Sun":
                continue
            aliases: list[str] = []
            if proper:        aliases.append(proper)
            if bayer_label:   aliases.append(bayer_label)
            if flam_label:    aliases.append(flam_label)
            if hip:           aliases.append(f"HIP {hip}")
            if hd:            aliases.append(f"HD {hd}")
            if hr:            aliases.append(f"HR {hr}")
            if gl:            aliases.append(f"Gl {gl}")
            # De-dup while preserving order.
            seen: set[str] = set()
            aliases = [a for a in aliases if not (a in seen or seen.add(a))]
            out.append({
                "id": ident,
                "aliases": aliases,
                "ra_deg": round(ra_h * 15.0, 6),
                "dec_deg": round(dec_d, 6),
                "mag": round(mag, 2) if mag is not None else None,
                "spectral": spect,
                "constellation": con,
            })
    return out


# ----- CLI ------------------------------------------------------------------

def _write_json(path: Path, data: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))


def main() -> None:
    ngc = trim_openngc(OPENNGC_CSV)
    _write_json(OPENNGC_OUT, ngc)
    print(f"openngc.json: {len(ngc):>6} entries → {OPENNGC_OUT}")
    hyg = trim_hyg(HYG_CSV)
    _write_json(HYG_OUT, hyg)
    print(f"hyg-bright.json: {len(hyg):>4} entries → {HYG_OUT}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Re-run the tests**

```bash
uv run pytest tests/test_build_catalogs.py -v
```

Expected: all tests pass.

- [ ] **Step 7: Run the script end-to-end against the real vendored CSVs**

```bash
uv run python scripts/build_catalogs.py
```

Expected: two log lines, ~14 000 NGC entries and ~5 000–10 000 HYG entries; files `web/src/data/openngc.json` and `web/src/data/hyg-bright.json` exist.

Sanity check the outputs:

```bash
jq '.[] | select(.id == "NGC 224") | .aliases' web/src/data/openngc.json
jq '.[] | select(.id == "Sirius")  | {id, ra_deg, dec_deg, mag}' web/src/data/hyg-bright.json
```

Expected: Andromeda's aliases include `"M 31"` and `"Andromeda Galaxy"`; Sirius's RA is ~101.29°, Dec ~-16.72°, mag −1.46.

- [ ] **Step 8: Commit**

```bash
git add scripts/build_catalogs.py tests/test_build_catalogs.py \
        tests/fixtures/openngc_sample.csv tests/fixtures/hyg_sample.csv \
        web/src/data/openngc.json web/src/data/hyg-bright.json
git commit -m "feat(catalog): build_catalogs.py — trim OpenNGC + HYG to JSON"
```

---

### Task 4: RA/Dec parser `web/src/lib/raDecParse.ts`

**Files:**
- Create: `web/src/lib/raDecParse.ts`
- Create: `web/src/lib/raDecParse.test.ts`

- [ ] **Step 1: Write the failing tests**

`web/src/lib/raDecParse.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseRaInput, parseDecInput } from "./raDecParse";

describe("parseRaInput", () => {
  it("accepts decimal degrees", () => {
    expect(parseRaInput("83.633")).toBeCloseTo(83.633, 3);
  });

  it("accepts decimal hours when the user types a trailing 'h'", () => {
    expect(parseRaInput("5.5h")).toBeCloseTo(82.5, 3);
  });

  it("accepts HMS with colons", () => {
    expect(parseRaInput("05:35:17.3")).toBeCloseTo(83.822, 2);
  });

  it("accepts HMS with letters", () => {
    expect(parseRaInput("5h35m17.3s")).toBeCloseTo(83.822, 2);
  });

  it("accepts HMS with whitespace", () => {
    expect(parseRaInput("5 35 17.3")).toBeCloseTo(83.822, 2);
  });

  it("rejects nonsense", () => {
    expect(parseRaInput("not a number")).toBeNull();
    expect(parseRaInput("")).toBeNull();
  });

  it("rejects RA outside [0, 360)", () => {
    expect(parseRaInput("400")).toBeNull();
    expect(parseRaInput("-1")).toBeNull();
  });
});

describe("parseDecInput", () => {
  it("accepts decimal degrees with sign", () => {
    expect(parseDecInput("-5.391")).toBeCloseTo(-5.391, 3);
    expect(parseDecInput("+41.269")).toBeCloseTo(41.269, 3);
  });

  it("accepts DMS with colons and sign", () => {
    expect(parseDecInput("-05:23:28")).toBeCloseTo(-5.391, 2);
  });

  it("accepts DMS with letters", () => {
    expect(parseDecInput("-5d23m28s")).toBeCloseTo(-5.391, 2);
    expect(parseDecInput(`-5°23'28"`)).toBeCloseTo(-5.391, 2);
  });

  it("rejects Dec outside [-90, 90]", () => {
    expect(parseDecInput("100")).toBeNull();
    expect(parseDecInput("-91")).toBeNull();
  });

  it("rejects nonsense", () => {
    expect(parseDecInput("xyz")).toBeNull();
    expect(parseDecInput("")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web && npx vitest run src/lib/raDecParse.test.ts
```

Expected: failure — module not found.

- [ ] **Step 3: Implement `raDecParse.ts`**

`web/src/lib/raDecParse.ts`:

```ts
/**
 * Parse a free-form RA string into decimal degrees in [0, 360).
 *
 * Accepts:
 *   "83.633"           — decimal degrees
 *   "5.5h"             — decimal hours (trailing h)
 *   "05:35:17.3"       — H M S
 *   "5h35m17.3s"       — H M S with letters
 *   "5 35 17.3"        — H M S with whitespace
 *
 * Returns null for unparseable input or out-of-range values.
 */
export function parseRaInput(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  // Decimal hours: trailing 'h' on a single number
  const hMatch = s.match(/^([+-]?\d+(?:\.\d+)?)\s*h$/i);
  if (hMatch) {
    const deg = parseFloat(hMatch[1]) * 15;
    return inRange(deg, 0, 360) ? deg : null;
  }
  // Bare decimal: interpret as degrees
  const numMatch = s.match(/^[+-]?\d+(?:\.\d+)?$/);
  if (numMatch) {
    const deg = parseFloat(s);
    return inRange(deg, 0, 360) ? deg : null;
  }
  // HMS: split on any of : h m s or whitespace
  const parts = s
    .replace(/[hms]/gi, " ")
    .split(/[:\s]+/)
    .filter(Boolean);
  if (parts.length === 3) {
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const sec = parseFloat(parts[2]);
    if ([h, m, sec].every(Number.isFinite) && m >= 0 && sec >= 0) {
      const deg = (h + m / 60 + sec / 3600) * 15;
      return inRange(deg, 0, 360) ? deg : null;
    }
  }
  return null;
}

/**
 * Parse a free-form Dec string into decimal degrees in [-90, 90].
 *
 * Accepts:
 *   "-5.391"
 *   "+41.269"
 *   "-05:23:28"
 *   "-5d23m28s"
 *   "-5°23'28""
 *   "-5 23 28"
 *
 * Returns null for unparseable or out-of-range input.
 */
export function parseDecInput(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const numMatch = s.match(/^[+-]?\d+(?:\.\d+)?$/);
  if (numMatch) {
    const deg = parseFloat(s);
    return inRange(deg, -90, 90) ? deg : null;
  }
  const sign = s.startsWith("-") ? -1 : 1;
  const body = s.replace(/^[+-]/, "");
  const parts = body
    .replace(/[d°m'’s"”]/gi, " ")
    .split(/[:\s]+/)
    .filter(Boolean);
  if (parts.length === 3) {
    const d = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const sec = parseFloat(parts[2]);
    if ([d, m, sec].every(Number.isFinite) && m >= 0 && sec >= 0) {
      const deg = sign * (Math.abs(d) + m / 60 + sec / 3600);
      return inRange(deg, -90, 90) ? deg : null;
    }
  }
  return null;
}

function inRange(x: number, lo: number, hi: number): boolean {
  return Number.isFinite(x) && x >= lo && x <= hi;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd web && npx vitest run src/lib/raDecParse.test.ts
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/raDecParse.ts web/src/lib/raDecParse.test.ts
git commit -m "feat(catalog): RA/Dec parser for manual coordinate entry"
```

---

### Task 5: Search algorithm `web/src/lib/advancedSearch.ts`

**Files:**
- Create: `web/src/lib/advancedSearch.ts`
- Create: `web/src/lib/advancedSearch.test.ts`

- [ ] **Step 1: Write the failing tests**

`web/src/lib/advancedSearch.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { advancedSearch, normaliseQuery } from "./advancedSearch";
import type { AdvancedEntry } from "./catalogTypes";

const m31: AdvancedEntry = {
  source: "ngc",
  id: "NGC 224",
  aliases: ["M 31", "Andromeda Galaxy", "PGC 2557"],
  type: "G",
  ra_deg: 10.6846, dec_deg: 41.2693, mag: 3.44,
  constellation: "And",
};
const sirius: AdvancedEntry = {
  source: "star",
  id: "Sirius",
  aliases: ["α CMa", "9 CMa", "HIP 32349", "HD 48915", "HR 2491"],
  ra_deg: 101.2875, dec_deg: -16.7161, mag: -1.46,
  spectral: "A1V", constellation: "CMa",
};
const vega: AdvancedEntry = {
  source: "star",
  id: "Vega",
  aliases: ["α Lyr", "3 Lyr", "HIP 91262"],
  ra_deg: 279.2347, dec_deg: 38.7836, mag: 0.03,
  spectral: "A0V", constellation: "Lyr",
};

const list = [m31, sirius, vega];

describe("normaliseQuery", () => {
  it("strips punctuation and case", () => {
    expect(normaliseQuery("M 31")).toBe("m31");
    expect(normaliseQuery("m31")).toBe("m31");
    expect(normaliseQuery("M  31.")).toBe("m31");
    expect(normaliseQuery("α CMa")).toBe("αcma");
  });
});

describe("advancedSearch", () => {
  it("returns empty for empty query", () => {
    expect(advancedSearch("", list)).toEqual([]);
  });

  it("finds an entry by Messier alias regardless of spacing", () => {
    expect(advancedSearch("M31", list)[0].id).toBe("NGC 224");
    expect(advancedSearch("M 31", list)[0].id).toBe("NGC 224");
  });

  it("finds an entry by common name substring", () => {
    expect(advancedSearch("Andromeda", list)[0].id).toBe("NGC 224");
  });

  it("ranks exact id match above substring match", () => {
    // 'Sirius' and a hypothetical entry whose alias merely contains
    // 'Sirius' should still order the exact id first.
    const sirius_b: AdvancedEntry = {
      ...sirius, id: "Foo", aliases: ["Has-Sirius-In-Name"],
    };
    const result = advancedSearch("Sirius", [sirius, sirius_b]);
    expect(result[0].id).toBe("Sirius");
  });

  it("ranks prefix match above substring match", () => {
    // 'V' against Vega (id starts with V) vs Sirius (alpha CMa)
    const result = advancedSearch("V", list);
    expect(result[0].id).toBe("Vega");
  });

  it("uses brighter mag as tiebreaker among substring matches", () => {
    // 'star' isn't in any entry; force a tie by searching for a token
    // that appears equally in two entries' aliases.
    const a: AdvancedEntry = { ...sirius, id: "A", aliases: ["xyz"], mag: 5 };
    const b: AdvancedEntry = { ...sirius, id: "B", aliases: ["xyz"], mag: 1 };
    const result = advancedSearch("xyz", [a, b]);
    expect(result[0].id).toBe("B");                 // brighter (lower mag) first
  });

  it("caps results at 200", () => {
    const many: AdvancedEntry[] = Array.from({ length: 500 }, (_, i) => ({
      source: "star", id: `Star ${i}`, aliases: ["star"],
      ra_deg: 0, dec_deg: 0, mag: 5, spectral: null, constellation: null,
    }));
    expect(advancedSearch("star", many).length).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web && npx vitest run src/lib/advancedSearch.test.ts
```

Expected: failure — module not found.

- [ ] **Step 3: Implement `advancedSearch.ts`**

`web/src/lib/advancedSearch.ts`:

```ts
import type { AdvancedEntry } from "./catalogTypes";

const RESULT_CAP = 200;

/** Lowercase + strip non-alphanumeric (so "M 31", "m31", "m-31" all collide). */
export function normaliseQuery(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9α-ω]/gi, "");
}

interface Scored {
  entry: AdvancedEntry;
  score: number;
}

/**
 * Match `query` against the id + aliases of each entry, score, sort,
 * and return the top RESULT_CAP results.
 *
 * Scoring (descending):
 *   100  exact id or alias
 *    60  id or alias begins with the query
 *    30  id or alias contains the query
 *     0  no match (excluded)
 *
 * Tiebreaker:  brighter mag first (lower numeric mag), then alphabetical id.
 */
export function advancedSearch(
  query: string, entries: AdvancedEntry[],
): AdvancedEntry[] {
  const q = normaliseQuery(query);
  if (!q) return [];
  const scored: Scored[] = [];
  for (const entry of entries) {
    const score = scoreEntry(q, entry);
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const am = a.entry.mag ?? Infinity;
    const bm = b.entry.mag ?? Infinity;
    if (am !== bm) return am - bm;
    return a.entry.id.localeCompare(b.entry.id);
  });
  return scored.slice(0, RESULT_CAP).map((s) => s.entry);
}

function scoreEntry(q: string, entry: AdvancedEntry): number {
  if (entry.source === "manual") return 0;        // manual entries are never search results
  let best = 0;
  const candidates = [entry.id, ...entry.aliases];
  for (const c of candidates) {
    const n = normaliseQuery(c);
    if (n === q) return 100;                       // can't beat exact match
    if (n.startsWith(q) && best < 60) best = 60;
    else if (n.includes(q) && best < 30) best = 30;
  }
  return best;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd web && npx vitest run src/lib/advancedSearch.test.ts
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/advancedSearch.ts web/src/lib/advancedSearch.test.ts
git commit -m "feat(catalog): advancedSearch — scored substring match over catalog entries"
```

---

### Task 6: Extend `catalogTypes.ts` with the Entry union

**Files:**
- Modify: `web/src/lib/catalogTypes.ts` (append new types at the bottom)

- [ ] **Step 1: Append the new types**

Open `web/src/lib/catalogTypes.ts` and add the following at the end of the file (after the existing exports):

```ts
// -- Advanced-catalog entry shapes (used by the AdvancedTab and by
//    the parameterized CatalogDetail). Each variant is what the
//    upstream DB authoritatively provides; the CatalogDetail
//    renders only those fields plus the derived alt/az + rise/set.

export interface NgcEntry {
  source: "ngc";
  id: string;
  aliases: string[];
  type: string;              // OpenNGC type code: G, OC, GC, PN, Neb, ...
  ra_deg: number;
  dec_deg: number;
  mag: number | null;
  constellation: string | null;
}

export interface StarEntry {
  source: "star";
  id: string;
  aliases: string[];
  ra_deg: number;
  dec_deg: number;
  mag: number | null;
  spectral: string | null;
  constellation: string | null;
}

export interface ManualEntry {
  source: "manual";
  ra_deg: number;
  dec_deg: number;
}

/** Discriminated union — matches whatever the user selected in the
 *  Advanced tab. The Buddy tab still uses CatalogObject directly. */
export type AdvancedEntry = NgcEntry | StarEntry | ManualEntry;

// Pretty label for an OpenNGC type code.
export const NGC_TYPE_LABELS: Record<string, string> = {
  G:   "Galaxy",
  GPair: "Galaxy pair",
  GTrpl: "Galaxy triple",
  GGroup: "Galaxy group",
  OC:  "Open cluster",
  GC:  "Globular cluster",
  Cl:  "Cluster",
  PN:  "Planetary nebula",
  HII: "HII region",
  EmN: "Emission nebula",
  RfN: "Reflection nebula",
  SNR: "Supernova remnant",
  Neb: "Nebula",
  Other: "Other",
};
```

- [ ] **Step 2: Verify type-check passes**

```bash
cd web && npx tsc --noEmit
```

Expected: rc=0 (no output).

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/catalogTypes.ts
git commit -m "feat(catalog): AdvancedEntry discriminated union + NGC type labels"
```

---

### Task 7: Refactor `CatalogDetail.tsx` to render any Entry variant

**Files:**
- Modify: `web/src/components/catalog/CatalogDetail.tsx`

The current component receives `object: CatalogObject | null` (Buddy entries only). After this task it accepts an `entry: { kind: "buddy"; object: CatalogObject } | AdvancedEntry | null` and renders only the fields each variant authoritatively provides.

- [ ] **Step 1: Replace the `Props` interface**

In `web/src/components/catalog/CatalogDetail.tsx`, replace:

```ts
interface Props {
  object: CatalogObject | null;
  location: { latitude: number; longitude: number } | null;
  evalAt: Date;
  onTargetSet?: () => void;
}
```

with:

```ts
import type {
  CatalogObject, AdvancedEntry, NGC_TYPE_LABELS,
} from "@/lib/catalogTypes";

type DetailInput =
  | { kind: "buddy";    object: CatalogObject }
  | { kind: "advanced"; entry:  AdvancedEntry };

interface Props {
  input: DetailInput | null;
  location: { latitude: number; longitude: number } | null;
  evalAt: Date;
  onTargetSet?: () => void;
}
```

Update the existing single import:

```ts
// remove:
// import { azimuthCompass, type CatalogObject } from "@/lib/catalogTypes";
// add (replacing the original line):
import { azimuthCompass } from "@/lib/catalogTypes";
```

- [ ] **Step 2: Replace the function signature + early-return**

```ts
export function CatalogDetail({
  input, location, evalAt, onTargetSet,
}: Props) {
  const [setting, setSetting] = useState(false);
  const [setOk, setSetOk] = useState<null | "ok" | "error">(null);

  if (!input) {
    return (
      <div className="text-sm text-muted-foreground">
        Select an object on the left to see details.
      </div>
    );
  }
```

- [ ] **Step 3: Derive a common `coords` block from `input`**

After the early return, insert this block (replaces the existing
`raHours = parseRA(object.rightAscension)` / `decDeg = parseDec(...)`
lines):

```ts
  // Unified view of whatever was passed in.
  let raDeg: number | null = null;
  let decDeg: number | null = null;
  if (input.kind === "buddy") {
    const rh = parseRA(input.object.rightAscension);
    const dd = parseDec(input.object.declination);
    raDeg = rh !== null ? rh * 15 : null;
    decDeg = dd;
  } else {
    raDeg = input.entry.ra_deg;
    decDeg = input.entry.dec_deg;
  }
  const raHours = raDeg !== null ? raDeg / 15 : null;
```

- [ ] **Step 4: Existing visibility-math block is unchanged**

The existing block that calls `altAzFromRaDec(...)` / `riseSetTransitUtc(...)`
already uses the locals `raHours` and `decDeg`, which Step 3 redefined
to be sourced from either the Buddy object or the Advanced entry.
**No edit needed in this step** — just confirm the block stays as it was.

- [ ] **Step 5: Update `handleSetTarget` to use `raDeg`/`decDeg`**

```ts
  async function handleSetTarget() {
    if (raDeg === null || decDeg === null) return;
    setSetting(true); setSetOk(null);
    try {
      await api.setGoto(raDeg, decDeg);
      setSetOk("ok");
      onTargetSet?.();
    } catch {
      setSetOk("error");
    } finally {
      setSetting(false);
      setTimeout(() => setSetOk(null), 2500);
    }
  }
```

- [ ] **Step 6: Replace the JSX body with a variant-aware render**

Replace everything from `return (` through the closing `)` of the
component with:

```tsx
  return (
    <div className="flex flex-col gap-3 text-sm">
      {/* Header */}
      {input.kind === "buddy" ? (
        <BuddyHeader object={input.object} />
      ) : (
        <AdvancedHeader entry={input.entry} />
      )}

      {/* Facts grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {input.kind === "buddy"
          ? <BuddyFacts object={input.object} altDeg={altDeg} azDeg={azDeg}
                        rise={rise} transit={transit} set={set} />
          : <AdvancedFacts entry={input.entry} altDeg={altDeg} azDeg={azDeg}
                           rise={rise} transit={transit} set={set} />}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSetTarget}
                disabled={setting || raDeg === null || decDeg === null}>
          {setting ? "Setting…" : "Set as target"}
        </Button>
        {input.kind === "buddy" && (
          <a href={buddyUrl(input.object.id)} target="_blank"
             rel="noopener noreferrer"
             className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            Full description <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {setOk === "ok"    && <span className="text-xs text-primary     ml-auto">Target set</span>}
        {setOk === "error" && <span className="text-xs text-destructive ml-auto">Failed</span>}
      </div>

      {/* Description (Buddy only) */}
      {input.kind === "buddy" && <BuddyDescription object={input.object} />}
    </div>
  );
}

// ----- sub-components -------------------------------------------------------

function BuddyHeader({ object }: { object: CatalogObject }) {
  return (
    <div className="flex items-baseline justify-between gap-2 leading-tight">
      <div className="min-w-0">
        <div className="text-base text-foreground truncate">{object.name}</div>
        <div className="text-xs text-muted-foreground font-mono">{object.designation}</div>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {object.subtype ?? object.type}
      </span>
    </div>
  );
}

function AdvancedHeader({ entry }: { entry: AdvancedEntry }) {
  if (entry.source === "manual") {
    return <div className="text-base text-foreground">Manual coordinates</div>;
  }
  const typeLabel =
    entry.source === "ngc"
      ? (NGC_TYPE_LABELS[entry.type] ?? entry.type)
      : (entry.spectral ?? "Star");
  return (
    <div className="flex items-baseline justify-between gap-2 leading-tight">
      <div className="min-w-0">
        <div className="text-base text-foreground truncate">{entry.id}</div>
        <div className="text-xs text-muted-foreground font-mono truncate">
          {entry.aliases.slice(0, 4).join(" · ")}
        </div>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{typeLabel}</span>
    </div>
  );
}

function BuddyFacts({
  object, altDeg, azDeg, rise, transit, set,
}: {
  object: CatalogObject; altDeg: number | null; azDeg: number | null;
  rise: Date | null; transit: Date | null; set: Date | null;
}) {
  return (
    <>
      <Fact label="RA" value={object.rightAscension} mono />
      <Fact label="Dec" value={object.declination} mono />
      <Fact label="Mag" value={typeof object.magnitude === "number" ? object.magnitude.toFixed(1) : "—"} />
      <Fact label="Constellation" value={object.constellation} />
      <Fact label="Alt" value={altDeg !== null ? `${Math.round(altDeg)}°` : "—"} />
      <Fact label="Az"  value={azDeg !== null ? azimuthCompass(azDeg) : "—"} />
      <Fact label="Rises"   value={formatTimeLocal(rise)} />
      <Fact label="Transit" value={formatTimeLocal(transit)} />
      <Fact label="Sets"    value={formatTimeLocal(set)} />
      <Fact label="Equipment" value={equipmentLabel(object.minEquipment)} />
      <Fact label="LP" value={object.lpTolerance} />
      <Fact label="Reward" value={object.visualReward} />
    </>
  );
}

function AdvancedFacts({
  entry, altDeg, azDeg, rise, transit, set,
}: {
  entry: AdvancedEntry; altDeg: number | null; azDeg: number | null;
  rise: Date | null; transit: Date | null; set: Date | null;
}) {
  const raStr = formatRaDeg(entry.ra_deg);
  const decStr = formatDecDeg(entry.dec_deg);
  const mag = entry.source === "manual" ? null : entry.mag;
  const con = entry.source === "manual" ? null : entry.constellation;
  return (
    <>
      <Fact label="RA"  value={raStr} mono />
      <Fact label="Dec" value={decStr} mono />
      {mag !== null && <Fact label="Mag" value={mag.toFixed(2)} />}
      {con && <Fact label="Constellation" value={con} />}
      <Fact label="Alt" value={altDeg !== null ? `${Math.round(altDeg)}°` : "—"} />
      <Fact label="Az"  value={azDeg !== null ? azimuthCompass(azDeg) : "—"} />
      <Fact label="Rises"   value={formatTimeLocal(rise)} />
      <Fact label="Transit" value={formatTimeLocal(transit)} />
      <Fact label="Sets"    value={formatTimeLocal(set)} />
    </>
  );
}

function BuddyDescription({ object }: { object: CatalogObject }) {
  const paragraphs = object.description
    ? object.description.split(/\n\n+/).filter((p) => p.trim().length > 0)
    : [];
  if (paragraphs.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-xs text-muted-foreground leading-relaxed">{para}</p>
      ))}
    </div>
  );
}

function formatRaDeg(deg: number): string {
  const h = deg / 15;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const ss = ((h - hh - mm / 60) * 3600).toFixed(1);
  return `${hh}h ${mm.toString().padStart(2, "0")}m ${ss}s`;
}

function formatDecDeg(deg: number): string {
  const sign = deg < 0 ? "-" : "+";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d - m / 60) * 3600).toFixed(0);
  return `${sign}${d}° ${m.toString().padStart(2, "0")}' ${s}"`;
}
```

Remove the now-unused inline JSX you replaced. The helper `Fact`,
`formatTimeLocal`, `buddyUrl`, `equipmentLabel` stay as they are.

- [ ] **Step 7: Update the one call site to pass the new prop shape**

In `web/src/components/catalog/WhatToSee.tsx`, find:

```tsx
<CatalogDetail
  object={selected}
  location={location}
  evalAt={evalAt}
  onTargetSet={onSwitchToNavigation}
/>
```

and replace with:

```tsx
<CatalogDetail
  input={selected ? { kind: "buddy", object: selected } : null}
  location={location}
  evalAt={evalAt}
  onTargetSet={onSwitchToNavigation}
/>
```

- [ ] **Step 8: Type-check + run existing tests**

```bash
cd web && npx tsc --noEmit && npx vitest run
```

Expected: type-check clean; Wizard tests still pass. No new tests yet.

- [ ] **Step 9: Smoke test the Buddy tab manually**

Make sure the engine and Vite are running (background shells from earlier in this session). Open `http://localhost:5173/static/`, switch to **What to see**, click any catalog object. Verify: same fields visible as before, "Set as target" still works.

- [ ] **Step 10: Commit**

```bash
git add web/src/components/catalog/CatalogDetail.tsx \
        web/src/components/catalog/WhatToSee.tsx
git commit -m "refactor(catalog): CatalogDetail accepts Buddy or Advanced entry"
```

---

### Task 8: Extract `BuddyTab.tsx` from `WhatToSee.tsx`

**Files:**
- Create: `web/src/components/catalog/buddy/BuddyTab.tsx`
- Modify: `web/src/components/catalog/WhatToSee.tsx` (becomes a shell)

Goal: zero behaviour change. The Buddy tab's current left-island body
(filters, applied-filters chips, time control, table) moves into a
dedicated component. `WhatToSee` keeps the right island, the
location/time state, and the Buddy selection state.

- [ ] **Step 1: Create the directory**

```bash
mkdir -p web/src/components/catalog/buddy
```

- [ ] **Step 2: Create `BuddyTab.tsx`**

`web/src/components/catalog/buddy/BuddyTab.tsx`:

```tsx
import { Card } from "@/components/ui/card";
import type { CatalogObject } from "@/lib/catalogTypes";
import {
  CatalogFilters, SelectedFiltersLine, useCatalogFilters,
} from "../CatalogFilters";
import { CatalogTable } from "../CatalogTable";
import { TimeControl } from "../TimeControl";

interface Props {
  objects: CatalogObject[];
  location: { latitude: number; longitude: number } | null;
  evalAt: Date;
  appliedOffsetMin: number;
  setAppliedOffsetMin: (m: number) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

export function BuddyTab({
  objects, location, evalAt,
  appliedOffsetMin, setAppliedOffsetMin,
  selectedId, setSelectedId,
}: Props) {
  const [filters, setFilters] = useCatalogFilters();

  return (
    <Card className="lg:col-span-2 flex flex-col gap-2 px-3 py-3 min-h-0 max-h-[70vh] lg:max-h-none">
      <CatalogFilters value={filters} onChange={setFilters} />
      <SelectedFiltersLine value={filters} />

      <div className="border-t border-border/60 -mx-3" />

      <div className="flex flex-col gap-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Observation Time
        </div>
        <TimeControl
          appliedOffsetMin={appliedOffsetMin}
          onApply={setAppliedOffsetMin}
        />
      </div>

      <div className="border-t border-border/60 -mx-3" />

      <div className="flex-1 min-h-0 overflow-y-auto pushnav-scrollbar -mx-3 px-3">
        {location ? (
          <CatalogTable
            objects={objects}
            filters={filters}
            location={location}
            evalAt={evalAt}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ) : (
          <div className="text-sm text-muted-foreground p-2">
            Set your observing location on the right to see visible objects.
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Slim down `WhatToSee.tsx` to a shell that renders `BuddyTab`**

Replace `web/src/components/catalog/WhatToSee.tsx` with:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import objectsData from "@/data/objects.json";
import type { CatalogObject } from "@/lib/catalogTypes";
import type { EnginePayload } from "@/lib/types";
import { CatalogDetail } from "./CatalogDetail";
import { LocationPanel } from "./LocationPanel";
import { BuddyTab } from "./buddy/BuddyTab";

const objects = objectsData as CatalogObject[];
const SELECTED_KEY = "pushnav.catalog.selected";

interface Props {
  state: EnginePayload;
  onSwitchToNavigation: () => void;
}

export function WhatToSee({ state, onSwitchToNavigation }: Props) {
  const [appliedOffsetMin, setAppliedOffsetMin] = useState(0);
  const [selectedId, setSelectedIdState] = useState<string | null>(() => {
    const raw = localStorage.getItem(SELECTED_KEY);
    return raw && objects.some((o) => o.id === raw) ? raw : null;
  });
  const setSelectedId = (id: string | null) => {
    setSelectedIdState(id);
    if (id === null) localStorage.removeItem(SELECTED_KEY);
    else localStorage.setItem(SELECTED_KEY, id);
  };

  const [tickNow, setTickNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTickNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const evalAt = useMemo(
    () => new Date(tickNow + appliedOffsetMin * 60_000),
    [tickNow, appliedOffsetMin],
  );

  const location = useMemo(() => {
    const loc = state.location;
    if (!loc || loc.latitude === null || loc.longitude === null) return null;
    return { latitude: loc.latitude, longitude: loc.longitude };
  }, [state.location]);

  const selected = useMemo(
    () => objects.find((o) => o.id === selectedId) ?? null,
    [selectedId],
  );

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-3 lg:grid-rows-1 gap-3 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <BuddyTab
        objects={objects}
        location={location}
        evalAt={evalAt}
        appliedOffsetMin={appliedOffsetMin}
        setAppliedOffsetMin={setAppliedOffsetMin}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
      />

      <Card className="lg:col-span-1 lg:min-h-0 lg:overflow-y-auto pushnav-scrollbar flex flex-col gap-3 px-4 py-3 text-sm">
        <LocationPanel state={state} />
        <div className="border-t border-border/60 -mx-4" />
        <CatalogDetail
          input={selected ? { kind: "buddy", object: selected } : null}
          location={location}
          evalAt={evalAt}
          onTargetSet={onSwitchToNavigation}
        />
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Type-check + smoke test**

```bash
cd web && npx tsc --noEmit && npx vitest run
```

Manual: open the browser, switch to "What to see", confirm the Buddy
tab behaves exactly as before (filters work, time control works,
selection persists, "Set as target" works).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/catalog/buddy/BuddyTab.tsx \
        web/src/components/catalog/WhatToSee.tsx
git commit -m "refactor(catalog): extract BuddyTab from WhatToSee (no behaviour change)"
```

---

### Task 9: Sub-tab state + switcher

**Files:**
- Modify: `web/src/components/catalog/WhatToSee.tsx`

- [ ] **Step 1: Add subtab state to `WhatToSee`**

Above the `return` of `WhatToSee`, add:

```tsx
  const SUBTAB_KEY = "pushnav.catalog.subtab";
  const [subtab, setSubtabState] = useState<"buddy" | "advanced">(() => {
    return localStorage.getItem(SUBTAB_KEY) === "advanced" ? "advanced" : "buddy";
  });
  const setSubtab = (v: "buddy" | "advanced") => {
    setSubtabState(v);
    localStorage.setItem(SUBTAB_KEY, v);
  };
```

- [ ] **Step 2: Inline-render a small tab switcher**

Insert this just before the grid wrapper `<div>` in the JSX:

```tsx
      <div className="flex items-center gap-1 mb-2 self-start rounded-lg bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setSubtab("buddy")}
          className={
            "px-3 py-1 rounded-md text-xs " +
            (subtab === "buddy"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          Stargazing Buddy
        </button>
        <button
          type="button"
          onClick={() => setSubtab("advanced")}
          className={
            "px-3 py-1 rounded-md text-xs " +
            (subtab === "advanced"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          Advanced
        </button>
      </div>
```

Wrap the existing grid in a flex column so the switcher sits above:

```tsx
  return (
    <div className="flex flex-col gap-2 lg:h-full lg:min-h-0">
      <div className="flex items-center gap-1 ...">...</div>
      <div className="flex flex-col lg:grid lg:grid-cols-3 ...">
        {subtab === "buddy" ? (
          <BuddyTab ... />
        ) : (
          <div className="lg:col-span-2 text-sm text-muted-foreground p-4">
            (advanced tab — placeholder until Task 11)
          </div>
        )}
        <Card className="lg:col-span-1 ...">
          ...
        </Card>
      </div>
    </div>
  );
```

- [ ] **Step 3: Type-check and smoke test**

```bash
cd web && npx tsc --noEmit
```

Manual: in the browser, confirm both pill buttons appear above the
catalog, click each, the selected pill style updates, and the
selection persists across reloads. Buddy tab still works; clicking
**Advanced** shows the placeholder.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/catalog/WhatToSee.tsx
git commit -m "feat(catalog): sub-tab state + switcher in WhatToSee (advanced placeholder)"
```

---

### Task 10: `AdvancedTab` skeleton — search input + results list

**Files:**
- Create: `web/src/components/catalog/advanced/AdvancedTab.tsx`
- Create: `web/src/components/catalog/advanced/SearchInput.tsx`
- Create: `web/src/components/catalog/advanced/ResultsList.tsx`
- Create: `web/src/components/catalog/advanced/AdvancedTab.test.tsx`
- Modify: `web/src/components/catalog/WhatToSee.tsx`

- [ ] **Step 1: Create `SearchInput.tsx`**

```tsx
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder }: Props) {
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search NGC / IC / Messier / star name…"}
        className="pr-8"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1 -translate-y-1/2"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
```

(If `@/components/ui/input` doesn't exist yet, check `web/src/components/ui/` — shadcn ships an `Input` primitive; add it via `npx shadcn add input` from the web/ directory, or copy from another shadcn install.)

- [ ] **Step 2: Create `ResultsList.tsx`**

```tsx
import { cn } from "@/lib/utils";
import type { NgcEntry, StarEntry } from "@/lib/catalogTypes";

type SearchableEntry = NgcEntry | StarEntry;

interface Props {
  entries: SearchableEntry[];
  selectedId: string | null;
  onSelect: (id: string, source: "ngc" | "star") => void;
}

export function ResultsList({ entries, selectedId, onSelect }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-2">No matches.</div>
    );
  }
  return (
    <ul className="flex flex-col">
      {entries.map((e) => (
        <li key={`${e.source}:${e.id}`}>
          <button
            type="button"
            onClick={() => onSelect(e.id, e.source)}
            className={cn(
              "w-full text-left px-2 py-1 text-xs hover:bg-muted/50",
              selectedId === e.id && "bg-muted text-foreground",
            )}
          >
            <span className="mr-2 inline-block min-w-[2.5rem] text-[10px] uppercase tracking-wider text-muted-foreground">
              {e.source === "ngc" ? "DSO" : "Star"}
            </span>
            <span className="font-mono">{e.id}</span>
            {e.mag !== null && (
              <span className="ml-2 text-muted-foreground">mag {e.mag.toFixed(2)}</span>
            )}
            {e.constellation && (
              <span className="ml-2 text-muted-foreground">{e.constellation}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Create `AdvancedTab.tsx` (without manual entry yet)**

```tsx
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { advancedSearch } from "@/lib/advancedSearch";
import type {
  AdvancedEntry, NgcEntry, StarEntry,
} from "@/lib/catalogTypes";
import ngcData from "@/data/openngc.json";
import starData from "@/data/hyg-bright.json";
import { SearchInput } from "./SearchInput";
import { ResultsList } from "./ResultsList";

const ngcList: NgcEntry[] = (ngcData as Omit<NgcEntry, "source">[])
  .map((e) => ({ ...e, source: "ngc" as const }));
const starList: StarEntry[] = (starData as Omit<StarEntry, "source">[])
  .map((e) => ({ ...e, source: "star" as const }));
const allEntries: (NgcEntry | StarEntry)[] = [...ngcList, ...starList];

interface Props {
  selected: AdvancedEntry | null;
  onSelect: (entry: AdvancedEntry | null) => void;
}

export function AdvancedTab({ selected, onSelect }: Props) {
  const [query, setQueryRaw] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 100);
    return () => clearTimeout(id);
  }, [query]);

  const results = useMemo(
    () => advancedSearch(debounced, allEntries) as (NgcEntry | StarEntry)[],
    [debounced],
  );

  const selectedId =
    selected && (selected.source === "ngc" || selected.source === "star")
      ? selected.id
      : null;

  function onPick(id: string, source: "ngc" | "star") {
    const found = allEntries.find((e) => e.source === source && e.id === id);
    onSelect(found ?? null);
  }

  return (
    <Card className="lg:col-span-2 flex flex-col gap-2 px-3 py-3 min-h-0 max-h-[70vh] lg:max-h-none">
      <SearchInput value={query} onChange={setQueryRaw} />
      <div className="border-t border-border/60 -mx-3" />
      <div className="flex-1 min-h-0 overflow-y-auto pushnav-scrollbar -mx-3 px-3">
        {debounced.trim() === "" ? (
          <div className="text-sm text-muted-foreground p-2">
            Type to search ~{ngcList.length + starList.length} objects.
          </div>
        ) : (
          <ResultsList entries={results} selectedId={selectedId} onSelect={onPick} />
        )}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1 px-1 leading-tight">
        Star data:{" "}
        <a href="https://www.astronexus.com/hyg" target="_blank"
           rel="noopener noreferrer" className="underline">HYG database</a>.
        Deep-sky data:{" "}
        <a href="https://github.com/mattiaverga/OpenNGC" target="_blank"
           rel="noopener noreferrer" className="underline">OpenNGC</a>. CC-BY-SA.
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Wire `AdvancedTab` into `WhatToSee`**

Replace the placeholder in `WhatToSee.tsx` with a real `AdvancedTab`
render. Add advanced-selection state alongside Buddy selection:

```tsx
const ADV_KEY = "pushnav.catalog.advanced.selected";
function readAdvancedSelection(): AdvancedEntry | null {
  try {
    const raw = localStorage.getItem(ADV_KEY);
    return raw ? (JSON.parse(raw) as AdvancedEntry) : null;
  } catch {
    return null;
  }
}
function writeAdvancedSelection(e: AdvancedEntry | null) {
  if (e === null) localStorage.removeItem(ADV_KEY);
  else localStorage.setItem(ADV_KEY, JSON.stringify(e));
}
```

Inside `WhatToSee`:

```tsx
  const [advancedSelected, setAdvancedSelectedState] =
    useState<AdvancedEntry | null>(() => readAdvancedSelection());
  const setAdvancedSelected = (e: AdvancedEntry | null) => {
    setAdvancedSelectedState(e);
    writeAdvancedSelection(e);
  };
```

Replace the placeholder branch:

```tsx
{subtab === "buddy" ? (
  <BuddyTab ... />
) : (
  <AdvancedTab
    selected={advancedSelected}
    onSelect={setAdvancedSelected}
  />
)}
```

And update the right-island `CatalogDetail` to pass the active tab's selection:

```tsx
<CatalogDetail
  input={
    subtab === "buddy"
      ? (selected ? { kind: "buddy", object: selected } : null)
      : (advancedSelected ? { kind: "advanced", entry: advancedSelected } : null)
  }
  location={location}
  evalAt={evalAt}
  onTargetSet={onSwitchToNavigation}
/>
```

Add the import at the top: `import { AdvancedTab } from "./advanced/AdvancedTab";` and `import type { AdvancedEntry } from "@/lib/catalogTypes";`.

- [ ] **Step 5: Write component test**

`web/src/components/catalog/advanced/AdvancedTab.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AdvancedTab } from "./AdvancedTab";

// AdvancedTab imports openngc.json + hyg-bright.json at module load, so
// these need real files. The build_catalogs step has populated them.

describe("AdvancedTab", () => {
  it("renders the empty-state hint with no query", () => {
    render(<AdvancedTab selected={null} onSelect={() => {}} />);
    expect(screen.getByText(/Type to search/i)).toBeInTheDocument();
  });

  it("filters and selects an NGC result", async () => {
    const onSelect = vi.fn();
    render(<AdvancedTab selected={null} onSelect={onSelect} />);
    const input = screen.getByPlaceholderText(/Search NGC/i);
    fireEvent.change(input, { target: { value: "M31" } });
    // Debounced 100 ms — give vitest a tick.
    await new Promise((r) => setTimeout(r, 200));
    const row = screen.getByText("NGC 224");
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ source: "ngc", id: "NGC 224" }),
    );
  });
});
```

- [ ] **Step 6: Type-check + run tests**

```bash
cd web && npx tsc --noEmit && npx vitest run
```

Expected: type-check passes; new AdvancedTab tests pass.

- [ ] **Step 7: Smoke-test in the browser**

Refresh `http://localhost:5173/static/`. On the **Advanced** sub-tab, type "M31" — the row for NGC 224 should appear and clicking it should populate the right panel with id, type, RA/Dec, mag, constellation, alt/az + rise/transit/set. "Set as target" should call `/api/goto/set` (engine log will show the request).

- [ ] **Step 8: Commit**

```bash
git add web/src/components/catalog/advanced/ \
        web/src/components/catalog/WhatToSee.tsx
git commit -m "feat(catalog): AdvancedTab — search input + results + selection"
```

---

### Task 11: `ManualEntry` panel

**Files:**
- Create: `web/src/components/catalog/advanced/ManualEntry.tsx`
- Modify: `web/src/components/catalog/advanced/AdvancedTab.tsx`

- [ ] **Step 1: Create `ManualEntry.tsx`**

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseRaInput, parseDecInput } from "@/lib/raDecParse";
import type { ManualEntry as ManualEntryT } from "@/lib/catalogTypes";

interface Props {
  current: ManualEntryT | null;
  onSubmit: (entry: ManualEntryT) => void;
  onClear: () => void;
}

export function ManualEntry({ current, onSubmit, onClear }: Props) {
  const [ra, setRa] = useState(
    current ? String(current.ra_deg) : "",
  );
  const [dec, setDec] = useState(
    current ? String(current.dec_deg) : "",
  );
  const [error, setError] = useState<string | null>(null);

  function apply() {
    setError(null);
    const raDeg  = parseRaInput(ra);
    const decDeg = parseDecInput(dec);
    if (raDeg === null) {
      setError("RA: enter degrees, hours+'h', or H M S.");
      return;
    }
    if (decDeg === null) {
      setError("Dec: enter degrees or D M S, with sign.");
      return;
    }
    onSubmit({ source: "manual", ra_deg: raDeg, dec_deg: decDeg });
  }

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Manual coordinates (J2000)
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-1 items-center">
        <span className="text-muted-foreground">RA</span>
        <Input value={ra} onChange={(e) => setRa(e.target.value)}
               placeholder="5h35m17.3s or 83.633" className="h-7 text-xs" />
        <span className="text-muted-foreground">Dec</span>
        <Input value={dec} onChange={(e) => setDec(e.target.value)}
               placeholder="-5°23'28&quot; or -5.391" className="h-7 text-xs" />
      </div>
      {error && <p className="text-destructive">{error}</p>}
      <div className="flex gap-2 mt-1">
        <Button size="sm" onClick={apply}>Use these coordinates</Button>
        <Button size="sm" variant="ghost"
                onClick={() => { setRa(""); setDec(""); setError(null); onClear(); }}>
          Clear
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Slot `ManualEntry` into `AdvancedTab`**

In `AdvancedTab.tsx`, import `ManualEntry`:

```tsx
import { ManualEntry } from "./ManualEntry";
```

Below the `SearchInput`, above the results divider, render:

```tsx
<details className="text-xs">
  <summary className="cursor-pointer text-muted-foreground hover:text-foreground py-1">
    Manual RA/Dec entry
  </summary>
  <div className="mt-2">
    <ManualEntry
      current={selected && selected.source === "manual" ? selected : null}
      onSubmit={(m) => onSelect(m)}
      onClear={() => {
        if (selected && selected.source === "manual") onSelect(null);
      }}
    />
  </div>
</details>
```

- [ ] **Step 3: Type-check + smoke-test**

```bash
cd web && npx tsc --noEmit
```

Manual:
- Open the Advanced sub-tab. Expand "Manual RA/Dec entry".
- Try `5h35m17.3s` / `-5°23'28"` (M42). Click "Use these coordinates".
  - Right panel switches to "Manual coordinates" + the same Alt/Az and rise/set you'd expect for Orion.
  - "Set as target" works.
- Click **Clear** — RA/Dec inputs reset and the right panel reverts to "Select an object on the left to see details."

- [ ] **Step 4: Commit**

```bash
git add web/src/components/catalog/advanced/ManualEntry.tsx \
        web/src/components/catalog/advanced/AdvancedTab.tsx
git commit -m "feat(catalog): ManualEntry — RA/Dec input panel in Advanced tab"
```

---

### Task 12: Wire `build_catalogs.py` into the three `run_dev*` scripts

The script must run only when CSVs are newer than their JSON output,
so the common dev launch stays fast.

**Files:**
- Modify: `scripts/run_dev.sh`
- Modify: `scripts/run_dev_linux.sh`
- Modify: `scripts/run_dev_windows.bat`

- [ ] **Step 1: Add a `--needs-rebuild` flag to `scripts/build_catalogs.py`**

Append to `scripts/build_catalogs.py`:

```python
def _needs_rebuild() -> bool:
    """True if either output JSON is missing or older than its source CSV."""
    pairs = [(OPENNGC_CSV, OPENNGC_OUT), (HYG_CSV, HYG_OUT)]
    for src, dst in pairs:
        if not dst.exists():
            return True
        if src.exists() and src.stat().st_mtime > dst.stat().st_mtime:
            return True
    return False
```

Update `main()`:

```python
def main() -> None:
    import sys
    if "--needs-rebuild" in sys.argv:
        sys.exit(0 if _needs_rebuild() else 1)
    ngc = trim_openngc(OPENNGC_CSV)
    _write_json(OPENNGC_OUT, ngc)
    print(f"openngc.json: {len(ngc):>6} entries → {OPENNGC_OUT}")
    hyg = trim_hyg(HYG_CSV)
    _write_json(HYG_OUT, hyg)
    print(f"hyg-bright.json: {len(hyg):>4} entries → {HYG_OUT}")
```

(Conventional exit-code semantic: 0 = needs rebuild, 1 = up to date. The shell scripts use that.)

- [ ] **Step 2: Add invocation to `scripts/run_dev.sh`**

After the `scripts/build_camera_mac.sh` line, before the Vite/Python launch:

```bash
if uv run python scripts/build_catalogs.py --needs-rebuild; then
    echo "==> Rebuilding catalog JSONs"
    uv run python scripts/build_catalogs.py
fi
```

- [ ] **Step 3: Add invocation to `scripts/run_dev_linux.sh`**

After the `uv sync` line, before the Vite/Python launch:

```bash
if uv run python scripts/build_catalogs.py --needs-rebuild; then
    echo "==> Rebuilding catalog JSONs"
    uv run python scripts/build_catalogs.py
fi
```

- [ ] **Step 4: Add invocation to `scripts/run_dev_windows.bat`**

After the `uv sync` line, before the Vite/Python launch:

```bat
uv run python scripts/build_catalogs.py --needs-rebuild
if not errorlevel 1 (
    echo ==^> Rebuilding catalog JSONs
    uv run python scripts/build_catalogs.py || exit /b 1
)
```

Note: Windows `if not errorlevel 1` means "exit code was less than 1", i.e. 0 — which is "needs rebuild".

- [ ] **Step 5: Smoke-test the gating**

```bash
# Catalogs are up to date — should print nothing
scripts/run_dev.sh        # CTRL-C right after the engine logs come up
# Now touch a source CSV and re-run — should rebuild
touch data/catalogs/openngc/NGC.csv
scripts/run_dev.sh        # expect "==> Rebuilding catalog JSONs"
```

- [ ] **Step 6: Commit**

```bash
git add scripts/build_catalogs.py scripts/run_dev*.sh scripts/run_dev_windows.bat
git commit -m "build(catalog): rebuild trimmed JSONs from dev scripts when sources change"
```

---

### Task 13: README "Third-party data" section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append "Third-party data" section**

Add a section near the bottom of `README.md` (after any existing
license discussion, before any final acknowledgements):

```markdown
## Third-party data

The Advanced catalog search is backed by two vendored astronomical
databases. Each lives under `data/catalogs/<name>/` with its upstream
`LICENSE` and a `NOTICE` file recording the exact vendored version.

| Catalog | Upstream | License |
|---|---|---|
| OpenNGC | <https://github.com/mattiaverga/OpenNGC> | CC-BY-SA 4.0 |
| HYG v3  | <https://github.com/astronexus/HYG-Database> | CC-BY-SA (see `data/catalogs/hyg/LICENSE`) |

The build script `scripts/build_catalogs.py` trims these CSVs to the
JSON projections under `web/src/data/`; those derived files inherit
the CC-BY-SA licence.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(README): document vendored OpenNGC + HYG data and licenses"
```

---

### Task 14: End-to-end smoke checklist

This task has no code — it's a manual verification step the engineer
must perform before declaring the feature done.

- [ ] **Step 1: Background services still up**

```bash
lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | grep -E "8765|5173"
```

Expected: engine on :8765, Vite on :5173. If not, start them per the
session conventions (`uv run python -m evf.main --dev --no-window` and
`cd web && npm run dev` in two backgrounded shells).

- [ ] **Step 2: Subtab persistence**

Reload the browser. Switch to **Advanced**. Reload again. The
**Advanced** pill remains selected.

- [ ] **Step 3: Search → select → "Set as target"**

In Advanced, type `M31`. Click the **NGC 224** result. Confirm right
panel shows: id "NGC 224", aliases line ("M 31 · Andromeda Galaxy …"),
type "Galaxy", RA/Dec, mag 3.44, constellation "And", live alt/az and
rise/transit/set. Click **Set as target**. The engine log shows a
`POST /api/goto/set` and the navigation tab now has the GOTO target.

- [ ] **Step 4: Search → select → tab switch → return**

Switch to **Stargazing Buddy**, then back to **Advanced**. The same
NGC 224 row stays selected; the right panel re-renders identically.

- [ ] **Step 5: Manual entry**

Open the manual entry panel. Enter `5h35m17.3s` / `-5°23'28"` (M42).
Click **Use these coordinates**. Verify:
- Right panel header: "Manual coordinates".
- Visibility math runs (alt/az + rise/set) based on current observer
  location and time.
- "Set as target" works.
- "Clear" empties the inputs and the right panel.

- [ ] **Step 6: Star search**

Type `Vega`. Confirm the star result appears with mag 0.03, spectral
"A0V" in the header line, constellation "Lyr".

- [ ] **Step 7: Run the full test suite**

```bash
uv run pytest tests/ -q
cd web && npx vitest run
```

All green.

- [ ] **Step 8: One final commit if anything was tweaked during smoke-testing**

```bash
git status
git diff
# Commit any small follow-ups; otherwise nothing to do.
```

---

## Spec coverage

| Spec section | Implementing task |
|---|---|
| OpenNGC vendoring | Task 1 |
| HYG vendoring | Task 2 |
| Trim build script + tests | Task 3 |
| RA/Dec parser | Task 4 |
| Search algorithm | Task 5 |
| `AdvancedEntry` types | Task 6 |
| Variant-aware `CatalogDetail` | Task 7 |
| `BuddyTab` extraction | Task 8 |
| Sub-tab state + switcher | Task 9 |
| `AdvancedTab` search + results + selection | Task 10 |
| `ManualEntry` | Task 11 |
| Dev-script rebuild gating | Task 12 |
| Attribution footer (in tab) | Task 10 step 3 |
| README third-party section | Task 13 |
| Smoke test | Task 14 |
| Build scripts untouched | by omission — confirmed in File Structure |
