/** Common start of every invoice number in a year, e.g. "INV-2026-". */
export function invoiceNumberBase(prefix: string, year: number): string {
  return `${prefix}${year}-`;
}

/**
 * Next sequential number for the year, e.g. "INV-2026-0007" when "INV-2026-0006" is the highest.
 * Numbers that do not follow the pattern are ignored.
 */
export function nextInvoiceNumber(
  prefix: string,
  year: number,
  existingNumbers: ReadonlyArray<string>,
): string {
  const base = invoiceNumberBase(prefix, year);
  let highest = 0;
  for (const number of existingNumbers) {
    if (!number.startsWith(base)) continue;
    const sequence = number.slice(base.length);
    if (/^\d+$/.test(sequence)) highest = Math.max(highest, Number(sequence));
  }
  return `${base}${String(highest + 1).padStart(4, "0")}`;
}
