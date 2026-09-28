import { describe, expect, it } from "vitest";
import { invoiceNumberBase, nextInvoiceNumber } from "./invoice-number";

describe("invoiceNumberBase", () => {
  it("joins prefix and year", () => {
    expect(invoiceNumberBase("INV-", 2026)).toBe("INV-2026-");
    expect(invoiceNumberBase("", 2026)).toBe("2026-");
  });
});

describe("nextInvoiceNumber", () => {
  it("starts the year at 0001", () => {
    expect(nextInvoiceNumber("INV-", 2026, [])).toBe("INV-2026-0001");
  });

  it("continues after the highest existing number, in any order", () => {
    expect(nextInvoiceNumber("INV-", 2026, ["INV-2026-0001", "INV-2026-0002"])).toBe("INV-2026-0003");
    expect(nextInvoiceNumber("INV-", 2026, ["INV-2026-0010", "INV-2026-0002"])).toBe("INV-2026-0011");
  });

  it("ignores other years and prefixes", () => {
    expect(nextInvoiceNumber("INV-", 2026, ["INV-2025-0009", "ABC-2026-0005"])).toBe("INV-2026-0001");
  });

  it("ignores malformed sequence suffixes", () => {
    expect(
      nextInvoiceNumber("INV-", 2026, ["INV-2026-00x1", "INV-2026-", "INV-2026-0003-A", "INV-2026-12 "]),
    ).toBe("INV-2026-0001");
  });

  it("pads to four digits and keeps growing past 9999", () => {
    expect(nextInvoiceNumber("INV-", 2026, ["INV-2026-0099"])).toBe("INV-2026-0100");
    expect(nextInvoiceNumber("INV-", 2026, ["INV-2026-9999"])).toBe("INV-2026-10000");
  });

  it("supports an empty prefix", () => {
    expect(nextInvoiceNumber("", 2026, ["2026-0004"])).toBe("2026-0005");
  });
});
