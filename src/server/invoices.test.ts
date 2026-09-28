import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "@/db";
import { invoiceItems } from "@/db/schema";
import type { InvoiceInput, SettingsInput } from "@/lib/validation";
import {
  InvoiceError,
  createInvoice,
  deleteInvoice,
  duplicateInvoice,
  getInvoice,
  listInvoices,
  postInvoice,
  resetInvoiceToDraft,
  updateInvoice,
  type InvoiceErrorCode,
} from "./invoices";
import { updateSettings } from "./settings";

let db: ReturnType<typeof createDatabase>;

beforeEach(() => {
  db = createDatabase(":memory:");
});

afterEach(() => {
  vi.useRealTimers();
  db.$client.close();
});

type LineItem = InvoiceInput["items"][number];

const apiWork: LineItem = {
  title: "API development",
  description: "REST endpoints",
  workUrl: "https://drive.google.com/file/d/abc/view",
  quantity: 2,
  unitPriceCents: 50000,
};
const consulting: LineItem = { title: "Consulting", description: "", workUrl: "", quantity: 1.5, unitPriceCents: 10001 };
const TOTAL_CENTS = 2 * 50000 + 15002; // 1.5 × 10001 = 15001.5 → 15002

function invoiceInput(overrides: Partial<InvoiceInput> = {}): InvoiceInput {
  return {
    clientName: "Acme Corp",
    clientDetails: "1 Main St",
    issueDate: "2026-09-28",
    dueDate: "2026-10-12",
    currency: "USD",
    summary: "Built the API",
    notes: "",
    items: [apiWork, consulting],
    ...overrides,
  };
}

function settingsInput(overrides: Partial<SettingsInput> = {}): SettingsInput {
  return {
    fullName: "Jane Doe",
    jobTitle: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    paymentDetails: "",
    currency: "USD",
    invoicePrefix: "INV-",
    paymentTermsDays: 14,
    ...overrides,
  };
}

function expectInvoiceError(action: () => unknown, code: InvoiceErrorCode) {
  let caught: unknown;
  try {
    action();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(InvoiceError);
  expect((caught as InvoiceError).code).toBe(code);
}

/** Sets the fake clock to a local wall-clock time. */
function setNow(year: number, monthIndex: number, day: number, hour = 12) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(year, monthIndex, day, hour));
}

const itemFields = ({ position, title, description, workUrl, quantity, unitPriceCents }: LineItem & { position: number }) => ({
  position,
  title,
  description,
  workUrl,
  quantity,
  unitPriceCents,
});

describe("InvoiceError", () => {
  it("is an Error carrying a code", () => {
    const error = new InvoiceError("Add at least one line item before posting", "NO_ITEMS");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("InvoiceError");
    expect(error.code).toBe("NO_ITEMS");
    expect(error.message).toBe("Add at least one line item before posting");
  });
});

describe("createInvoice / getInvoice", () => {
  it("stores a draft with its line items in order and the computed total", () => {
    const id = createInvoice(invoiceInput(), db);
    const invoice = getInvoice(id, db);

    expect(invoice).toMatchObject({
      id,
      status: "draft",
      number: null,
      postedAt: null,
      clientName: "Acme Corp",
      clientDetails: "1 Main St",
      issueDate: "2026-09-28",
      dueDate: "2026-10-12",
      currency: "USD",
      summary: "Built the API",
      totalCents: TOTAL_CENTS,
    });
    expect(invoice?.createdAt).toBeInstanceOf(Date);
    expect(invoice?.items.map(itemFields)).toEqual([
      { position: 0, ...apiWork },
      { position: 1, ...consulting },
    ]);
    expect(invoice?.items.every((item) => item.invoiceId === id)).toBe(true);
  });

  it("returns null for an unknown id", () => {
    expect(getInvoice(404, db)).toBeNull();
  });
});

