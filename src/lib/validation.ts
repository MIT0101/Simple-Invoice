import { z } from "zod";
import { isSupportedCurrency } from "./currencies";
import { parseMoneyToCents, parseQuantity } from "./money";

export const MAX_UNIT_PRICE_CENTS = 100_000_000_00; // 100 million
export const MAX_QUANTITY = 100_000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const optionalText = (max: number) =>
  z.string().trim().max(max, `Must be at most ${max} characters`);

const requiredText = (max: number, requiredMessage: string) =>
  z.string().trim().min(1, requiredMessage).max(max, `Must be at most ${max} characters`);

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isSupportedCurrency, "Choose a valid currency code");

const moneySchema = z.string().transform((value, ctx) => {
  const cents = parseMoneyToCents(value);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: "Enter a valid amount, e.g. 1250.00" });
    return z.NEVER;
  }
  if (cents > MAX_UNIT_PRICE_CENTS) {
    ctx.addIssue({ code: "custom", message: "Amount is too large" });
    return z.NEVER;
  }
  return cents;
});

const quantitySchema = z.string().transform((value, ctx) => {
  const quantity = parseQuantity(value);
  if (quantity === null || quantity > MAX_QUANTITY) {
    ctx.addIssue({ code: "custom", message: "Enter a quantity above 0 (max 2 decimals)" });
    return z.NEVER;
  }
  return quantity;
});

export const invoiceItemFormSchema = z.object({
  title: requiredText(200, "Service title is required"),
  description: optionalText(2000),
  workUrl: optionalText(2000).refine(
    (value) => value === "" || isHttpUrl(value),
    "Enter a full link starting with https://",
  ),
  quantity: quantitySchema,
  unitPrice: moneySchema,
});

const issueDateSchema = z.iso.date("Enter a valid issue date");
const dueDateSchema = z.union([z.literal(""), z.iso.date("Enter a valid due date")]);
const invoiceDatesSchema = z.object({ issueDate: issueDateSchema, dueDate: dueDateSchema });

/** Validates the invoice editor payload (all raw string inputs) and converts it for storage. */
export const invoiceFormSchema = z
  .object({
    clientName: requiredText(200, "Client name is required"),
    clientDetails: optionalText(1000),
    issueDate: issueDateSchema,
    dueDate: dueDateSchema,
    currency: currencySchema,
    summary: optionalText(2000),
    notes: optionalText(2000),
    items: z
      .array(invoiceItemFormSchema)
      .min(1, "Add at least one line item")
      .max(100, "An invoice can have at most 100 line items"),
  })
  .refine((invoice) => invoice.dueDate === "" || invoice.dueDate >= invoice.issueDate, {
    message: "Due date cannot be before the issue date",
    path: ["dueDate"],
    // Report this together with other field errors, as long as both dates are valid.
    when: (payload) => invoiceDatesSchema.safeParse(payload.value).success,
  })
  .transform(({ dueDate, items, ...invoice }) => ({
    ...invoice,
    dueDate: dueDate === "" ? null : dueDate,
    items: items.map(({ unitPrice, ...item }) => ({ ...item, unitPriceCents: unitPrice })),
  }));

/** Raw values held by the invoice editor (every field is a string). */
export type InvoiceFormValues = z.input<typeof invoiceFormSchema>;
export type InvoiceItemFormValues = InvoiceFormValues["items"][number];
/** Validated invoice ready to be stored. */
export type InvoiceInput = z.output<typeof invoiceFormSchema>;

/** Settings form text fields; the signature file is validated separately. */
export const settingsFormSchema = z.object({
  fullName: requiredText(120, "Your name is required"),
  jobTitle: optionalText(120),
  email: optionalText(200).refine(
    (value) => value === "" || EMAIL_PATTERN.test(value),
    "Enter a valid email address",
  ),
  phone: optionalText(50),
  address: optionalText(500),
  website: optionalText(200),
  paymentDetails: optionalText(1000),
  currency: currencySchema,
  invoicePrefix: z
    .string()
    .trim()
    .max(20, "Must be at most 20 characters")
    .regex(/^[A-Za-z0-9._/-]*$/, "Use letters, numbers, dashes, dots, slashes or underscores"),
  paymentTermsDays: z.coerce
    .number({ error: "Enter a number of days" })
    .int("Enter a whole number of days")
    .min(0, "Cannot be negative")
    .max(365, "Must be at most 365 days"),
});

export type SettingsFormValues = z.input<typeof settingsFormSchema>;
export type SettingsInput = z.output<typeof settingsFormSchema>;

/** Flattens Zod issues into `{ "items.0.title": "message" }` (first message per path wins). */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}
