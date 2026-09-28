export const routes = {
  invoices: "/invoices",
  newInvoice: "/invoices/new",
  invoice: (id: number) => `/invoices/${id}`,
  editInvoice: (id: number) => `/invoices/${id}/edit`,
  settings: "/settings",
  /** PDF endpoint. `version` busts browser caches after edits; `download` forces a file download. */
  invoicePdf: (id: number, options: { download?: boolean; version?: string | number } = {}) => {
    const params = new URLSearchParams();
    if (options.download) params.set("download", "1");
    if (options.version !== undefined) params.set("v", String(options.version));
    const query = params.toString();
    return `/api/invoices/${id}/pdf${query ? `?${query}` : ""}`;
  },
} as const;

export function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
