import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import objectsData from "@/data/objects.json";
import type { CatalogObject } from "@/lib/catalogTypes";
import type { EnginePayload } from "@/lib/types";
import {
  CatalogFilters,
  SelectedFiltersLine,
  useCatalogFilters,
} from "./CatalogFilters";
import { CatalogTable } from "./CatalogTable";
import { CatalogDetail } from "./CatalogDetail";
import { LocationPanel } from "./LocationPanel";
import { TimeControl } from "./TimeControl";

const objects = objectsData as CatalogObject[];

interface Props {
  state: EnginePayload;
  onSwitchToNavigation: () => void;
}

const SELECTED_KEY = "pushnav.catalog.selected";

export function WhatToSee({ state, onSwitchToNavigation }: Props) {
  const [filters, setFilters] = useCatalogFilters();
  const [appliedOffsetMin, setAppliedOffsetMin] = useState(0);
  // Persist the catalog selection across tab switches and full page
  // reloads — matches the localStorage approach used for `view` and the
  // catalog filters. Survives WhatToSee unmount when the user flips to
  // the Navigation tab.
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
      {/* Left island: filters + selected chips + time + scrollable table.
          At narrow widths cap the Card at 70vh so the table-wrapper inside
          has a finite height to overflow against; at lg+ the grid row
          provides the height (max-h-none lets it stretch). */}
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

      {/* Right island: Location panel + horizontal divider + catalog detail. */}
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
