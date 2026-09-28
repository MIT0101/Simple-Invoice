import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { invoiceItems, invoices, type InvoiceStatus } from "@/db/schema";
import { addDaysIso, todayIso } from "@/lib/dates";
import { invoiceNumberBase, nextInvoiceNumber } from "@/lib/invoice-number";
import { sumLineAmounts } from "@/lib/money";
import type { InvoiceInput } from "@/lib/validation";
import { getSettings } from "./settings";

export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InvoiceWithItems = Invoice & { items: InvoiceItem[]; totalCents: number };
export type InvoiceListItem = Invoice & { itemCount: number; totalCents: number };

export type InvoiceErrorCode = "NOT_FOUND" | "NOT_DRAFT" | "NOT_POSTED" | "NO_ITEMS";

/** A business-rule violation whose message is safe to show to the user. */
export class InvoiceError extends Error {
  readonly code: InvoiceErrorCode;

  constructor(message: string, code: InvoiceErrorCode) {
    super(message);
    this.name = "InvoiceError";
    this.code = code;
  }
}

type LineItemInput = InvoiceInput["items"][number];

function replaceItems(db: Db, invoiceId: number, items: ReadonlyArray<LineItemInput>): void {
  db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).run();
  if (items.length === 0) return;
  db.insert(invoiceItems)
    .values(items.map((item, position) => ({ ...item, invoiceId, position })))
    .run();
}

function requireStatus(db: Db, id: number): InvoiceStatus {
  const row = db.select({ status: invoices.status }).from(invoices).where(eq(invoices.id, id)).get();
  if (!row) throw new InvoiceError("Invoice not found", "NOT_FOUND");
  return row.status;
}

export function listInvoices(
  options: { status?: InvoiceStatus } = {},
  db: Db = getDb(),
): InvoiceListItem[] {
  const rows = db
    .select()
    .from(invoices)
    .where(options.status ? eq(invoices.status, options.status) : undefined)
    .orderBy(desc(invoices.issueDate), desc(invoices.id))
    .all();
  if (rows.length === 0) return [];

  const items = db
    .select({
      invoiceId: invoiceItems.invoiceId,
      quantity: invoiceItems.quantity,
      unitPriceCents: invoiceItems.unitPriceCents,
    })
    .from(invoiceItems)
    .where(
      inArray(
        invoiceItems.invoiceId,
        rows.map((row) => row.id),
      ),
    )
    .all();

  const itemsByInvoice = new Map<number, typeof items>();
  for (const item of items) {
    const list = itemsByInvoice.get(item.invoiceId) ?? [];
    list.push(item);
    itemsByInvoice.set(item.invoiceId, list);
  }

  return rows.map((row) => {
    const rowItems = itemsByInvoice.get(row.id) ?? [];
    return { ...row, itemCount: rowItems.length, totalCents: sumLineAmounts(rowItems) };
  });
}

export function getInvoice(id: number, db: Db = getDb()): InvoiceWithItems | null {
  const invoice = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!invoice) return null;
  const items = db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.position))
    .all();
  return { ...invoice, items, totalCents: sumLineAmounts(items) };
}

export function createInvoice(input: InvoiceInput, db: Db = getDb()): number {
  return db.transaction((tx) => {
    const { items, ...fields } = input;
    const created = tx
      .insert(invoices)
      .values({ ...fields, status: "draft" })
      .returning({ id: invoices.id })
      .get();
    replaceItems(tx, created.id, items);
    return created.id;
  });
}

export function updateInvoice(id: number, input: InvoiceInput, db: Db = getDb()): void {
  db.transaction((tx) => {
    if (requireStatus(tx, id) !== "draft") {
      throw new InvoiceError("Only draft invoices can be edited", "NOT_DRAFT");
    }
    const { items, ...fields } = input;
    tx.update(invoices).set(fields).where(eq(invoices.id, id)).run();
    replaceItems(tx, id, items);
  });
}

export function deleteInvoice(id: number, db: Db = getDb()): void {
  if (requireStatus(db, id) !== "draft") {
    throw new InvoiceError("Only draft invoices can be deleted", "NOT_DRAFT");
  }
  db.delete(invoices).where(eq(invoices.id, id)).run();
}

/** Locks a draft and assigns the next number for its issue year, keeping any number assigned before. */
export function postInvoice(id: number, db: Db = getDb()): string {
  return db.transaction((tx) => {
    const invoice = tx.select().from(invoices).where(eq(invoices.id, id)).get();
    if (!invoice) throw new InvoiceError("Invoice not found", "NOT_FOUND");
    if (invoice.status !== "draft") {
      throw new InvoiceError("Invoice is already posted", "NOT_DRAFT");
    }

    const { count } = tx
      .select({ count: sql<number>`count(*)` })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id))
      .get() ?? { count: 0 };
    if (count === 0) {
      throw new InvoiceError("Add at least one line item before posting", "NO_ITEMS");
    }

    let number = invoice.number;
    if (!number) {
      const prefix = getSettings(tx).invoicePrefix;
      const year = Number(invoice.issueDate.slice(0, 4));
      const base = invoiceNumberBase(prefix, year);
      const taken = tx
        .select({ number: invoices.number })
        .from(invoices)
        .where(sql`substr(${invoices.number}, 1, ${base.length}) = ${base}`)
        .all()
        .flatMap((row) => (row.number ? [row.number] : []));
      number = nextInvoiceNumber(prefix, year, taken);
    }

    tx.update(invoices)
      .set({ status: "posted", number, postedAt: new Date() })
      .where(eq(invoices.id, id))
      .run();
    return number;
  });
}

/** Unlocks a posted invoice for corrections; its number is kept. */
export function resetInvoiceToDraft(id: number, db: Db = getDb()): void {
  if (requireStatus(db, id) !== "posted") {
    throw new InvoiceError("Only posted invoices can be reset to draft", "NOT_POSTED");
  }
  db.update(invoices).set({ status: "draft", postedAt: null }).where(eq(invoices.id, id)).run();
}

/** Copies an invoice into a new draft dated today. */
export function duplicateInvoice(id: number, db: Db = getDb()): number {
  return db.transaction((tx) => {
    const source = getInvoice(id, tx);
    if (!source) throw new InvoiceError("Invoice not found", "NOT_FOUND");

    const { paymentTermsDays } = getSettings(tx);
    const issueDate = todayIso();
    const created = tx
      .insert(invoices)
      .values({
        status: "draft",
        clientName: source.clientName,
        clientDetails: source.clientDetails,
        issueDate,
        dueDate: paymentTermsDays > 0 ? addDaysIso(issueDate, paymentTermsDays) : null,
        currency: source.currency,
        summary: source.summary,
        notes: source.notes,
      })
      .returning({ id: invoices.id })
      .get();

    replaceItems(
      tx,
      created.id,
      source.items.map(({ title, description, workUrl, quantity, unitPriceCents }) => ({
        title,
        description,
        workUrl,
        quantity,
        unitPriceCents,
      })),
    );
    return created.id;
  });
}
