const WEI_PER_GEN = BigInt('1000000000000000000'); // 10^18

/**
 * Convert a display amount (e.g. 1.5 GEN) to wei.
 * Handles up to 18 decimal places of precision.
 */
export function toWei(amount: number): bigint {
  if (amount === 0) return BigInt(0);
  // Use string manipulation to avoid floating-point precision issues
  const [whole, fraction = ''] = amount.toString().split('.');
  const paddedFraction = fraction.padEnd(18, '0').slice(0, 18);
  return BigInt(whole) * WEI_PER_GEN + BigInt(paddedFraction);
}

/**
 * Convert wei to a display amount (e.g. 1.5 GEN).
 */
export function fromWei(wei: bigint): number {
  const whole = wei / WEI_PER_GEN;
  const fraction = wei % WEI_PER_GEN;
  if (fraction === BigInt(0)) return Number(whole);
  const fractionStr = fraction.toString().padStart(18, '0');
  return Number(`${whole}.${fractionStr}`);
}

/**
 * Format a wei amount for display with the GEN symbol.
 * @param wei - The amount in wei
 * @param decimals - Number of decimal places to show (default: 4)
 */
export function formatGEN(wei: bigint, decimals: number = 4): string {
  const whole = wei / WEI_PER_GEN;
  const fraction = wei % WEI_PER_GEN;
  if (fraction === BigInt(0)) return `${whole.toLocaleString()} GEN`;
  const fractionStr = fraction.toString().padStart(18, '0').slice(0, decimals);
  // Remove trailing zeros
  const trimmed = fractionStr.replace(/0+$/, '');
  if (trimmed === '') return `${whole.toLocaleString()} GEN`;
  return `${whole.toLocaleString()}.${trimmed} GEN`;
}
