import Link from "next/link";
import { Alert } from "@/components/ui";
import { routes } from "@/lib/routes";

export function SettingsReminder() {
  return (
    <Alert tone="info" className="mb-6">
      Add your name, contact details and signature in{" "}
      <Link href={routes.settings} className="font-medium underline underline-offset-2">
        Settings
      </Link>{" "}
      — they appear on every invoice.
    </Alert>
  );
}
