import { formatAmount, formatRate } from "./format.ts";

describe("formatAmount", () => {
  it("shows whole numbers below 1,000, rounded down", () => {
    expect(formatAmount(0)).toBe("0");
    expect(formatAmount(7.9)).toBe("7");
    expect(formatAmount(999.99)).toBe("999");
  });

  it("goes compact from 1,000", () => {
    expect(formatAmount(1000)).toBe("1K");
    expect(formatAmount(1234)).toBe("1.2K");
    expect(formatAmount(15_000)).toBe("15K");
    expect(formatAmount(3_450_000)).toBe("3.4M");
    expect(formatAmount(2e9)).toBe("2B");
  });

  it("never rounds up to a bigger number than the player has", () => {
    expect(formatAmount(1999)).toBe("1.9K");
    expect(formatAmount(999_999)).toBe("999.9K");
  });

  it("treats junk as zero", () => {
    expect(formatAmount(-5)).toBe("0");
    expect(formatAmount(Number.NaN)).toBe("0");
    expect(formatAmount(Number.POSITIVE_INFINITY)).toBe("0");
  });
});

describe("formatRate", () => {
  it("keeps one decimal for small rates", () => {
    expect(formatRate(0)).toBe("0");
    expect(formatRate(0.5)).toBe("0.5");
    expect(formatRate(12.34)).toBe("12.3");
  });

  it("goes compact for large rates", () => {
    expect(formatRate(250)).toBe("250");
    expect(formatRate(12_500)).toBe("12.5K");
  });
});
