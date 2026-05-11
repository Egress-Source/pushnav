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
    .replace(/[d°m''s""]/gi, " ")
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
