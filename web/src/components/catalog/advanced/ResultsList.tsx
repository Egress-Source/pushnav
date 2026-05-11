import { cn } from "@/lib/utils";
import type { NgcEntry, StarEntry } from "@/lib/catalogTypes";

type SearchableEntry = NgcEntry | StarEntry;

interface Props {
  entries: SearchableEntry[];
  selectedId: string | null;
  onSelect: (id: string, source: "ngc" | "star") => void;
}

// "M 31" / "M 35" — a Messier alias, not "MWSC ..." or "MCG ...".
const MESSIER_RE = /^M\s+\d/;
// Anything that looks like a catalog ID: alpha prefix immediately
// followed by digits (PGC, NGC, IC, UGC, HIP, HD, HR, Gl, GJ, MWSC, MCG,
// 2MASS, ...), or a Greek/Bayer letter, or a Flamsteed number+constellation.
const DESIGNATION_RE = /^([A-Z][A-Za-z0-9]*\s*\d|[α-ω]\s+[A-Z]|\d+\s+[A-Z])/;

function isMessier(s: string): boolean { return MESSIER_RE.test(s); }
function isDesignation(s: string): boolean { return DESIGNATION_RE.test(s); }

function ngcDisplayParts(entry: NgcEntry): string[] {
  const messier = entry.aliases.find(isMessier);
  const commonName = entry.aliases.find(
    (a) => a !== messier && !isDesignation(a),
  );
  // Keep the id last so "Andromeda Galaxy · M 31 · NGC 224" reads naturally.
  return [commonName, messier, entry.id].filter(
    (s): s is string => !!s,
  );
}

function starDisplayParts(entry: StarEntry): string[] {
  // entry.id is already the best human label (proper, then Bayer, then
  // Flamsteed, then HIP/HD/HR/Gl). Tack on the next two designations,
  // skipping anything that just repeats the id.
  const others = entry.aliases.filter((a) => a !== entry.id).slice(0, 2);
  return [entry.id, ...others];
}

function displayParts(entry: SearchableEntry): string[] {
  return entry.source === "ngc"
    ? ngcDisplayParts(entry)
    : starDisplayParts(entry);
}

export function ResultsList({ entries, selectedId, onSelect }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-2">No matches.</div>
    );
  }
  return (
    <ul className="flex flex-col">
      {entries.map((e) => {
        const parts = displayParts(e);
        return (
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
              <span>
                {parts.map((p, i) => (
                  <span key={i}>
                    {i > 0 && (
                      <span className="text-muted-foreground/60 mx-1">·</span>
                    )}
                    <span className={cn(isDesignation(p) && "font-mono")}>{p}</span>
                  </span>
                ))}
              </span>
              {e.mag !== null && (
                <span className="ml-2 text-muted-foreground">mag {e.mag.toFixed(2)}</span>
              )}
              {e.constellation && (
                <span className="ml-2 text-muted-foreground">{e.constellation}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
