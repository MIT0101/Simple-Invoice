import { addDaysIso } from "./dates";
import { centsToInputValue } from "./money";
import type { InvoiceFormValues, InvoiceItemFormValues } from "./validation";

export function emptyLineItem(): InvoiceItemFormValues {
  return { title: "", description: "", workUrl: "", quantity: "1", unitPrice: "" };
}

export function newInvoiceFormValues(options: {
  today: string;
  currency: string;
  paymentTermsDays: number;
}): InvoiceFormValues {
  return {
    clientName: "",
    clientDetails: "",
    issueDate: options.today,
    dueDate: options.paymentTermsDays > 0 ? addDaysIso(options.today, options.paymentTermsDays) : "",
    currency: options.currency,
    summary: "",
    notes: "",
    items: [emptyLineItem()],
  };
}

type StoredInvoice = {
  clientName: string;
  clientDetails: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  summary: string;
  notes: string;
  items: ReadonlyArray<{
    title: string;
    description: string;
    workUrl: string;
    quantity: number;
    unitPriceCents: number;
  }>;
};

export function invoiceToFormValues(invoice: StoredInvoice): InvoiceFormValues {
  return {
    clientName: invoice.clientName,
    clientDetails: invoice.clientDetails,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate ?? "",
    currency: invoice.currency,
    summary: invoice.summary,
    notes: invoice.notes,
    items: invoice.items.map((item) => ({
      title: item.title,
      description: item.description,
      workUrl: item.workUrl,
      quantity: String(item.quantity),
      unitPrice: centsToInputValue(item.unitPriceCents),
    })),
  };
}

/** Splits the "completed work" summary into bullet points, dropping blank lines and typed bullets. */
export function summaryLines(summary: string): string[] {
  return summary
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]\s+)?/, "").trim())
    .filter((line) => line.length > 0);
}
