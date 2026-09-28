import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  invoiceFormSchema,
  isHttpUrl,
  settingsFormSchema,
  toFieldErrors,
  type InvoiceFormValues,
  type InvoiceItemFormValues,
} from "./validation";

function lineItem(overrides: Partial<InvoiceItemFormValues> = {}): InvoiceItemFormValues {
  return {
    title: "API development",
    description: "REST endpoints",
    workUrl: "https://drive.google.com/file/d/abc/view",
    quantity: "2",
    unitPrice: "1,250.50",
    ...overrides,
  };
}

function invoiceValues(overrides: Partial<InvoiceFormValues> = {}): InvoiceFormValues {
  return {
    clientName: "Acme Corp",
    clientDetails: "1 Main St",
    issueDate: "2026-09-28",
    dueDate: "",
    currency: "USD",
    summary: "- Built the API",
    notes: "",
    items: [lineItem()],
    ...overrides,
  };
}

function invoiceErrors(values: unknown): Record<string, string> {
  const result = invoiceFormSchema.safeParse(values);
  if (result.success) throw new Error("Expected invoice validation to fail");
  return toFieldErrors(result.error);
}

describe("invoiceFormSchema", () => {
  it("trims text, upper-cases the currency and converts amounts to cents", () => {
    const parsed = invoiceFormSchema.parse(
      invoiceValues({
        clientName: "  Acme Corp  ",
        currency: "usd",
        items: [lineItem({ title: "  API development ", workUrl: " https://drive.google.com/file/d/abc/view " })],
      }),
    );
    expect(parsed).toEqual({
      clientName: "Acme Corp",
      clientDetails: "1 Main St",
      issueDate: "2026-09-28",
      dueDate: null,
      currency: "USD",
      summary: "- Built the API",
      notes: "",
      items: [
        {
          title: "API development",
          description: "REST endpoints",
          workUrl: "https://drive.google.com/file/d/abc/view",
          quantity: 2,
          unitPriceCents: 125050,
        },
      ],
    });
  });

  it("keeps a due date on or after the issue date", () => {
    expect(invoiceFormSchema.parse(invoiceValues({ dueDate: "2026-10-12" })).dueDate).toBe("2026-10-12");
    expect(invoiceFormSchema.parse(invoiceValues({ dueDate: "2026-09-28" })).dueDate).toBe("2026-09-28");
  });

  it("accepts line items without a work link, and http links", () => {
    const parsed = invoiceFormSchema.parse(
      invoiceValues({ items: [lineItem({ workUrl: "" }), lineItem({ workUrl: "http://example.com/unit.pdf" })] }),
    );
    expect(parsed.items.map((item) => item.workUrl)).toEqual(["", "http://example.com/unit.pdf"]);
  });

  it("requires a client name", () => {
    expect(invoiceErrors(invoiceValues({ clientName: "   " }))).toEqual({
      clientName: "Client name is required",
    });
  });

  it("requires between 1 and 100 line items", () => {
    expect(invoiceErrors(invoiceValues({ items: [] }))).toEqual({ items: "Add at least one line item" });
    expect(invoiceErrors(invoiceValues({ items: Array.from({ length: 101 }, () => lineItem()) }))).toEqual({
      items: "An invoice can have at most 100 line items",
    });
  });

  it("reports line item errors by index", () => {
    expect(invoiceErrors(invoiceValues({ items: [lineItem(), lineItem({ title: "" })] }))).toEqual({
      "items.1.title": "Service title is required",
    });
  });

  it.each(["drive.google.com/file/d/abc", "javascript:alert(1)", "ftp://files.example.com/unit.pdf"])(
    "rejects the work link %j",
    (workUrl) => {
      expect(invoiceErrors(invoiceValues({ items: [lineItem({ workUrl })] }))).toEqual({
        "items.0.workUrl": "Enter a full link starting with https://",
      });
    },
  );

  it.each(["", "abc", "-5", "1.234"])("rejects the unit price %j", (unitPrice) => {
    expect(invoiceErrors(invoiceValues({ items: [lineItem({ unitPrice })] }))).toEqual({
      "items.0.unitPrice": "Enter a valid amount, e.g. 1250.00",
    });
  });

  it("caps the unit price at 1 billion", () => {
    expect(invoiceFormSchema.parse(invoiceValues({ items: [lineItem({ unitPrice: "1000000000" })] })).items[0].unitPriceCents).toBe(
      100_000_000_000,
    );
    expect(invoiceErrors(invoiceValues({ items: [lineItem({ unitPrice: "1000000000.01" })] }))).toEqual({
      "items.0.unitPrice": "Amount is too large",
    });
  });

  it("accepts IQD, a currency without minor units", () => {
    const parsed = invoiceFormSchema.parse(invoiceValues({ currency: "iqd", items: [lineItem({ unitPrice: "1,500,000" })] }));
    expect(parsed.currency).toBe("IQD");
    expect(parsed.items[0].unitPriceCents).toBe(150_000_000);
  });

  it.each(["0", "-1", "abc", "100001"])("rejects the quantity %j", (quantity) => {
    expect(invoiceErrors(invoiceValues({ items: [lineItem({ quantity })] }))).toEqual({
      "items.0.quantity": "Enter a quantity above 0 (max 2 decimals)",
    });
  });

  it("rejects a due date before the issue date", () => {
    expect(invoiceErrors(invoiceValues({ dueDate: "2026-09-27" }))).toEqual({
      dueDate: "Due date cannot be before the issue date",
    });
  });

  it("reports a due date before the issue date together with other field errors", () => {
    expect(invoiceErrors(invoiceValues({ clientName: "", dueDate: "2026-09-27" }))).toEqual({
      clientName: "Client name is required",
      dueDate: "Due date cannot be before the issue date",
    });
  });

  it("rejects impossible or malformed dates", () => {
    expect(invoiceErrors(invoiceValues({ issueDate: "2026-02-30" }))).toEqual({
      issueDate: "Enter a valid issue date",
    });
    expect(invoiceErrors(invoiceValues({ dueDate: "soon" }))).toEqual({ dueDate: "Enter a valid due date" });
    expect(invoiceFormSchema.parse(invoiceValues({ issueDate: "2028-02-29", dueDate: "" })).issueDate).toBe(
      "2028-02-29",
    );
  });

  it("rejects unknown currencies", () => {
    expect(invoiceErrors(invoiceValues({ currency: "ABC" }))).toEqual({ currency: "Choose a valid currency code" });
  });

  it("limits text length", () => {
    expect(invoiceErrors(invoiceValues({ summary: "x".repeat(2001) }))).toEqual({
      summary: "Must be at most 2000 characters",
    });
  });

  it("reports a form-level error for a non-object payload", () => {
    expect(Object.keys(invoiceErrors(null))).toEqual(["form"]);
  });
});

