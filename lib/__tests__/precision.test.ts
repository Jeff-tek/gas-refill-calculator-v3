// lib/__tests__/precision.test.ts
import { trunc2, fmt2, group, naira, kg, parseField } from "../precision";

describe("trunc2", () => {
  it("truncates to 2 decimal places (no rounding)", () => {
    expect(trunc2(3.088)).toBe(3.08);
    expect(trunc2(3.099)).toBe(3.09);
    expect(trunc2(3.001)).toBe(3.00);
    expect(trunc2(3.999)).toBe(3.99);
  });

  it("handles negative numbers", () => {
    expect(trunc2(-3.088)).toBe(-3.08);
    expect(trunc2(-3.099)).toBe(-3.09);
  });

  it("handles whole numbers", () => {
    expect(trunc2(5)).toBe(5);
    expect(trunc2(0)).toBe(0);
  });

  it("handles NaN and Infinity", () => {
    expect(trunc2(NaN)).toBeNaN();
    expect(trunc2(Infinity)).toBeNaN();
    expect(trunc2(-Infinity)).toBeNaN();
  });

  it("handles binary float drift", () => {
    // 3.08 * 100 = 307.99999999999994 in binary
    expect(trunc2(3.08)).toBe(3.08);
    // 1.1 + 2.2 = 3.3000000000000003
    expect(trunc2(1.1 + 2.2)).toBe(3.30);
  });
});

describe("fmt2", () => {
  it("formats as fixed 2-decimal string", () => {
    expect(fmt2(3.08)).toBe("3.08");
    expect(fmt2(0)).toBe("0.00");
    expect(fmt2(5)).toBe("5.00");
    expect(fmt2(1234.567)).toBe("1234.56");
  });

  it("returns 0.00 for NaN", () => {
    expect(fmt2(NaN)).toBe("0.00");
  });
});

describe("group", () => {
  it("adds thousands separators", () => {
    expect(group("1234.56")).toBe("1,234.56");
    expect(group("1234567.89")).toBe("1,234,567.89");
    expect(group("0.00")).toBe("0.00");
  });

  it("handles negative numbers", () => {
    expect(group("-1234.56")).toBe("-1,234.56");
  });

  it("handles numbers without decimals", () => {
    expect(group("1234")).toBe("1,234");
  });
});

describe("naira", () => {
  it("formats with naira symbol and grouping", () => {
    expect(naira(1234.56)).toBe("\u20A61,234.56");
    expect(naira(0)).toBe("\u20A60.00");
  });
});

describe("kg", () => {
  it("formats with 2 decimal truncation", () => {
    expect(kg(55)).toBe("55.00");
    expect(kg(12.345)).toBe("12.34");
  });
});

describe("parseField", () => {
  it("parses valid number strings", () => {
    expect(parseField("123.45")).toEqual({ empty: false, value: 123.45, nan: false });
    expect(parseField("0")).toEqual({ empty: false, value: 0, nan: false });
  });

  it("returns empty for empty strings", () => {
    expect(parseField("")).toEqual({ empty: true, value: NaN, nan: false });
    expect(parseField(null)).toEqual({ empty: true, value: NaN, nan: false });
    expect(parseField(undefined)).toEqual({ empty: true, value: NaN, nan: false });
  });

  it("strips commas from input", () => {
    expect(parseField("1,234.56")).toEqual({ empty: false, value: 1234.56, nan: false });
  });

  it("detects NaN for non-numeric strings", () => {
    const result = parseField("abc");
    expect(result.empty).toBe(false);
    expect(result.nan).toBe(true);
    expect(result.value).toBeNaN();
  });
});
