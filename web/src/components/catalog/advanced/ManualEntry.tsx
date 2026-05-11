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
