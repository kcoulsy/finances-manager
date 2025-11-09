/**
 * Formats a number as currency using the specified currency code
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., "USD", "EUR")
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

