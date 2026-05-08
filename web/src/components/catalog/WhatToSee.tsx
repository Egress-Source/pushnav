import { useEffect, useMemo, useState } from "react";
import objectsData from "@/data/objects.json";
import type { CatalogObject } from "@/lib/catalogTypes";
import type { EnginePayload } from "@/lib/types";
import { CatalogFilters, useCatalogFilters } from "./CatalogFilters";
import { CatalogTable } from "./CatalogTable";
import { CatalogDetail } from "./CatalogDetail";
import { TimeControl } from "./TimeControl";

const objects = objectsData as CatalogObject[];

interface Props {
  state: EnginePayload;
}

export function WhatToSee({ state }: Props) {
  const [filters, setFilters] = useCatalogFilters();
  const [appliedOffsetMin, setAppliedOffsetMin] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Tick once a minute so "Now" stays current.
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

  if (!location) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm">
        <h3 className="font-semibold mb-2">Set your observing location</h3>
        <p className="text-muted-foreground mb-3">
          The catalog computes which objects are above the horizon for you. We
          need your latitude and longitude to do that.
        </p>
        <p className="text-muted-foreground">
          Open <span className="text-foreground">Settings → Location</span> to
          enter your coordinates manually, or connect Stellarium and we'll pick
          up its location automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-3">
      {/* Left column: filters + time + table (spans 2 of 3 at lg+) */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CatalogFilters value={filters} onChange={setFilters} />
          <TimeControl
            appliedOffsetMin={appliedOffsetMin}
            onApply={setAppliedOffsetMin}
          />
        </div>
        <CatalogTable
          objects={objects}
          filters={filters}
          location={location}
          evalAt={evalAt}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Right column: detail panel */}
      <div className="lg:col-span-1">
        <CatalogDetail
          object={selected}
          location={location}
          evalAt={evalAt}
        />
      </div>
    </div>
  );
}
