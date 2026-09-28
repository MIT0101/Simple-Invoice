import { describe, expect, it } from "vitest";
import { parseId, routes } from "./routes";

describe("routes", () => {
  it("builds page paths", () => {
    expect(routes.invoice(3)).toBe("/invoices/3");
    expect(routes.editInvoice(3)).toBe("/invoices/3/edit");
  });

  it("builds PDF URLs with optional download and cache-busting version", () => {
    expect(routes.invoicePdf(5)).toBe("/api/invoices/5/pdf");
    expect(routes.invoicePdf(5, { download: false })).toBe("/api/invoices/5/pdf");
    expect(routes.invoicePdf(5, { download: true })).toBe("/api/invoices/5/pdf?download=1");
    expect(routes.invoicePdf(5, { version: 123 })).toBe("/api/invoices/5/pdf?v=123");
    expect(routes.invoicePdf(5, { download: true, version: "1-2" })).toBe(
      "/api/invoices/5/pdf?download=1&v=1-2",
    );
  });

  it("encodes the version", () => {
    expect(routes.invoicePdf(5, { version: "a b&c" })).toBe("/api/invoices/5/pdf?v=a+b%26c");
  });
});

describe("parseId", () => {
  it.each([
    ["1", 1],
    ["42", 42],
    ["007", 7],
  ])("parses %j", (value, id) => {
    expect(parseId(value)).toBe(id);
  });

  it.each(["0", "-1", "1.5", "abc", "", " 1", "1e3", "9007199254740993"])("rejects %j", (value) => {
    expect(parseId(value)).toBeNull();
  });
});
