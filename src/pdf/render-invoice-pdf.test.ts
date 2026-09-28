import { afterEach, describe, expect, it, vi } from "vitest";
import type { InvoiceItem, InvoiceWithItems } from "@/server/invoices";
import type { Settings } from "@/server/settings";
import { urlBreakPieces } from "./invoice-document";
import { invoicePdfFileName, renderInvoicePdf } from "./render-invoice-pdf";

// 1×1 PNG
const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const DRIVE_URL = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/view?usp=sharing";

function item(overrides: Partial<InvoiceItem> = {}): InvoiceItem {
  return {
    id: 1,
    invoiceId: 1,
    position: 0,
    title: "Backend API development",
    description: "",
    workUrl: "",
    quantity: 1,
    unitPriceCents: 150_000,
    ...overrides,
  };
}

function invoice(overrides: Partial<InvoiceWithItems> = {}): InvoiceWithItems {
  const items = overrides.items ?? [item()];
  return {
    id: 12,
    number: null,
    status: "draft",
    clientName: "Acme Corp",
    clientDetails: "",
    issueDate: "2026-09-28",
    dueDate: null,
    currency: "USD",
    summary: "",
    notes: "",
    postedAt: null,
    createdAt: new Date("2026-09-28T10:00:00Z"),
    updatedAt: new Date("2026-09-28T10:00:00Z"),
    totalCents: items.reduce((sum, line) => sum + Math.round(line.quantity * line.unitPriceCents), 0),
    ...overrides,
    items,
  };
}

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 1,
    fullName: "",
    jobTitle: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    paymentDetails: "",
    signatureImage: null,
    currency: "USD",
    invoicePrefix: "INV-",
    paymentTermsDays: 14,
    updatedAt: new Date("2026-09-28T10:00:00Z"),
    ...overrides,
  };
}

/** PDF object dictionaries are not compressed, so structure can be checked in the raw bytes. */
function pdfText(buffer: Buffer): string {
  return buffer.toString("latin1");
}

function pageCount(buffer: Buffer): number {
  return Number(/\/Count (\d+)/.exec(pdfText(buffer))?.[1] ?? 0);
}

describe("renderInvoicePdf", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders a fully filled posted invoice with signature and clickable work links", async () => {
    const pdf = await renderInvoicePdf(
      invoice({
        number: "INV-2026-0001",
        status: "posted",
        postedAt: new Date("2026-09-28T12:00:00Z"),
        clientDetails: "Attn: Finance\nRiyadh, Saudi Arabia",
        dueDate: "2026-10-12",
        summary: "- Built the API\n- Wrote the docs",
        notes: "Thank you for your business.",
        items: [
          item({ description: "REST API with auth", workUrl: DRIVE_URL }),
          item({ id: 2, position: 1, title: "Consultancy", quantity: 7.5, unitPriceCents: 12_000 }),
        ],
      }),
      settings({
        fullName: "Jordan Smith",
        jobTitle: "Software Engineer",
        email: "jordan@example.com",
        address: "Jeddah\nSaudi Arabia",
        paymentDetails: "IBAN: SA03 8000 0000 6080 1016 7519",
        signatureImage: PNG_DATA_URL,
      }),
    );

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pageCount(pdf)).toBe(1);
    expect(pdfText(pdf)).toContain(`/URI (${DRIVE_URL})`);
    expect(pdfText(pdf)).toContain("/Subtype /Image");
  });

  it("renders a bare draft without optional sections or signature", async () => {
    const pdf = await renderInvoicePdf(invoice(), settings());

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pageCount(pdf)).toBe(1);
    expect(pdfText(pdf)).not.toContain("/Subtype /Image");
    expect(pdfText(pdf)).not.toContain("/URI");
  });

  it("still renders when the stored signature cannot be decoded", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const pdf = await renderInvoicePdf(
      invoice(),
      settings({ signatureImage: "data:image/png;base64,bm90IGFuIGltYWdl" }),
    );

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdfText(pdf)).not.toContain("/Subtype /Image");
  });

  it("flows long invoices onto several pages", async () => {
    const items = Array.from({ length: 30 }, (_, index) =>
      item({ id: index + 1, position: index, description: "Implemented and tested.", workUrl: DRIVE_URL }),
    );
    const pdf = await renderInvoicePdf(invoice({ items }), settings());

    expect(pageCount(pdf)).toBeGreaterThan(1);
  });
});

describe("invoicePdfFileName", () => {
  it("uses the invoice number once posted", () => {
    expect(invoicePdfFileName({ id: 3, number: "INV-2026-0001" })).toBe("INV-2026-0001.pdf");
  });

  it("names drafts by id", () => {
    expect(invoicePdfFileName({ id: 12, number: null })).toBe("draft-12.pdf");
  });

  it("replaces characters that are unsafe in file names", () => {
    expect(invoicePdfFileName({ id: 3, number: "INV/2026 #0001" })).toBe("INV-2026-0001.pdf");
    expect(invoicePdfFileName({ id: 3, number: "///" })).toBe("invoice-3.pdf");
  });
});

describe("urlBreakPieces", () => {
  it("splits a URL into short pieces without losing characters", () => {
    const pieces = urlBreakPieces(DRIVE_URL);

    expect(pieces.join("")).toBe(DRIVE_URL);
    expect(pieces.every((piece) => piece.length <= 12)).toBe(true);
  });

  it("breaks after URL separators", () => {
    expect(urlBreakPieces("https://a.io/x?y=1")).toEqual(["https:/", "/", "a.", "io/", "x?", "y=", "1"]);
  });
});
