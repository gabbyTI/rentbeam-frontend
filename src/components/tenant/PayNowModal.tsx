import React, { useState } from 'react';
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
}

export const PayNowModal: React.FC<PayNowModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rentAmount,
  paymentMethodLabel,
  month,
}) => {
  const stripe = useStripe();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePayNow = async () => {
    if (!stripe) {
      showToast('Stripe is not loaded', 'error');
      return;
    }

    setLoading(true);

    try {
      // Create payment intent
      const response = await api.post('/api/stripe/payment-intent', {
        month,
      });

      const { clientSecret, fees } = response.data;

      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

      if (error) {
        showToast(error.message || 'Payment failed', 'error');
      } else if (paymentIntent?.status === 'succeeded') {
        showToast('Payment successful!', 'success');
        onSuccess();
        onClose();
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
          <div className="bg-gray-50 rounded-lg p-4">
            <FeeBreakdown rentAmount={rentAmount} />
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            Your rent payment will be processed immediately. You'll receive a confirmation once
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
