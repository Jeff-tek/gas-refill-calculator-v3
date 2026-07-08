// lib/precision.ts
//
// PRECISION CORE — truncate at 2 decimals, no rounding.
// 3.088 -> 3.08, 3.099 -> 3.09. toPrecision(15) scrubs binary
// float noise first so a value stored as 3.0799999999 does not
// wrongly truncate to 3.07. All intermediate math stays in full
// precision; truncation happens only at the display boundary.

/** Truncate a number to exactly 2 decimals (toward zero), drift-safe. */
export function trunc2(num: number): number {
  if (!Number.isFinite(num)) return NaN;
  const sign = num < 0 ? -1 : 1;
  const scaled = Number((Math.abs(num) * 100).toPrecision(15));
  return (Math.trunc(scaled) / 100) * sign;
}

/** Format a number as a fixed 2-decimal string via truncation. */
export function fmt2(num: number): string {
  const t = trunc2(num);
  return Number.isFinite(t) ? t.toFixed(2) : "0.00";
}

/** Add thousands separators to the integer part of a "1234.56" string. */
export function group(str: string): string {
  const [i, d] = str.split(".");
  const neg = i.startsWith("-");
  const digits = neg ? i.slice(1) : i;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + grouped + (d !== undefined ? "." + d : "");
}

/** Format as naira with the ₦ symbol and 2-decimal truncation. */
export function naira(n: number): string {
  return "\u20A6" + group(fmt2(n));
}

/** Format as kg value with 2-decimal truncation. */
export function kg(n: number): string {
  return group(fmt2(n));
}

export interface Parsed {
  empty: boolean;
  value: number;
  nan: boolean;
}

/** Parse a raw input string, distinguishing empty from zero. */
export function parseField(raw: string | null | undefined): Parsed {
  const s = (raw ?? "").trim();
  if (s === "") return { empty: true, value: NaN, nan: false };
  const v = Number(s.replace(/,/g, ""));
  return { empty: false, value: v, nan: !Number.isFinite(v) };
}
