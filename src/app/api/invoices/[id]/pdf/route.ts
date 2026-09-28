import { connection, type NextRequest } from "next/server";
import { parseId } from "@/lib/routes";
import { invoicePdfFileName, renderInvoicePdf } from "@/pdf/render-invoice-pdf";
import { getInvoice } from "@/server/invoices";
import { getSettings } from "@/server/settings";

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Invoice PDF: shown inline (preview/print), or downloaded with `?download=1`. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = parseId((await params).id);
  const invoice = id === null ? null : getInvoice(id);
  if (!invoice) return textResponse("Invoice not found", 404);

  let pdf: Buffer;
  try {
    pdf = await renderInvoicePdf(invoice, getSettings());
  } catch (error) {
    console.error(`Failed to render the PDF for invoice ${invoice.id}`, error);
    return textResponse("Could not generate the PDF", 500);
  }

  const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${invoicePdfFileName(invoice)}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
