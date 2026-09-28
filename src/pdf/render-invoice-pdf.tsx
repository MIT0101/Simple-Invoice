import { renderToBuffer } from "@react-pdf/renderer";
import type { InvoiceWithItems } from "@/server/invoices";
import type { Settings } from "@/server/settings";
import { InvoiceDocument } from "./invoice-document";

export function renderInvoicePdf(invoice: InvoiceWithItems, settings: Settings): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} settings={settings} />);
}

/** Download name, e.g. "INV-2026-0001.pdf", or "draft-12.pdf" before the invoice is posted. */
export function invoicePdfFileName(invoice: Pick<InvoiceWithItems, "id" | "number">): string {
  const name = (invoice.number ?? `draft-${invoice.id}`)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return `${name || `invoice-${invoice.id}`}.pdf`;
}
