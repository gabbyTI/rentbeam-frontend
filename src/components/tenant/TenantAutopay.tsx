import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { FeeBreakdown } from '../ui/FeeBreakdown';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import { fetchLedgerBalance, getTenantMembership, TenantMembershipDetails } from '../../services/api';
import { calculateProcessingFee, formatCurrency } from '../../utils/stripe';
import api from '../../services/api';

export const TenantAutopay: React.FC = () => {
  const { showToast } = useToast();
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tenantData, setTenantData] = useState<TenantMembershipDetails | null>(null);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [showRemoveCardModal, setShowRemoveCardModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    const loadTenantData = async () => {
      try {
        if (!currentUser || currentUser.role !== 'tenant') {
          showToast('No tenant membership found', 'error');
          navigate('/login');
          return;
        }

        const membershipId = currentUser.id;
        const [membership, ledgerSummary] = await Promise.all([
          getTenantMembership(membershipId),
          fetchLedgerBalance(membershipId),
        ]);
        setTenantData(membership);
        setOutstandingBalance(Math.max(ledgerSummary.currentBalance || 0, 0));
      } catch (err: any) {
        showToast(err.message || 'Failed to load tenant data', 'error');
        navigate('/tenant/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadTenantData();
  }, [navigate, showToast, currentUser]);

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

      const membershipId = tenantData!.id;
      const [membership, ledgerSummary] = await Promise.all([
        getTenantMembership(membershipId),
        fetchLedgerBalance(membershipId),
      ]);
      setTenantData(membership);
      setOutstandingBalance(Math.max(ledgerSummary.currentBalance || 0, 0));
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

      const membershipId = tenantData!.id;
      const [membership, ledgerSummary] = await Promise.all([
        getTenantMembership(membershipId),
        fetchLedgerBalance(membershipId),
      ]);
      setTenantData(membership);
      setOutstandingBalance(Math.max(ledgerSummary.currentBalance || 0, 0));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to disable autopay', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveCard = async () => {
    setActionLoading(true);
    try {
      const membershipId = tenantData!.id;
      await api.delete(`/api/stripe/payment-method?membershipId=${membershipId}`);

      showToast('Payment method removed successfully', 'success');
      setShowRemoveCardModal(false);

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
  const ledgerAmount = outstandingBalance;
  const { totalAmount } = calculateProcessingFee(ledgerAmount, tenantData.paymentMethodType || 'card');

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

        {tenantData.defaultPaymentMethodId && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Autopay Settings</h2>
            </CardHeader>
            <CardContent>
              {tenantData.autopayEnabled ? (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-green-900">Autopay Active</span>
                    </div>
                    <p className="text-sm text-green-800">
                      Your posted ledger balance, including rent, fees, and adjustments, will be automatically charged on the {unit.dueDay}
                      {unit.dueDay === 1 ? 'st' : unit.dueDay === 2 ? 'nd' : unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Next Scheduled Charge</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm text-gray-600">Date</span>
                        <span className="font-medium">{getNextChargeDate()}</span>
                      </div>
                      <FeeBreakdown
                        rentAmount={ledgerAmount}
                        paymentMethodType={tenantData.paymentMethodType || undefined}
                      />
                    </div>
                  </div>

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
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="font-medium text-gray-900">Autopay Inactive</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Enable Autopay to charge posted ledger balances, including rent, fees, and adjustments, on the {unit.dueDay}
                      {unit.dueDay === 1 ? 'st' : unit.dueDay === 2 ? 'nd' : unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Current Ledger Balance</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <FeeBreakdown
                        rentAmount={ledgerAmount}
                        paymentMethodType={tenantData.paymentMethodType || undefined}
                      />
                      {ledgerAmount <= 0 && (
                        <p className="mt-3 text-sm text-gray-600">
                          No balance is currently posted. Autopay will charge future posted ledger balances on the due date.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">
                        I authorize RentBeam to automatically charge my payment method for
                        {ledgerAmount > 0 ? ` ${formatCurrency(totalAmount)} currently owed` : ' future posted ledger balances, including rent, fees, and adjustments'} on the {unit.dueDay}
                        {unit.dueDay === 1 ? 'st' : unit.dueDay === 2 ? 'nd' : unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                        I understand I can disable autopay at any time.
                      </span>
                    </label>
                  </div>

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