describe("settingsFormSchema", () => {
  const settingsValues = (overrides: Record<string, unknown> = {}) => ({
    fullName: "Jane Doe",
    jobTitle: "Software Engineer",
    email: "jane@example.com",
    phone: "+1 555 0100",
    address: "1 Main St",
    website: "https://jane.dev",
    paymentDetails: "IBAN: XX00 0000",
    currency: "SAR",
    invoicePrefix: "INV-",
    paymentTermsDays: "30",
    ...overrides,
  });

  const settingsErrors = (values: unknown) => {
    const result = settingsFormSchema.safeParse(values);
    if (result.success) throw new Error("Expected settings validation to fail");
    return toFieldErrors(result.error);
  };

  it("parses form values and strips unknown keys", () => {
    const parsed = settingsFormSchema.parse(
      settingsValues({ fullName: "  Jane Doe ", currency: "sar", signature: "file", $ACTION_ID_1: "" }),
    );
    expect(parsed).toEqual({
      fullName: "Jane Doe",
      jobTitle: "Software Engineer",
      email: "jane@example.com",
      phone: "+1 555 0100",
      address: "1 Main St",
      website: "https://jane.dev",
      paymentDetails: "IBAN: XX00 0000",
      currency: "SAR",
      invoicePrefix: "INV-",
      paymentTermsDays: 30,
    });
  });

  it("requires a name", () => {
    expect(settingsErrors(settingsValues({ fullName: "" }))).toEqual({ fullName: "Your name is required" });
  });

  it("accepts an empty email but rejects a malformed one", () => {
    expect(settingsFormSchema.parse(settingsValues({ email: "" })).email).toBe("");
    expect(settingsErrors(settingsValues({ email: "jane@" }))).toEqual({ email: "Enter a valid email address" });
  });

  it("restricts the invoice prefix", () => {
    expect(settingsFormSchema.parse(settingsValues({ invoicePrefix: "ACME/" })).invoicePrefix).toBe("ACME/");
    expect(settingsFormSchema.parse(settingsValues({ invoicePrefix: "" })).invoicePrefix).toBe("");
    expect(settingsErrors(settingsValues({ invoicePrefix: "INV 2026" }))).toEqual({
      invoicePrefix: "Use letters, numbers, dashes, dots, slashes or underscores",
    });
    expect(settingsErrors(settingsValues({ invoicePrefix: "A".repeat(21) }))).toEqual({
      invoicePrefix: "Must be at most 20 characters",
    });
  });

  it.each([
    ["abc", "Enter a number of days"],
    ["1.5", "Enter a whole number of days"],
    ["-1", "Cannot be negative"],
    ["366", "Must be at most 365 days"],
  ])("rejects payment terms %j", (paymentTermsDays, message) => {
    expect(settingsErrors(settingsValues({ paymentTermsDays }))).toEqual({ paymentTermsDays: message });
  });

  it("treats empty payment terms as 0 days (no due date)", () => {
    expect(settingsFormSchema.parse(settingsValues({ paymentTermsDays: "" })).paymentTermsDays).toBe(0);
  });
});

describe("toFieldErrors", () => {
  it("keeps the first message per path", () => {
    const schema = z.object({ code: z.string().min(3, "Too short").regex(/^\d+$/, "Digits only") });
    const result = schema.safeParse({ code: "x" });
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!)).toEqual({ code: "Too short" });
  });
});

describe("isHttpUrl", () => {
  it.each([
    ["https://drive.google.com/file/d/abc/view", true],
    ["http://example.com", true],
    ["ftp://example.com", false],
    ["mailto:jane@example.com", false],
    ["javascript:alert(1)", false],
    ["drive.google.com", false],
    ["", false],
  ])("%j -> %s", (value, expected) => {
    expect(isHttpUrl(value)).toBe(expected);
  });
});
