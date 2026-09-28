import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/ui";
import { getSettings } from "@/server/settings";
import { SettingsForm } from "./_components/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const settings = getSettings();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description="Your details appear on every invoice. Defaults apply to new invoices."
      />
      <SettingsForm
        initial={{
          version: settings.updatedAt.getTime(),
          fullName: settings.fullName,
          jobTitle: settings.jobTitle,
          email: settings.email,
          phone: settings.phone,
          address: settings.address,
          website: settings.website,
          paymentDetails: settings.paymentDetails,
          currency: settings.currency,
          invoicePrefix: settings.invoicePrefix,
          paymentTermsDays: settings.paymentTermsDays,
          signatureImage: settings.signatureImage,
        }}
      />
    </div>
  );
}
