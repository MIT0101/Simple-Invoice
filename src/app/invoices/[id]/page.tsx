import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { InvoicePdfButtons } from "@/components/invoice-pdf-buttons";
import { InvoicePdfPreview } from "@/components/invoice-pdf-preview";
import { ButtonLink, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { parseId, routes } from "@/lib/routes";
import { getInvoice } from "@/server/invoices";
import { getSettings } from "@/server/settings";
import { InvoiceActions } from "../_components/invoice-actions";
import { SettingsReminder } from "../_components/settings-reminder";

type Props = { params: Promise<{ id: string }> };

/** Request-scoped, so generateMetadata and the page share a single lookup. */
const loadInvoice = cache(async (id: number) => {
  await connection();
  return getInvoice(id);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const invoice = id === null ? null : await loadInvoice(id);
  return { title: invoice ? (invoice.number ?? "Draft invoice") : "Invoice not found" };
}

export default async function InvoicePage({ params }: Props) {
  const id = parseId((await params).id);
  if (id === null) notFound();
  const invoice = await loadInvoice(id);
  if (!invoice) notFound();

  const settings = getSettings();
  const isDraft = invoice.status === "draft";
  // Changes whenever the invoice or the settings change, so the PDF is re-fetched.
  const version = `${invoice.updatedAt.getTime()}-${settings.updatedAt.getTime()}`;

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {invoice.number ?? "Draft invoice"}
            <StatusBadge status={invoice.status} />
          </span>
        }
        description={`${invoice.clientName} · ${formatDate(invoice.issueDate)} · ${formatMoney(invoice.totalCents, invoice.currency)}`}
        actions={
          <InvoiceActions invoiceId={invoice.id} status={invoice.status}>
            {isDraft ? <ButtonLink href={routes.editInvoice(invoice.id)}>Edit</ButtonLink> : null}
            <InvoicePdfButtons invoiceId={invoice.id} version={version} />
          </InvoiceActions>
        }
      />

      {settings.fullName ? null : <SettingsReminder />}

      <p className="mb-4 text-sm text-zinc-500">
        {isDraft
          ? "Drafts can be edited. Posting assigns the invoice number and locks the invoice."
          : "Posted invoices are locked. Reset to draft if you need to make a correction."}
      </p>

      <InvoicePdfPreview invoiceId={invoice.id} version={version} />
    </>
  );
}
