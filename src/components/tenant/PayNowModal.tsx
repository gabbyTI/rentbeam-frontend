import React, { useEffect, useState } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FeeBreakdown } from '../ui/FeeBreakdown';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

interface PayNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rentAmount: number;
  paymentMethodLabel: string;
  month: string; // Format: "2026-01"
  membershipId: string;
}

export const PayNowModal: React.FC<PayNowModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rentAmount,
  paymentMethodLabel,
  month,
  membershipId,
}) => {
  const stripe = useStripe();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState(rentAmount);

  useEffect(() => {
    setCustomAmount(rentAmount);
  }, [rentAmount, isOpen]);

  const maxAllowedAmount = Math.max(rentAmount, 0);
  const normalizedAmount = Math.min(Math.max(customAmount, 0), maxAllowedAmount);

  const handlePayNow = async () => {
    if (!stripe) {
      showToast('Stripe is not loaded', 'error');
      return;
    }

    if (normalizedAmount <= 0 || normalizedAmount > maxAllowedAmount) {
      showToast('Please enter a valid payment amount within the outstanding balance.', 'error');
      return;
    }

    setLoading(true);

    try {
      // Create payment intent - backend confirms immediately with `confirm: true`
      const response = await api.post('/api/stripe/payment-intent', {
        month,
        membershipId,
        amount: normalizedAmount,
      });

      const { clientSecret } = response.data;

      // Retrieve the payment intent status (already confirmed by backend)
      const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);

      if (error) {
        showToast(error.message || 'Payment failed', 'error');
      } else if (paymentIntent?.status === 'succeeded') {
        showToast('Payment successful!', 'success');
        onSuccess();
        onClose();
      } else if (paymentIntent?.status === 'processing') {
        // Bank transfers (ACSS Debit) may take time to process
        showToast('Payment is being processed. You will receive a confirmation soon.', 'success');
        onSuccess();
        onClose();
      } else {
        showToast(`Payment status: ${paymentIntent?.status}`, 'error');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Payment failed';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pay Rent">
      <div className="space-y-6">
        {/* Payment Method Display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="text-sm text-gray-600 block mb-2">Payment Method</label>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💳</span>
            <span className="font-medium">{paymentMethodLabel}</span>
          </div>
        </div>

        {/* Fee Breakdown */}
        <div>
          <label className="text-sm text-gray-600 block mb-3">Payment Details</label>
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-2">Custom Amount (up to {`$${rentAmount.toFixed(2)}`})</label>
            <input
              type="number"
              min="0"
              max={maxAllowedAmount}
              step="0.01"
              value={customAmount}
              onChange={(e) => setCustomAmount(Number(e.target.value || 0))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <FeeBreakdown rentAmount={normalizedAmount} />
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            Your payment will be processed immediately. You'll receive a confirmation once
            the payment is complete.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePayNow}
            disabled={loading || !stripe}
            className="flex-1"
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
