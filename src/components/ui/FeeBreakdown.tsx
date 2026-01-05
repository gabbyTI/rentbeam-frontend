import { calculateProcessingFee, formatCurrency } from '../../utils/stripe';

interface FeeBreakdownProps {
  rentAmount: number;
  showPlatformFee?: boolean;
  platformFee?: number;
}

export function FeeBreakdown({
  rentAmount,
  showPlatformFee = false,
  platformFee = 0,
}: FeeBreakdownProps) {
  const { processingFee, totalAmount } = calculateProcessingFee(rentAmount);
  const finalTotal = totalAmount + (showPlatformFee ? platformFee : 0);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">Rent amount</span>
        <span className="font-medium">{formatCurrency(rentAmount)}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-gray-600">
          Processing fee{' '}
          <span className="text-xs text-gray-500">(2.9% + $0.30)</span>
        </span>
        <span className="font-medium">{formatCurrency(processingFee)}</span>
      </div>

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

      <p className="text-xs text-gray-500 mt-2">
        💡 The processing fee covers credit card transaction costs and is charged by Stripe.
      </p>
    </div>
  );
}