describe("listInvoices", () => {
  it("returns an empty list for an empty database", () => {
    expect(listInvoices({}, db)).toEqual([]);
  });

  it("lists newest issue date first (then newest id) with item counts and totals", () => {
    const january = createInvoice(invoiceInput({ issueDate: "2026-01-10", dueDate: null }), db);
    const september = createInvoice(invoiceInput({ issueDate: "2026-09-01", dueDate: null, items: [consulting] }), db);
    const septemberLater = createInvoice(invoiceInput({ issueDate: "2026-09-01", dueDate: null }), db);
    const empty = createInvoice(invoiceInput({ issueDate: "2025-12-31", dueDate: null, items: [] }), db);

    const rows = listInvoices({}, db);
    expect(rows.map((row) => row.id)).toEqual([septemberLater, september, january, empty]);
    expect(rows.map((row) => [row.itemCount, row.totalCents])).toEqual([
      [2, TOTAL_CENTS],
      [1, 15002],
      [2, TOTAL_CENTS],
      [0, 0],
    ]);
  });

  it("filters by status", () => {
    const draft = createInvoice(invoiceInput(), db);
    const posted = createInvoice(invoiceInput(), db);
    postInvoice(posted, db);

    expect(listInvoices({ status: "draft" }, db).map((row) => row.id)).toEqual([draft]);
    expect(listInvoices({ status: "posted" }, db).map((row) => row.id)).toEqual([posted]);
    expect(listInvoices({}, db)).toHaveLength(2);
  });
});

describe("updateInvoice", () => {
  it("replaces the fields and line items of a draft", () => {
    const id = createInvoice(invoiceInput(), db);
    updateInvoice(id, invoiceInput({ clientName: "Globex", dueDate: null, items: [consulting] }), db);

    const invoice = getInvoice(id, db);
    expect(invoice).toMatchObject({ clientName: "Globex", dueDate: null, totalCents: 15002 });
    expect(invoice?.items.map(itemFields)).toEqual([{ position: 0, ...consulting }]);
    expect(db.select().from(invoiceItems).all()).toHaveLength(1);
  });

  it("bumps updatedAt but not createdAt", () => {
    setNow(2026, 8, 28, 10);
    const id = createInvoice(invoiceInput(), db);
    const created = getInvoice(id, db)!;

    setNow(2026, 8, 28, 11);
    updateInvoice(id, invoiceInput({ clientName: "Globex" }), db);
    const updated = getInvoice(id, db)!;

    expect(updated.createdAt.getTime()).toBe(created.createdAt.getTime());
    expect(updated.updatedAt.getTime() - created.updatedAt.getTime()).toBe(60 * 60 * 1000);
  });

  it("refuses to edit a posted invoice", () => {
    const id = createInvoice(invoiceInput(), db);
    postInvoice(id, db);

    expectInvoiceError(() => updateInvoice(id, invoiceInput({ clientName: "Globex" }), db), "NOT_DRAFT");
    expect(getInvoice(id, db)?.clientName).toBe("Acme Corp");
  });

  it("fails for an unknown id", () => {
    expectInvoiceError(() => updateInvoice(404, invoiceInput(), db), "NOT_FOUND");
  });
});

describe("deleteInvoice", () => {
  it("deletes a draft together with its line items", () => {
    const id = createInvoice(invoiceInput(), db);
    const other = createInvoice(invoiceInput({ items: [consulting] }), db);
    deleteInvoice(id, db);

    expect(getInvoice(id, db)).toBeNull();
    expect(db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).all()).toEqual([]);
    expect(getInvoice(other, db)?.items).toHaveLength(1);
  });

  it("refuses to delete a posted invoice", () => {
    const id = createInvoice(invoiceInput(), db);
    postInvoice(id, db);

    expectInvoiceError(() => deleteInvoice(id, db), "NOT_DRAFT");
    expect(getInvoice(id, db)).not.toBeNull();
  });

  it("fails for an unknown id", () => {
    expectInvoiceError(() => deleteInvoice(404, db), "NOT_FOUND");
  });
});

