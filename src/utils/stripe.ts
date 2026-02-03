/**
 * Calculate Stripe processing fee for a given rent amount
 * Formula: (rentAmount * 0.029) + 0.30
 */
export function calculateProcessingFee(rentAmount: number, paymentMethodType: string = 'card'): {
  rentAmount: number;
  processingFee: number;
  totalAmount: number;
} {
  let fee = 0;

  if (paymentMethodType === 'acss_debit') {
    fee = rentAmount * 0.01 + 0.40; // 1% + CA$0.40
  } else {
    // Default to Card
    fee = rentAmount * 0.029 + 0.30;
  }

  const processingFee = Math.round(fee * 100) / 100; // Round to 2 decimals
  const totalAmount = Math.round((rentAmount + processingFee) * 100) / 100;

  return {
    rentAmount,
    processingFee,
    totalAmount,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
