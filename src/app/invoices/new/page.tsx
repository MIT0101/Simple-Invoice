import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/ui";
import { todayIso } from "@/lib/dates";
import { newInvoiceFormValues } from "@/lib/invoice-form";
import { routes } from "@/lib/routes";
import { getSettings } from "@/server/settings";
import { InvoiceForm } from "../_components/invoice-form";
import { SettingsReminder } from "../_components/settings-reminder";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  await connection();
  const settings = getSettings();
  const initialValues = newInvoiceFormValues({
    today: todayIso(),
    currency: settings.currency,
    paymentTermsDays: settings.paymentTermsDays,
  });

  return (
    <>
      <PageHeader
        title="New invoice"
        description="Saved as a draft — review the PDF, then post it when it is ready."
      />
      {settings.fullName ? null : <SettingsReminder />}
      <InvoiceForm invoiceId={null} initialValues={initialValues} cancelHref={routes.invoices} />
    </>
  );
}
