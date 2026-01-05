import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';

export const TenantAutopay: React.FC = () => {
  const { currentUser, tenants, updateState } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvc: '',
    consent: false,
  });

  const tenant = useMemo(() => {
    return tenants.find((t) => t.id === currentUser?.id);
  }, [tenants, currentUser]);

  const processingFee = tenant ? (tenant.unit!.rentAmount * 0.029 + 0.3).toFixed(2) : '0.00';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardData.number || !cardData.expiry || !cardData.cvc) {
      showToast('Please fill in all card details', 'error');
      return;
    }

    if (!cardData.consent) {
      showToast('Please agree to the autopay terms', 'error');
      return;
    }

    // Simulate card processing
    const last4 = cardData.number.slice(-4);
    const paymentMethodLabel = `Card •••• ${last4}`;

    const updatedTenants = tenants.map((t) =>
      t.id === tenant?.id
        ? { ...t, autopayEnabled: true, paymentMethodLabel }
        : t
    );

    updateState({ tenants: updatedTenants });

    showToast('Autopay enabled successfully!');
    navigate('/tenant/dashboard');
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  return (
    <AppShell title="Set Up Autopay">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/tenant/dashboard')}
          className="mb-6"
        >
          ← Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Enable Card Autopay</h2>
            <p className="text-sm text-gray-600 mt-1">
              Your card will be automatically charged on your rent due date each month.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Fee Disclosure */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Processing Fee:</strong> Card payments include a processing
                  fee of approximately ${processingFee} (2.9% + $0.30 per transaction).
                </p>
              </div>

              {/* Card Form (Mock) */}
              <div className="space-y-4">
                <Input
                  label="Card Number"
                  type="text"
                  value={cardData.number}
                  onChange={(e) => {
                    const formatted = formatCardNumber(
                      e.target.value.replace(/\s/g, '')
                    );
                    setCardData({ ...cardData, number: formatted });
                  }}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Expiry Date"
                    type="text"
                    value={cardData.expiry}
                    onChange={(e) => {
                      const formatted = formatExpiry(e.target.value);
                      setCardData({ ...cardData, expiry: formatted });
                    }}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                  <Input
                    label="CVC"
                    type="text"
                    value={cardData.cvc}
                    onChange={(e) =>
                      setCardData({
                        ...cardData,
                        cvc: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>

              {/* Consent */}
              <div className="border-t pt-4">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={cardData.consent}
                    onChange={(e) =>
                      setCardData({ ...cardData, consent: e.target.checked })
                    }
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-700">
                    I authorize RentTrack Lite to automatically charge my card for rent
                    payments each month. I understand that I can cancel autopay at any
                    time from my dashboard.
                  </span>
                </label>
              </div>

              {/* Security Note */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-gray-400 mr-2 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Secure Payment Processing
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      In a real application, this would be powered by Stripe Connect
                      with bank-grade security. This is a demo with mock data only.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/tenant/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Confirm Autopay
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};
