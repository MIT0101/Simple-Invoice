import Link from "next/link";
import { connection } from "next/server";
import { ButtonLink, Card, PageHeader, StatusBadge, cn } from "@/components/ui";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/db/schema";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { routes } from "@/lib/routes";
import { listInvoices } from "@/server/invoices";
import { getSettings } from "@/server/settings";
import { SettingsReminder } from "./_components/settings-reminder";

type Props = { searchParams: Promise<{ status?: string | string[] }> };

const FILTERS: ReadonlyArray<{ label: string; status?: InvoiceStatus }> = [
  { label: "All" },
  { label: "Drafts", status: "draft" },
  { label: "Posted", status: "posted" },
];

function parseStatus(value: string | string[] | undefined): InvoiceStatus | undefined {
  return INVOICE_STATUSES.find((status) => status === value);
}

function filterHref(status?: InvoiceStatus): string {
  return status ? `${routes.invoices}?status=${status}` : routes.invoices;
}

export default async function InvoicesPage({ searchParams }: Props) {
  const status = parseStatus((await searchParams).status);
  await connection();
  const invoices = listInvoices({ status });
  const settings = getSettings();

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Drafts can be edited. Posted invoices are numbered and locked."
        actions={
          <ButtonLink href={routes.newInvoice} variant="primary">
            New invoice
          </ButtonLink>
        }
      />

      {settings.fullName ? null : <SettingsReminder />}

      <nav
        aria-label="Filter invoices by status"
        className="mb-4 flex w-fit gap-1 rounded-lg border border-zinc-200 bg-white p-1"
      >
        {FILTERS.map((filter) => {
          const active = filter.status === status;
          return (
            <Link
              key={filter.label}
              href={filterHref(filter.status)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {invoices.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-sm font-medium text-zinc-900">
            {status === "draft"
              ? "No draft invoices"
              : status === "posted"
                ? "No posted invoices"
                : "No invoices yet"}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            New invoices are saved as drafts until you post them.
          </p>
          <ButtonLink href={routes.newInvoice} variant="primary" className="mt-6">
            Create an invoice
          </ButtonLink>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Number
                </th>
                <th scope="col" className="px-4 py-3">
                  Client
                </th>
                <th scope="col" className="px-4 py-3">
                  Issue date
                </th>
                <th scope="col" className="px-4 py-3">
                  Due date
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Total
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    <Link href={routes.invoice(invoice.id)} className="hover:underline">
                      {invoice.number ?? <span className="font-normal text-zinc-400 italic">Draft</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={routes.invoice(invoice.id)} className="text-zinc-800 hover:underline">
                      {invoice.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {formatDate(invoice.issueDate)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    {formatMoney(invoice.totalCents, invoice.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invoice.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
