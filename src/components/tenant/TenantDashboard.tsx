import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PaymentHistoryList } from '../ui/PaymentHistoryList';
import { formatCurrency, getPaymentStatus, getNextChargeDate, getCurrentRentMonth, formatRentMonth } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const TenantDashboard: React.FC = () => {
  const { currentUser, tenants, units, properties, landlords, payments, updateState } =
    useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showDisableModal, setShowDisableModal] = useState(false);

  const tenantData = useMemo(() => {
    const tenant = tenants.find((t) => t.id === currentUser?.id);
    if (!tenant) return null;

    const unit = units.find((u) => u.id === tenant.unitId);
    const property = properties.find((p) => p.id === unit?.propertyId);
    const landlord = landlords.find((l) => l.id === tenant.landlordId);
    const status = getPaymentStatus(tenant, payments, unit);
    const tenantPayments = payments.filter((p) => p.tenantId === tenant.id);
    const currentRentMonth = getCurrentRentMonth(unit);
    const rentMonthLabel = formatRentMonth(currentRentMonth);

    return { tenant, unit, property, landlord, status, payments: tenantPayments, rentMonthLabel };
  }, [currentUser, tenants, units, properties, landlords, payments]);

  if (!tenantData) {
    return (
      <AppShell title="Dashboard">
        <div className="text-center py-12">
          <p className="text-gray-500">Tenant data not found</p>
        </div>
      </AppShell>
    );
  }

  const { tenant, unit, property, landlord, status, payments: tenantPayments, rentMonthLabel } =
    tenantData;

  const handleDisableAutopay = () => {
    const updatedTenants = tenants.map((t) =>
      t.id === tenant.id
        ? { ...t, autopayEnabled: false, paymentMethodLabel: undefined }
        : t
    );

    updateState({ tenants: updatedTenants });
    showToast('Autopay disabled');
    setShowDisableModal(false);
  };

  return (
    <AppShell title="Dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{rentMonthLabel} Rent</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {property?.name} - {unit?.name}
                </p>
              </div>
              <Badge variant={status}>{status.toUpperCase()}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm text-gray-500">Monthly Rent</label>
                <p className="text-2xl font-semibold">
                  {formatCurrency(tenant.rentAmount)}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Due Date</label>
                <p className="text-2xl font-semibold">Day {unit?.dueDay ?? 1}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="text-sm text-gray-500">Landlord</label>
              <p className="font-medium">{landlord?.name}</p>
            </div>
          </CardContent>
        </Card>

        {/* Autopay Status */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Autopay Status</h3>
          </CardHeader>
          <CardContent>
            {tenant.autopayEnabled ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-600 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-medium text-green-900">Enabled</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Payment Method</label>
                  <p className="font-medium">{tenant.paymentMethodLabel}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Next Charge</label>
                  <p className="font-medium">{getNextChargeDate(unit?.dueDay ?? 1)}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDisableModal(true)}
                  className="w-full"
                >
                  Disable Autopay
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 text-sm mb-4">
                  Autopay is not enabled. Set up autopay for convenient automatic
                  payments.
                </p>
                <Button onClick={() => navigate('/tenant/autopay')} className="w-full">
                  Enable Autopay
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Options */}
        {!tenant.autopayEnabled && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <h3 className="text-lg font-semibold">Pay Rent</h3>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border-2 border-primary-200 rounded-lg p-4 bg-primary-50">
                  <h4 className="font-semibold mb-2">Set up Autopay (Recommended)</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Pay automatically with your card each month. Cancel anytime.
                  </p>
                  <Button onClick={() => navigate('/tenant/autopay')}>
                    Set Up Autopay
                  </Button>
                </div>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold mb-2">Manual Payment (Interac)</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Send Interac e-Transfer to your landlord outside the app. Your
                    landlord will mark it as received.
                  </p>
                  <p className="text-xs text-gray-500">
                    Contact your landlord for payment details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {tenant.autopayEnabled && (
          <Card className="lg:col-span-3">
            <CardContent className="text-center py-8">
              <div className="flex items-center justify-center mb-3">
                <svg
                  className="h-12 w-12 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold mb-2">No Action Needed</h4>
              <p className="text-gray-600">
                Autopay will run on {getNextChargeDate(unit?.dueDay ?? 1)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <h3 className="text-lg font-semibold">Payment History</h3>
          </CardHeader>
          <CardContent>
            <PaymentHistoryList 
              payments={tenantPayments} 
              dueDay={unit?.dueDay ?? 1}
              gracePeriodDays={tenantData.unit?.gracePeriodDays ?? 0}
            />
          </CardContent>
        </Card>
      </div>

      {/* Disable Autopay Confirmation Modal */}
      {showDisableModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowDisableModal(false)}
          title="Disable Autopay"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to disable autopay? You'll need to pay rent manually
              each month.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowDisableModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDisableAutopay}
                className="flex-1"
              >
                Disable Autopay
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
};
