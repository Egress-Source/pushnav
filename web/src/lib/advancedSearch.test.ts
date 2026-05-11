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
