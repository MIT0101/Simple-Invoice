const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

function normalizeNumberInput(input: string): string {
  return input.trim().replace(/,/g, "");
}

/**
 * Parses a user-entered amount such as "1,250.5" into integer minor units (cents).
 * Returns null for anything that is not a non-negative amount with at most 2 decimals.
 */
export function parseMoneyToCents(input: string): number | null {
  const normalized = normalizeNumberInput(input);
  if (!DECIMAL_PATTERN.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Parses a positive quantity with at most 2 decimals, e.g. "1" or "7.5". */
export function parseQuantity(input: string): number | null {
  const normalized = normalizeNumberInput(input);
  if (!DECIMAL_PATTERN.test(normalized)) return null;
  const value = Number(normalized);
  return value > 0 ? value : null;
}

/** Formats cents as a plain input value, e.g. 125050 -> "1250.50". */
export function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function lineAmountCents(quantity: number, unitPriceCents: number): number {
  return Math.round(quantity * unitPriceCents);
}

export function sumLineAmounts(
  items: ReadonlyArray<{ quantity: number; unitPriceCents: number }>,
): number {
  return items.reduce((total, item) => total + lineAmountCents(item.quantity, item.unitPriceCents), 0);
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();

/** Formats cents with the ISO currency code, e.g. formatMoney(125050, "USD") -> "USD 1,250.50". */
export function formatMoney(cents: number, currency: string): string {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "code",
    });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(cents / 100);
}

const quantityFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatQuantity(quantity: number): string {
  return quantityFormatter.format(quantity);
}
