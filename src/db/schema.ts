import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const INVOICE_STATUSES = ["draft", "posted"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Single-row table (id = 1) holding the freelancer's profile and invoice defaults. */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  fullName: text("full_name").notNull().default(""),
  jobTitle: text("job_title").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  website: text("website").notNull().default(""),
  paymentDetails: text("payment_details").notNull().default(""),
  /** Signature as a `data:image/png|jpeg;base64,...` URL, or null when not uploaded. */
  signatureImage: text("signature_image"),
  currency: text("currency").notNull().default("USD"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV-"),
  paymentTermsDays: integer("payment_terms_days").notNull().default(14),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export const invoices = sqliteTable(
  "invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Assigned on first posting, e.g. "INV-2026-0001"; kept if reset to draft. */
    number: text("number").unique(),
    status: text("status", { enum: INVOICE_STATUSES }).notNull().default("draft"),
    clientName: text("client_name").notNull(),
    clientDetails: text("client_details").notNull().default(""),
    /** Calendar date, YYYY-MM-DD. */
    issueDate: text("issue_date").notNull(),
    /** Calendar date, YYYY-MM-DD. */
    dueDate: text("due_date"),
    currency: text("currency").notNull(),
    /** Short summary of the completed work, one point per line. */
    summary: text("summary").notNull().default(""),
    notes: text("notes").notNull().default(""),
    postedAt: integer("posted_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index("invoices_status_idx").on(table.status),
    index("invoices_issue_date_idx").on(table.issueDate),
    check("invoices_status_check", sql`${table.status} in ('draft', 'posted')`),
  ],
);

export const invoiceItems = sqliteTable(
  "invoice_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** Link (usually Google Drive) to the PDF documenting this unit of work. */
    workUrl: text("work_url").notNull().default(""),
    quantity: real("quantity").notNull().default(1),
    /** Price per unit in minor units (cents). */
    unitPriceCents: integer("unit_price_cents").notNull(),
  },
  (table) => [
    index("invoice_items_invoice_id_idx").on(table.invoiceId, table.position),
    check("invoice_items_quantity_check", sql`${table.quantity} > 0`),
    check("invoice_items_unit_price_check", sql`${table.unitPriceCents} >= 0`),
  ],
);