describe("postInvoice", () => {
  it("locks the invoice and numbers it sequentially within its issue year", () => {
    const march = createInvoice(invoiceInput({ issueDate: "2026-03-01", dueDate: null }), db);
    const september = createInvoice(invoiceInput({ issueDate: "2026-09-28" }), db);
    const nextYear = createInvoice(invoiceInput({ issueDate: "2027-01-02", dueDate: null }), db);
    const december = createInvoice(invoiceInput({ issueDate: "2026-12-31", dueDate: null }), db);

    expect(postInvoice(march, db)).toBe("INV-2026-0001");
    expect(postInvoice(september, db)).toBe("INV-2026-0002");
    expect(postInvoice(nextYear, db)).toBe("INV-2027-0001");
    expect(postInvoice(december, db)).toBe("INV-2026-0003");

    const posted = getInvoice(march, db);
    expect(posted).toMatchObject({ status: "posted", number: "INV-2026-0001" });
    expect(posted?.postedAt).toBeInstanceOf(Date);
  });

  it("uses the invoice prefix from settings", () => {
    updateSettings(settingsInput({ invoicePrefix: "ACME/" }), db);
    expect(postInvoice(createInvoice(invoiceInput(), db), db)).toBe("ACME/2026-0001");
  });

  it("treats SQL wildcard characters in the prefix literally", () => {
    updateSettings(settingsInput({ invoicePrefix: "INVX" }), db);
    expect(postInvoice(createInvoice(invoiceInput(), db), db)).toBe("INVX2026-0001");

    updateSettings(settingsInput({ invoicePrefix: "INV_" }), db);
    expect(postInvoice(createInvoice(invoiceInput(), db), db)).toBe("INV_2026-0001");
  });

  it("keeps the number when a reset invoice is posted again", () => {
    const first = createInvoice(invoiceInput(), db);
    const second = createInvoice(invoiceInput(), db);
    expect(postInvoice(first, db)).toBe("INV-2026-0001");
    expect(postInvoice(second, db)).toBe("INV-2026-0002");

    resetInvoiceToDraft(first, db);
    expect(postInvoice(first, db)).toBe("INV-2026-0001");
    expect(postInvoice(createInvoice(invoiceInput(), db), db)).toBe("INV-2026-0003");
  });

  it("cannot post the same invoice twice", () => {
    const id = createInvoice(invoiceInput(), db);
    postInvoice(id, db);
    expectInvoiceError(() => postInvoice(id, db), "NOT_DRAFT");
  });

  it("requires at least one line item", () => {
    const id = createInvoice(invoiceInput({ items: [] }), db);
    expectInvoiceError(() => postInvoice(id, db), "NO_ITEMS");
    expect(getInvoice(id, db)).toMatchObject({ status: "draft", number: null });
  });

  it("fails for an unknown id", () => {
    expectInvoiceError(() => postInvoice(404, db), "NOT_FOUND");
  });
});

describe("resetInvoiceToDraft", () => {
  it("unlocks a posted invoice and keeps its number", () => {
    const id = createInvoice(invoiceInput(), db);
    postInvoice(id, db);
    resetInvoiceToDraft(id, db);

    expect(getInvoice(id, db)).toMatchObject({ status: "draft", number: "INV-2026-0001", postedAt: null });
    updateInvoice(id, invoiceInput({ clientName: "Globex" }), db);
    expect(getInvoice(id, db)?.clientName).toBe("Globex");
  });

  it("only accepts posted invoices", () => {
    expectInvoiceError(() => resetInvoiceToDraft(createInvoice(invoiceInput(), db), db), "NOT_POSTED");
    expectInvoiceError(() => resetInvoiceToDraft(404, db), "NOT_FOUND");
  });
});

describe("duplicateInvoice", () => {
  it("copies an invoice into a new draft dated today with the default payment terms", () => {
    const sourceId = createInvoice(invoiceInput({ notes: "Thank you!" }), db);
    postInvoice(sourceId, db);

    setNow(2026, 9, 5);
    const copyId = duplicateInvoice(sourceId, db);
    const source = getInvoice(sourceId, db)!;
    const copy = getInvoice(copyId, db)!;

    expect(copyId).not.toBe(sourceId);
    expect(copy).toMatchObject({
      status: "draft",
      number: null,
      postedAt: null,
      clientName: source.clientName,
      clientDetails: source.clientDetails,
      currency: source.currency,
      summary: source.summary,
      notes: "Thank you!",
      issueDate: "2026-10-05",
      dueDate: "2026-10-19",
      totalCents: source.totalCents,
    });
    expect(copy.items.map(itemFields)).toEqual(source.items.map(itemFields));
    expect(copy.items.every((item) => item.invoiceId === copyId)).toBe(true);
    expect(getInvoice(sourceId, db)).toMatchObject({ status: "posted", number: "INV-2026-0001" });
  });

  it("leaves the due date empty when payment terms are 0 days", () => {
    updateSettings(settingsInput({ paymentTermsDays: 0 }), db);
    const copyId = duplicateInvoice(createInvoice(invoiceInput(), db), db);
    expect(getInvoice(copyId, db)?.dueDate).toBeNull();
  });

  it("fails for an unknown id", () => {
    expectInvoiceError(() => duplicateInvoice(404, db), "NOT_FOUND");
  });
});
