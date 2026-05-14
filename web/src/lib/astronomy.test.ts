import { describe, expect, it } from "vitest";

import {
  altAzFromRaDec,
  parseDec,
  parseRA,
  riseSetTransitUtc,
} from "./astronomy";

describe("parseRA", () => {
  it("parses h/m/s format", () => {
    expect(parseRA("05h 35m 17.3s")).toBeCloseTo(5.5881, 3);
  });
  it("parses colon format", () => {
    expect(parseRA("05:35:17.3")).toBeCloseTo(5.5881, 3);
  });
  it("returns null on garbage", () => {
    expect(parseRA("not a coordinate")).toBeNull();
  });
});

describe("parseDec", () => {
  it("parses positive d/m/s", () => {
    expect(parseDec("+27° 57' 34.83\"")).toBeCloseTo(27.9597, 3);
  });
  it("parses negative d/m/s", () => {
    expect(parseDec("-05° 23' 28\"")).toBeCloseTo(-5.3911, 3);
  });
});

describe("altAzFromRaDec", () => {
  // Polaris should sit near zenith=lat for an observer at high northern latitude.
  it("Polaris from northern Europe is near 50° altitude", () => {
    const result = altAzFromRaDec({
      raHours: 2.5303,           // Polaris J2000
      decDeg: 89.2641,
      latDeg: 50.0,
      lonDeg: 0.0,
      date: new Date("2026-05-08T22:00:00Z"),
    });
    expect(result.altDeg).toBeGreaterThan(48);
    expect(result.altDeg).toBeLessThan(52);
  });
});

describe("riseSetTransitUtc", () => {
  it("computes a transit and a rise for Vega at lat 13°", () => {
    const result = riseSetTransitUtc({
      raHours: 18.6156,           // Vega
      decDeg: 38.7837,
      latDeg: 13.0878,            // Chennai
      lonDeg: 80.2785,
      dateUtc: new Date("2026-05-08T00:00:00Z"),
    });
    expect(result.status).toBe("normal");
    expect(result.transit).toBeInstanceOf(Date);
    expect(result.rise).toBeInstanceOf(Date);
    expect(result.set).toBeInstanceOf(Date);
  });
  it("flags 'never_rises' for southern object at northern latitude", () => {
    const result = riseSetTransitUtc({
      raHours: 12.0,
      decDeg: -85.0,
      latDeg: 60.0,
      lonDeg: 0.0,
      dateUtc: new Date("2026-05-08T00:00:00Z"),
    });
    expect(result.status).toBe("never_rises");
    expect(result.rise).toBeNull();
  });
});
