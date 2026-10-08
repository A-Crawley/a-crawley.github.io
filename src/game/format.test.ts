import { formatAmount, formatDuration, formatRate, NOTATIONS } from "./format.ts";
import type { Notation } from "./format.ts";

describe("formatAmount: every notation", () => {
  it.each(NOTATIONS)("shows whole numbers below 1,000 exactly, rounded down (%s)", (notation) => {
    expect(formatAmount(0, notation)).toBe("0");
    expect(formatAmount(0.9, notation)).toBe("0");
    expect(formatAmount(7.9, notation)).toBe("7");
    expect(formatAmount(999.99, notation)).toBe("999");
  });

  it.each(NOTATIONS)("treats junk as zero and infinity as a symbol (%s)", (notation) => {
    expect(formatAmount(-5, notation)).toBe("0");
    expect(formatAmount(Number.NaN, notation)).toBe("0");
    expect(formatAmount(Number.POSITIVE_INFINITY, notation)).toBe("∞");
    expect(formatAmount(Number.NEGATIVE_INFINITY, notation)).toBe("0");
  });

  it.each(NOTATIONS)("copes with the largest number there is (%s)", (notation) => {
    expect(formatAmount(Number.MAX_VALUE, notation)).toMatch(/^[0-9.]+(e308|e306|[a-z]{2})$/);
  });

  it("defaults to short", () => {
    expect(formatAmount(1500)).toBe(formatAmount(1500, "short"));
  });
});

describe("formatAmount: short", () => {
  const f = (value: number) => formatAmount(value, "short");

  it("goes compact from 1,000", () => {
    expect(f(1000)).toBe("1K");
    expect(f(1234)).toBe("1.2K");
    expect(f(15_000)).toBe("15K");
    expect(f(3_450_000)).toBe("3.4M");
    expect(f(2e9)).toBe("2B");
    expect(f(5e12)).toBe("5T");
  });

  it("never rounds up to a bigger number than the player has", () => {
    expect(f(1999)).toBe("1.9K");
    expect(f(999_999)).toBe("999.9K");
    expect(f(999_999_999)).toBe("999.9M");
  });

  it("changes tier exactly at each power of 1,000", () => {
    expect(f(999_999)).toBe("999.9K");
    expect(f(1e6)).toBe("1M");
    expect(f(999.9e6)).toBe("999.9M");
    expect(f(1e9)).toBe("1B");
    expect(f(1e12)).toBe("1T");
    expect(f(999.9e12)).toBe("999.9T");
  });

  it("continues with two-letter names after T", () => {
    expect(f(1e15)).toBe("1aa");
    expect(f(1.5e15)).toBe("1.5aa");
    expect(f(1e18)).toBe("1ab");
    expect(f(1e15 * 1000 ** 25)).toBe("1az");
    expect(f(1e15 * 1000 ** 26)).toBe("1ba");
  });

  it("is not thrown by decimals that floating point stores slightly low", () => {
    // 1.1, 1.15, 2.3, 4.35 and friends are not exact in binary; none may lose a tenth.
    for (let whole = 1; whole <= 999; whole++) {
      for (let tenth = 0; tenth <= 9; tenth++) {
        const value = Math.round((whole + tenth / 10) * 1000);
        const expected = `${whole}${tenth === 0 ? "" : "." + tenth}K`;
        expect(f(value), String(value)).toBe(expected);
      }
    }
  });
});

describe("formatAmount: scientific", () => {
  const f = (value: number) => formatAmount(value, "scientific");

  it("starts at 1,000 with two decimals", () => {
    expect(f(1000)).toBe("1.00e3");
    expect(f(1234)).toBe("1.23e3");
    expect(f(98_765)).toBe("9.87e4");
    expect(f(1.23e45)).toBe("1.23e45");
  });

  it("rounds down and never carries into the next exponent", () => {
    expect(f(9999)).toBe("9.99e3");
    expect(f(999_999)).toBe("9.99e5");
    expect(f(1e6)).toBe("1.00e6");
  });

  it("is exact at powers of ten", () => {
    for (let exponent = 3; exponent <= 300; exponent++) {
      expect(f(10 ** exponent), `1e${exponent}`).toBe(`1.00e${exponent}`);
    }
  });

  it("keeps decimals that floating point stores slightly low", () => {
    expect(f(1.15e20)).toBe("1.15e20");
    expect(f(4.35e7)).toBe("4.35e7");
  });
});

