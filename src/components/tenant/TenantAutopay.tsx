import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { FeeBreakdown } from '../ui/FeeBreakdown';
import { useToast } from '../../context/ToastContext';
import { getCurrentUser, getTenantMembership, TenantMembershipDetails } from '../../services/api';
import { calculateProcessingFee, formatCurrency } from '../../utils/stripe';
import api from '../../services/api';

export const TenantAutopay: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tenantData, setTenantData] = useState<TenantMembershipDetails | null>(null);
  const [showRemoveCardModal, setShowRemoveCardModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    const loadTenantData = async () => {
      try {
        const profile = await getCurrentUser();

        if (!profile.memberships.tenants || profile.memberships.tenants.length === 0) {
          showToast('No tenant membership found', 'error');
          navigate('/login');
          return;
        }

        const membershipId = profile.memberships.tenants[0].id;
        const membership = await getTenantMembership(membershipId);
        setTenantData(membership);
      } catch (err: any) {
        showToast(err.message || 'Failed to load tenant data', 'error');
        navigate('/tenant/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadTenantData();
  }, [navigate, showToast]);

  const handleEnableAutopay = async () => {
    if (!consentChecked) {
      showToast('Please agree to the autopay terms', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await api.patch(`/api/tenants/${tenantData!.id}/autopay`, {
        autopayEnabled: true,
      });

      showToast('Autopay enabled successfully!', 'success');
      
      // Refresh data
      const membershipId = tenantData!.id;
      const membership = await getTenantMembership(membershipId);
      setTenantData(membership);
      setConsentChecked(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to enable autopay', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableAutopay = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/api/tenants/${tenantData!.id}/autopay`, {
        autopayEnabled: false,
      });

      showToast('Autopay disabled', 'success');
      setShowDisableModal(false);
      
      // Refresh data
      const membershipId = tenantData!.id;
      const membership = await getTenantMembership(membershipId);
      setTenantData(membership);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to disable autopay', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveCard = async () => {
    setActionLoading(true);
    try {
      await api.delete('/api/stripe/payment-method');

      showToast('Payment method removed successfully', 'success');
      setShowRemoveCardModal(false);
      
      // Refresh data
      const membershipId = tenantData!.id;
      const membership = await getTenantMembership(membershipId);
      setTenantData(membership);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to remove payment method', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Autopay Settings">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-gray-500">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!tenantData) {
    return (
      <AppShell title="Autopay Settings">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-gray-500">Tenant data not found</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const { unit } = tenantData;
  const rentAmount = Number(unit.rentAmount);
  const { processingFee, totalAmount } = calculateProcessingFee(rentAmount);

  // Calculate next charge date
  const getNextChargeDate = () => {
    const today = new Date();
    const dueDay = unit.dueDay;
    let nextCharge = new Date(today.getFullYear(), today.getMonth(), dueDay);
    
    if (today.getDate() >= dueDay) {
      nextCharge = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    }
    
    return nextCharge.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <AppShell title="Autopay Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/tenant/dashboard')}
        >
          ← Back to Dashboard
        </Button>

        {/* Payment Method Card */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Payment Method</h2>
          </CardHeader>
          <CardContent>
            {tenantData.defaultPaymentMethodId ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💳</span>
                      <div>
                        <p className="font-medium">{tenantData.paymentMethodLabel}</p>
                        <p className="text-sm text-gray-500">Default payment method</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/tenant/payment-method')}
                    className="flex-1"
                  >
                    Update Card
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowRemoveCardModal(true)}
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Remove Card
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">
                  No payment method on file. Add a card to enable autopay.
                </p>
                <Button onClick={() => navigate('/tenant/payment-method')}>
                  Add Payment Method
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Autopay Settings Card */}
        {tenantData.defaultPaymentMethodId && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Autopay Settings</h2>
            </CardHeader>
            <CardContent>
              {tenantData.autopayEnabled ? (
                <div className="space-y-6">
                  {/* Active Status */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-green-900">Autopay Active</span>
                    </div>
                    <p className="text-sm text-green-800">
                      Your rent will be automatically charged on the {unit.dueDay}
                      {unit.dueDay === 1 ? 'st' : unit.dueDay === 2 ? 'nd' : unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                    </p>
                  </div>

                  {/* Next Charge */}
                  <div>
                    <h3 className="font-medium mb-3">Next Scheduled Charge</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm text-gray-600">Date</span>
                        <span className="font-medium">{getNextChargeDate()}</span>
                      </div>
                      <FeeBreakdown rentAmount={rentAmount} />
                    </div>
                  </div>

                  {/* Disable Button */}
                  <Button
                    variant="secondary"
                    onClick={() => setShowDisableModal(true)}
                    className="w-full"
                  >
                    Disable Autopay
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Inactive Status */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="font-medium text-gray-900">Autopay Inactive</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Enable autopay to automatically charge your card on the {unit.dueDay}
                      {unit.dueDay === 1 ? 'st' : unit.dueDay === 2 ? 'nd' : unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                    </p>
                  </div>

                  {/* Fee Preview */}
                  <div>
                    <h3 className="font-medium mb-3">Your Monthly Charge</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <FeeBreakdown rentAmount={rentAmount} />
                    </div>
                  </div>

                  {/* Consent */}
                  <div className="border-t pt-4">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">
                        I authorize RentTrack to automatically charge my payment method for 
                        {' '}{formatCurrency(totalAmount)} on the {unit.dueDay}
                        {unit.dueDay === 1 ? 'st' : unit.dueDay === 2 ? 'nd' : unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                        I understand I can disable autopay at any time.
                      </span>
                    </label>
                  </div>

                  {/* Enable Button */}
                  <Button
                    onClick={handleEnableAutopay}
                    disabled={!consentChecked || actionLoading}
                    className="w-full"
                  >
                    {actionLoading ? 'Enabling...' : 'Enable Autopay'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Remove Card Modal */}
      <Modal
        isOpen={showRemoveCardModal}
        onClose={() => setShowRemoveCardModal(false)}
        title="Remove Payment Method"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to remove your payment method? This will also disable autopay.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-900">
              You'll need to add a new payment method to pay rent online or enable autopay again.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowRemoveCardModal(false)}
              disabled={actionLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveCard}
              disabled={actionLoading}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? 'Removing...' : 'Remove Card'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Disable Autopay Modal */}
      <Modal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        title="Disable Autopay"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to disable autopay? You'll need to manually pay your rent each month.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              Your payment method will remain saved for one-time payments.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDisableModal(false)}
              disabled={actionLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisableAutopay}
              disabled={actionLoading}
              className="flex-1"
            >
              {actionLoading ? 'Disabling...' : 'Disable Autopay'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
};

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
