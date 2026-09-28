"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { routes } from "@/lib/routes";
import { invoiceFormSchema, toFieldErrors, type InvoiceFormValues } from "@/lib/validation";
import {
  createInvoice,
  deleteInvoice,
  duplicateInvoice,
  InvoiceError,
  postInvoice,
  resetInvoiceToDraft,
  updateInvoice,
} from "@/server/invoices";

// Server Actions are public POST endpoints: every argument is untrusted input.

const INVALID_ID: ActionResult = { ok: false, message: "Invalid invoice." };

function isValidId(id: unknown): id is number {
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0;
}

/** Runs a data-layer call; business-rule violations become a user-facing error result. */
function attempt<T>(operation: () => T): { value: T } | { error: ActionResult } {
  try {
    return { value: operation() };
  } catch (error) {
    if (error instanceof InvoiceError) return { error: { ok: false, message: error.message } };
    throw error;
  }
}

function revalidateInvoice(id: number): void {
  revalidatePath(routes.invoices);
  revalidatePath(routes.invoice(id));
}

/** Creates (invoiceId = null) or updates a draft, then opens its detail page. */
export async function saveInvoiceAction(
  invoiceId: number | null,
  values: InvoiceFormValues,
): Promise<ActionResult> {
  if (invoiceId !== null && !isValidId(invoiceId)) return INVALID_ID;

  const parsed = invoiceFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const outcome = attempt(() => {
    if (invoiceId === null) return createInvoice(parsed.data);
    updateInvoice(invoiceId, parsed.data);
    return invoiceId;
  });
  if ("error" in outcome) return outcome.error;

  revalidateInvoice(outcome.value);
  redirect(routes.invoice(outcome.value));
}

export async function postInvoiceAction(id: number): Promise<ActionResult> {
  if (!isValidId(id)) return INVALID_ID;
  const outcome = attempt(() => postInvoice(id));
  if ("error" in outcome) return outcome.error;
  revalidateInvoice(id);
  return { ok: true, message: `Posted as ${outcome.value}.` };
}

export async function resetInvoiceToDraftAction(id: number): Promise<ActionResult> {
  if (!isValidId(id)) return INVALID_ID;
  const outcome = attempt(() => resetInvoiceToDraft(id));
  if ("error" in outcome) return outcome.error;
  revalidateInvoice(id);
  return { ok: true };
}

/** Copies the invoice into a new draft and opens it for editing. */
export async function duplicateInvoiceAction(id: number): Promise<ActionResult> {
  if (!isValidId(id)) return INVALID_ID;
  const outcome = attempt(() => duplicateInvoice(id));
  if ("error" in outcome) return outcome.error;
  revalidatePath(routes.invoices);
  redirect(routes.editInvoice(outcome.value));
}

export async function deleteInvoiceAction(id: number): Promise<ActionResult> {
  if (!isValidId(id)) return INVALID_ID;
  const outcome = attempt(() => deleteInvoice(id));
  if ("error" in outcome) return outcome.error;
  revalidateInvoice(id);
  redirect(routes.invoices);
}
