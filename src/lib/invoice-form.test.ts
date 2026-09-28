import { describe, expect, it } from "vitest";
import { emptyLineItem, invoiceToFormValues, newInvoiceFormValues, summaryLines } from "./invoice-form";
import { invoiceFormSchema, type InvoiceInput } from "./validation";

describe("emptyLineItem", () => {
  it("defaults the quantity to 1", () => {
    expect(emptyLineItem()).toEqual({ title: "", description: "", workUrl: "", quantity: "1", unitPrice: "" });
  });

  it("returns a fresh object each time", () => {
    expect(emptyLineItem()).not.toBe(emptyLineItem());
  });
});

describe("newInvoiceFormValues", () => {
  it("dates the invoice today, derives the due date from the payment terms and starts with one line", () => {
    expect(newInvoiceFormValues({ today: "2026-09-28", currency: "SAR", paymentTermsDays: 14 })).toEqual({
      clientName: "",
      clientDetails: "",
      issueDate: "2026-09-28",
      dueDate: "2026-10-12",
      currency: "SAR",
      summary: "",
      notes: "",
      items: [emptyLineItem()],
    });
  });

  it("leaves the due date empty when payment terms are 0 days", () => {
    expect(newInvoiceFormValues({ today: "2026-09-28", currency: "USD", paymentTermsDays: 0 }).dueDate).toBe("");
  });
});

describe("invoiceToFormValues", () => {
  const stored: InvoiceInput = {
    clientName: "Acme Corp",
    clientDetails: "1 Main St\nRiyadh",
    issueDate: "2026-09-28",
    dueDate: "2026-10-12",
    currency: "USD",
    summary: "Built the API",
    notes: "Thank you!",
    items: [
      { title: "API", description: "Endpoints", workUrl: "https://drive.google.com/x", quantity: 1.5, unitPriceCents: 100010 },
      { title: "Review", description: "", workUrl: "", quantity: 3, unitPriceCents: 5 },
    ],
  };

  it("converts stored numbers back to editor strings", () => {
    const values = invoiceToFormValues(stored);
    expect(values.items.map(({ quantity, unitPrice }) => ({ quantity, unitPrice }))).toEqual([
      { quantity: "1.5", unitPrice: "1000.10" },
      { quantity: "3", unitPrice: "0.05" },
    ]);
    expect(invoiceToFormValues({ ...stored, dueDate: null }).dueDate).toBe("");
  });

  it("round-trips through the invoice schema", () => {
    expect(invoiceFormSchema.parse(invoiceToFormValues(stored))).toEqual(stored);
    const withoutDueDate = { ...stored, dueDate: null };
    expect(invoiceFormSchema.parse(invoiceToFormValues(withoutDueDate))).toEqual(withoutDueDate);
  });
});

describe("summaryLines", () => {
  it("splits lines and strips typed bullets and blank lines", () => {
    expect(summaryLines("- First\r\n\r\n* Second\n•  Third\n   plain text  \n")).toEqual([
      "First",
      "Second",
      "Third",
      "plain text",
    ]);
  });

  it("only strips a bullet followed by a space", () => {
    expect(summaryLines("-5% discount applied\n--> next")).toEqual(["-5% discount applied", "--> next"]);
  });

  it("returns no lines for an empty summary", () => {
    expect(summaryLines("")).toEqual([]);
    expect(summaryLines(" \n \r\n")).toEqual([]);
  });
});
