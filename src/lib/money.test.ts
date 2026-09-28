import { describe, expect, it } from "vitest";
import {
  centsToInputValue,
  formatMoney,
  formatQuantity,
  lineAmountCents,
  parseMoneyToCents,
  parseQuantity,
  sumLineAmounts,
} from "./money";

/** Intl separates the currency code from the number with a non-breaking space. */
const normalizeSpaces = (value: string) => value.replace(/ /g, " ");

describe("parseMoneyToCents", () => {
  it.each([
    ["0", 0],
    ["12", 1200],
    ["0.01", 1],
    ["1250.5", 125050],
    ["1250.50", 125050],
    ["1,250.50", 125050],
    ["1,000,000.99", 100000099],
    ["  42.10  ", 4210],
  ])("parses %j as %i cents", (input, cents) => {
    expect(parseMoneyToCents(input)).toBe(cents);
  });

  it.each(["", " ", "abc", "-5", "+5", "1.234", "1.", ".5", "1e3", "12 34", "1.2.3"])(
    "rejects %j",
    (input) => {
      expect(parseMoneyToCents(input)).toBeNull();
    },
  );

  it("rejects amounts beyond the safe integer range", () => {
    expect(parseMoneyToCents("99999999999999999999")).toBeNull();
  });
});

describe("parseQuantity", () => {
  it.each([
    ["1", 1],
    ["7.5", 7.5],
    ["0.25", 0.25],
    ["1,000", 1000],
  ])("parses %j as %d", (input, quantity) => {
    expect(parseQuantity(input)).toBe(quantity);
  });

  it.each(["0", "0.00", "-1", "1.234", "", "abc"])("rejects %j", (input) => {
    expect(parseQuantity(input)).toBeNull();
  });
});

describe("centsToInputValue", () => {
  it("formats cents with two decimals and no grouping", () => {
    expect(centsToInputValue(125050)).toBe("1250.50");
    expect(centsToInputValue(5)).toBe("0.05");
    expect(centsToInputValue(0)).toBe("0.00");
  });

  it("round-trips through parseMoneyToCents", () => {
    for (const cents of [0, 1, 99, 100, 123456789]) {
      expect(parseMoneyToCents(centsToInputValue(cents))).toBe(cents);
    }
  });
});

describe("lineAmountCents", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineAmountCents(2, 999)).toBe(1998);
    expect(lineAmountCents(1.5, 100010)).toBe(150015);
  });

  it("rounds to whole cents, absorbing floating point error", () => {
    expect(lineAmountCents(1.15, 100)).toBe(115); // 114.99999999999999
    expect(lineAmountCents(1.5, 10001)).toBe(15002); // 15001.5 rounds half up
    expect(lineAmountCents(0.01, 50)).toBe(1); // 0.5 rounds half up
  });
});

describe("sumLineAmounts", () => {
  it("sums rounded line amounts", () => {
    expect(
      sumLineAmounts([
        { quantity: 1, unitPriceCents: 100 },
        { quantity: 2.5, unitPriceCents: 1000 },
        { quantity: 1.5, unitPriceCents: 10001 },
      ]),
    ).toBe(100 + 2500 + 15002);
  });

  it("is zero without items", () => {
    expect(sumLineAmounts([])).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formats with the ISO currency code", () => {
    expect(normalizeSpaces(formatMoney(125050, "USD"))).toBe("USD 1,250.50");
    expect(normalizeSpaces(formatMoney(0, "EUR"))).toBe("EUR 0.00");
    expect(normalizeSpaces(formatMoney(99, "SAR"))).toBe("SAR 0.99");
  });

  it("uses each currency's own number of decimals", () => {
    expect(normalizeSpaces(formatMoney(125050, "KWD"))).toBe("KWD 1,250.500");
    expect(normalizeSpaces(formatMoney(125000, "JPY"))).toBe("JPY 1,250");
  });

  it("uses a non-breaking space so the amount never wraps away from its code", () => {
    expect(formatMoney(100, "USD")).toBe("USD 1.00");
  });
});

describe("formatQuantity", () => {
  it("drops trailing zeros and groups thousands", () => {
    expect(formatQuantity(1)).toBe("1");
    expect(formatQuantity(1.5)).toBe("1.5");
    expect(formatQuantity(1.25)).toBe("1.25");
    expect(formatQuantity(1000)).toBe("1,000");
  });
});
