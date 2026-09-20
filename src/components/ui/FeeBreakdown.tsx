import { calculateProcessingFee, formatCurrency } from '../../utils/stripe';

interface FeeBreakdownProps {
  rentAmount: number;
  showPlatformFee?: boolean;
  platformFee?: number;
  paymentMethodType?: string;
}

export function FeeBreakdown({
  rentAmount,
  showPlatformFee = false,
  platformFee = 0,
  paymentMethodType = 'card',
}: FeeBreakdownProps) {
  const hasBalance = rentAmount > 0;
  const calculatedFees = hasBalance ? calculateProcessingFee(rentAmount, paymentMethodType) : { processingFee: 0, totalAmount: 0 };
  const { processingFee, totalAmount } = calculatedFees;
  const finalTotal = totalAmount + (showPlatformFee ? platformFee : 0);

  const rateText = paymentMethodType === 'acss_debit'
    ? '(1% + $0.40)'
    : '(2.9% + $0.30)';

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">Rent amount</span>
        <span className="font-medium">{formatCurrency(rentAmount)}</span>
      </div>

      {hasBalance && (
        <div className="flex justify-between">
          <span className="text-gray-600">
            Processing fee{' '}
            <span className="text-xs text-gray-500">{rateText}</span>
          </span>
          <span className="font-medium">{formatCurrency(processingFee)}</span>
        </div>
      )}

      {showPlatformFee && platformFee > 0 && (
        <div className="flex justify-between">
          <span className="text-gray-600">Platform fee</span>
          <span className="font-medium">{formatCurrency(platformFee)}</span>
        </div>
      )}

      <div className="border-t pt-2 flex justify-between">
        <span className="font-semibold">Total</span>
        <span className="font-semibold text-lg">
          {formatCurrency(finalTotal)}
        </span>
      </div>

      {hasBalance && (
        <p className="text-xs text-gray-500 mt-2">
          💡 The processing fee costs are charged by Stripe.
        </p>
      )}
    </div>
  );
}
