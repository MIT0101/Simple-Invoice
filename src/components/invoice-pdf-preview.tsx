import { routes } from "@/lib/routes";

export function InvoicePdfPreview({ invoiceId, version }: { invoiceId: number; version: string }) {
  const pdfUrl = routes.invoicePdf(invoiceId, { version });
  return (
    <div className="space-y-2">
      <iframe
        src={`${pdfUrl}#view=FitH`}
        title="Invoice PDF preview"
        className="h-[80vh] min-h-[600px] w-full rounded-lg border border-zinc-200 bg-white shadow-xs"
      />
      <p className="text-right text-xs text-zinc-500">
        Preview not showing?{" "}
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
        >
          Open PDF in a new tab
        </a>
      </p>
    </div>
  );
}