describe("formatAmount: engineering", () => {
  const f = (value: number) => formatAmount(value, "engineering");

  it("keeps the exponent a multiple of three", () => {
    expect(f(1000)).toBe("1.00e3");
    expect(f(12_345)).toBe("12.34e3");
    expect(f(123_456)).toBe("123.45e3");
    expect(f(1.5e6)).toBe("1.50e6");
    expect(f(4.2e10)).toBe("42.00e9");
    expect(f(7.77e44)).toBe("777.00e42");
  });

  it("changes exponent exactly at each power of 1,000", () => {
    expect(f(999_999)).toBe("999.99e3");
    expect(f(1e6)).toBe("1.00e6");
    expect(f(999.99e6)).toBe("999.99e6");
    expect(f(1e9)).toBe("1.00e9");
  });

  it("is exact at powers of ten", () => {
    for (let exponent = 3; exponent <= 300; exponent++) {
      const shifted = exponent % 3;
      const mantissa = (10 ** shifted).toFixed(2);
      expect(f(10 ** exponent), `1e${exponent}`).toBe(`${mantissa}e${exponent - shifted}`);
    }
  });
});

describe("formatRate", () => {
  it("shows slow rates with two decimals so they never read as zero", () => {
    expect(formatRate(0)).toBe("0");
    expect(formatRate(0.03)).toBe("0.03");
    expect(formatRate(0.25)).toBe("0.25");
    expect(formatRate(0.4)).toBe("0.4");
    expect(formatRate(0.5)).toBe("0.5");
  });

  it("shows the tiniest rates as less than a hundredth", () => {
    expect(formatRate(0.0099)).toBe("<0.01");
    expect(formatRate(1e-9)).toBe("<0.01");
    expect(formatRate(0.01)).toBe("0.01");
  });

  it("uses one decimal from 1 up to 100", () => {
    expect(formatRate(1)).toBe("1.0");
    expect(formatRate(12.34)).toBe("12.3");
    expect(formatRate(13)).toBe("13.0");
  });

  it("goes through the chosen notation for big rates", () => {
    const notations: Array<[Notation, string]> = [
      ["short", "12.5K"],
      ["scientific", "1.25e4"],
      ["engineering", "12.50e3"],
    ];
    for (const [notation, expected] of notations) {
      expect(formatRate(12_500, notation)).toBe(expected);
    }
    expect(formatRate(250)).toBe("250");
    expect(formatRate(250, "scientific")).toBe("250");
  });

  it("treats junk as zero and infinity as a symbol", () => {
    expect(formatRate(-1)).toBe("0");
    expect(formatRate(Number.NaN)).toBe("0");
    expect(formatRate(Number.POSITIVE_INFINITY)).toBe("∞");
  });
});

describe("formatDuration", () => {
  it("says less than a minute for short or odd values", () => {
    expect(formatDuration(0)).toBe("less than a minute");
    expect(formatDuration(59)).toBe("less than a minute");
    expect(formatDuration(Number.NaN)).toBe("less than a minute");
    expect(formatDuration(-10)).toBe("less than a minute");
  });

  it("uses minutes, hours and days with correct plurals", () => {
    expect(formatDuration(60)).toBe("1 minute");
    expect(formatDuration(45 * 60)).toBe("45 minutes");
    expect(formatDuration(3600)).toBe("1 hour");
    expect(formatDuration(2 * 3600 + 14 * 60)).toBe("2 hours 14 minutes");
    expect(formatDuration(8 * 3600)).toBe("8 hours");
    expect(formatDuration(24 * 3600)).toBe("1 day");
    expect(formatDuration(3 * 24 * 3600 + 4 * 3600 + 12 * 60)).toBe("3 days 4 hours");
  });
});
