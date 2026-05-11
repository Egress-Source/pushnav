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
