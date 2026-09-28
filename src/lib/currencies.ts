/** Currencies offered in the pickers. Any ISO 4217 code supported by Intl is accepted. */
export const COMMON_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "SAR",
  "AED",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "JOD",
  "EGP",
  "TRY",
  "CAD",
  "AUD",
  "CHF",
  "INR",
  "PKR",
  "MYR",
  "SGD",
  "JPY",
  "CNY",
] as const;

let supportedCurrencies: ReadonlySet<string> | undefined;

export function isSupportedCurrency(code: string): boolean {
  supportedCurrencies ??= new Set(Intl.supportedValuesOf("currency"));
  return supportedCurrencies.has(code);
}
