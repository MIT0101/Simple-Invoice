import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/ui";
import { invoiceToFormValues } from "@/lib/invoice-form";
import { parseId, routes } from "@/lib/routes";
import { getInvoice } from "@/server/invoices";
import { InvoiceForm } from "../../_components/invoice-form";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({ params }: Props) {
  const id = parseId((await params).id);
  if (id === null) notFound();

  await connection();
  const invoice = getInvoice(id);
  if (!invoice) notFound();
  // Posted invoices are locked; they must be reset to draft first.
  if (invoice.status !== "draft") redirect(routes.invoice(id));

  return (
    <>
      <PageHeader
        title={invoice.number ? `Edit ${invoice.number}` : "Edit draft invoice"}
        description={invoice.clientName}
      />
      <InvoiceForm
        invoiceId={id}
        initialValues={invoiceToFormValues(invoice)}
        cancelHref={routes.invoice(id)}
      />
    </>
  );
}
