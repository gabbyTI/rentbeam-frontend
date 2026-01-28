import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import stripePromise from '../../utils/stripeLoader';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PaymentHistoryList } from '../ui/PaymentHistoryList';
import { TenantMetricCard } from '../ui/TenantMetricCard';
import { PaymentTimeline } from '../ui/PaymentTimeline';
import { PayNowModal } from './PayNowModal';
import { formatCurrency, getPaymentStatus } from '../../utils/helpers';
import { calculateTenantPaymentSummary, calculateYearToDateSummary, generatePaymentTimeline } from '../../utils/tenantAnalytics';
import { useToast } from '../../context/ToastContext';
import { getTenantMembership, TenantMembershipDetails, fetchPayments } from '../../services/api';
import api from '../../services/api';
import { Payment, PaymentStatus, TenantMembership } from '../../types';

export const TenantDashboard: React.FC = () => {
  const { showToast } = useToast();
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showPayNowModal, setShowPayNowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState<TenantMembershipDetails | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');

  useEffect(() => {
    const loadTenantData = async () => {
      try {
        // Use the selected tenant membership ID from currentUser context
        if (!currentUser || currentUser.role !== 'tenant') {
          showToast('No tenant access', 'error');
          navigate('/login');
          return;
        }

        const membershipId = currentUser.id; // This is the selected tenant membership ID
        const membership = await getTenantMembership(membershipId);
        setTenantData(membership);

        const allPayments = await fetchPayments();
        const tenantPayments = allPayments.filter(p => p.tenantMembershipId === membershipId);
        setPayments(tenantPayments);

        const status = getPaymentStatus(
          { id: membership.id } as TenantMembership,
          tenantPayments,
          { dueDay: membership.unit.dueDay, gracePeriodDays: membership.unit.gracePeriodDays } as any
        );
        setPaymentStatus(status);
      } catch (err: any) {
        showToast(err.message || 'Failed to load tenant data', 'error');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    loadTenantData();
  }, [navigate, showToast, currentUser]);

  // Calculate analytics using useMemo for performance
  const paymentSummary = useMemo(() => {
    if (!tenantData || payments.length === 0) return null;
    return calculateTenantPaymentSummary(
      payments,
      tenantData.unit.dueDay,
      tenantData.unit.gracePeriodDays
    );
  }, [payments, tenantData]);

  const ytdSummary = useMemo(() => {
    if (payments.length === 0) return null;
    return calculateYearToDateSummary(payments);
  }, [payments]);

  const paymentTimeline = useMemo(() => {
    if (!tenantData || payments.length === 0) return [];
    return generatePaymentTimeline(
      payments,
      tenantData.unit.dueDay,
      tenantData.unit.gracePeriodDays,
      tenantData.moveInDate
    );
  }, [payments, tenantData]);

  const handlePaymentSuccess = async () => {
    try {
      if (!currentUser || currentUser.role !== 'tenant') return;

      const membershipId = currentUser.id; // Use selected tenant membership ID
      const membership = await getTenantMembership(membershipId);
      setTenantData(membership);

      const allPayments = await fetchPayments();
      const tenantPayments = allPayments.filter(p => p.tenantMembershipId === membershipId);
      setPayments(tenantPayments);

      const status = getPaymentStatus(
        { id: membership.id } as TenantMembership,
        tenantPayments,
        { dueDay: membership.unit.dueDay, gracePeriodDays: membership.unit.gracePeriodDays } as any
      );
      setPaymentStatus(status);
    } catch (err: any) {
      showToast(err.message || 'Failed to reload data', 'error');
    }
  };

  const handlePayNowClick = () => {
    if (!tenantData?.defaultPaymentMethodId) {
      showToast('Please add a payment method first', 'error');
      navigate('/tenant/payment-method');
      return;
    }
    setShowPayNowModal(true);
  };

  const handleDisableAutopay = async () => {
    if (!tenantData) return;

    setLoading(true);
    try {
      await api.patch(`/api/tenants/${tenantData.id}/autopay`, {
        autopayEnabled: false,
      });

      showToast('Autopay disabled', 'success');
      setShowDisableModal(false);

      // Refresh data
      await handlePaymentSuccess();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to disable autopay';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <AppShell title="Dashboard">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (!tenantData) {
    return (
      <AppShell title="Dashboard">
        <div className="text-center py-12">
          <p className="text-gray-500">Tenant data not found</p>
        </div>
      </AppShell>
    );
  }

  const { unit } = tenantData;
  const property = unit.property;
  const landlord = unit.property.landlord;
  const acceptsOnlinePayments = property.acceptOnlinePayments !== false; // Default to true if undefined

  const today = new Date();
  const dueDay = unit.dueDay;
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let dueDate = new Date(currentYear, currentMonth, dueDay);
  if (today.getDate() > dueDay) {
    dueDate = new Date(currentYear, currentMonth + 1, dueDay);
  }

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const gracePeriodDays = unit.gracePeriodDays || 0;
  const lateDays = today.getDate() - dueDay;
  const graceDaysRemaining = gracePeriodDays - lateDays;

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'paid':
        return (
          <Badge variant="accepted">
            ✓ Paid for {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="current">
            Due in {diffDays} {diffDays === 1 ? 'day' : 'days'}
          </Badge>
        );
      case 'due':
        return (
          <Badge variant="pending">
            Due Today ({graceDaysRemaining} {graceDaysRemaining === 1 ? 'day' : 'days'} grace remaining)
          </Badge>
        );
      case 'late':
        return (
          <Badge variant="past">
            Overdue by {Math.abs(graceDaysRemaining)} {Math.abs(graceDaysRemaining) === 1 ? 'day' : 'days'}
          </Badge>
        );
      default:
        return <Badge variant="current">Current</Badge>;
    }
  };

  return (
    <AppShell title="Dashboard">
      <div className="space-y-4 sm:space-y-6">{acceptsOnlinePayments && !tenantData.defaultPaymentMethodId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="text-xl sm:text-2xl">💳</span>
            <div className="flex-1">
              <h4 className="text-sm sm:text-base font-medium text-blue-900 mb-1">Add a payment method</h4>
              <p className="text-xs sm:text-sm text-blue-800 mb-3">
                Set up your card to pay rent online with ease. Processing fees apply (2.9% + $0.30).
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/tenant/payment-method')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Payment Method
              </Button>
            </div>
          </div>
        </div>
      )}

        {!acceptsOnlinePayments && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl">💵</span>
              <div className="flex-1">
                <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-1">Manual Payments</h4>
                <p className="text-xs sm:text-sm text-gray-700">
                  Payments are arranged directly with your landlord. Online card payments are not available for this property.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Summary Analytics */}
        {paymentSummary && payments.length > 0 && (
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Payment Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <TenantMetricCard
                title="On-Time Rate"
                value={`${paymentSummary.onTimeRate}%`}
                subtitle={`${paymentSummary.onTimePayments} of ${paymentSummary.totalPayments} payments`}
                variant={paymentSummary.onTimeRate >= 90 ? 'success' : paymentSummary.onTimeRate >= 70 ? 'warning' : 'default'}
              />
              <TenantMetricCard
                title="Payment Streak"
                value={paymentSummary.currentStreak.toString()}
                subtitle={paymentSummary.currentStreak === 1 ? "month on time" : "months on time"}
                variant={paymentSummary.currentStreak >= 3 ? 'success' : 'info'}
              />
              <TenantMetricCard
                title="Paid This Year"
                value={`$${paymentSummary.totalPaidThisYear.toLocaleString()}`}
                subtitle="Total rent paid"
                variant="default"
              />
              <TenantMetricCard
                title="Fees This Year"
                value={`$${paymentSummary.totalFeesThisYear.toFixed(2)}`}
                subtitle="Processing fees"
                variant="info"
              />
            </div>
          </div>
        )}

        {/* Payment Timeline */}
        {paymentTimeline.length > 0 && (
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Payment History</h3>
            <PaymentTimeline timeline={paymentTimeline} />
          </div>
        )}

        {/* Year-to-Date Cost Summary */}
        {ytdSummary && ytdSummary.paymentsCount > 0 && (
          <Card>
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Year-to-Date Summary</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Rent</p>
                  <p className="text-lg sm:text-xl font-semibold text-gray-900">${ytdSummary.totalRent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Fees</p>
                  <p className="text-lg sm:text-xl font-semibold text-gray-900">${ytdSummary.totalFees.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Paid</p>
                  <p className="text-lg sm:text-xl font-semibold text-gray-900">${ytdSummary.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Monthly Average</p>
                  <p className="text-lg sm:text-xl font-semibold text-gray-900">${ytdSummary.monthlyAverage.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                <p className="text-xs sm:text-sm text-gray-600">
                  Based on {ytdSummary.paymentsCount} {ytdSummary.paymentsCount === 1 ? 'payment' : 'payments'} in {new Date().getFullYear()}
                </p>
              </div>
            </div>
          </Card>
        )}

        {acceptsOnlinePayments && (
          <div className="mt-4 sm:mt-6">
            <Button
              className="w-full text-sm sm:text-base"
              size="lg"
              onClick={handlePayNowClick}
              disabled={!tenantData.defaultPaymentMethodId || paymentStatus === 'paid'}
            >
              <span className="hidden sm:inline">
                {!tenantData.defaultPaymentMethodId
                  ? 'Add Payment Method to Pay'
                  : paymentStatus === 'paid'
                    ? `Paid - ${formatCurrency(unit.rentAmount)}`
                    : `Pay Now - ${formatCurrency(unit.rentAmount)}`}
              </span>
              <span className="sm:hidden">
                {!tenantData.defaultPaymentMethodId
                  ? 'Add Payment Method'
                  : paymentStatus === 'paid'
                    ? `Paid - ${formatCurrency(unit.rentAmount)}`
                    : `Pay ${formatCurrency(unit.rentAmount)}`}
              </span>
            </Button>
            {tenantData.defaultPaymentMethodId && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Using {tenantData.paymentMethodLabel}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className={acceptsOnlinePayments ? "lg:col-span-2" : "lg:col-span-3"}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold">Current Rent</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {property.name} - Unit {unit.name}
                  </p>
                </div>
                <div>
                  {getStatusBadge()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Monthly Rent</label>
                  <p className="text-xl sm:text-2xl font-semibold">
                    {formatCurrency(unit.rentAmount)}
                  </p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Due Date</label>
                  <p className="text-xl sm:text-2xl font-semibold">Day {unit.dueDay}</p>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
                  <span className="text-gray-500">Property Address</span>
                  <span className="font-medium text-right sm:text-left">{property.address}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
                  <span className="text-gray-500">Landlord</span>
                  <span className="font-medium text-right sm:text-left">{landlord.user.displayName || landlord.user.name}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
                  <span className="text-gray-500">Move-in Date</span>
                  <span className="font-medium text-right sm:text-left">
                    {new Date(tenantData.moveInDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {acceptsOnlinePayments && (
            <Card>
              <CardHeader>
                <h3 className="text-base sm:text-lg font-semibold">Autopay</h3>
              </CardHeader>
              <CardContent>
                {tenantData.autopayEnabled ? (
                  <>
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs sm:text-sm font-medium text-green-700">Active</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                      Rent will be automatically charged on the {unit.dueDay}
                      {unit.dueDay === 1 ? 'st' : unit.dueDay === 2 ? 'nd' : unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                      Payment method: {tenantData.paymentMethodLabel || 'Card'}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowDisableModal(true)}
                      className="w-full"
                    >
                      <span className="hidden sm:inline">Disable Autopay</span>
                      <span className="sm:hidden">Disable</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Inactive</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                      Enable autopay to automatically pay your rent each month.
                    </p>
                    <Button size="sm" onClick={() => navigate('/tenant/settings')} className="w-full">
                      <span className="hidden sm:inline">Enable Autopay</span>
                      <span className="sm:hidden">Enable</span>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="lg:col-span-3">
            <CardHeader>
              <h3 className="text-base sm:text-lg font-semibold">Payment History</h3>
            </CardHeader>
            <CardContent>
              <PaymentHistoryList
                payments={payments}
                dueDay={unit.dueDay}
                gracePeriodDays={unit.gracePeriodDays}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {tenantData.defaultPaymentMethodId && (
        <Elements stripe={stripePromise}>
          <PayNowModal
            isOpen={showPayNowModal}
            onClose={() => setShowPayNowModal(false)}
            onSuccess={handlePaymentSuccess}
            rentAmount={Number(unit.rentAmount)}
            paymentMethodLabel={tenantData.paymentMethodLabel || 'Card'}
            month={getCurrentMonth()}
          />
        </Elements>
      )}

      <Modal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        title="Disable Autopay"
      >
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          Are you sure you want to disable autopay? You'll need to manually pay your rent
          each month.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button variant="secondary" size="sm" onClick={() => setShowDisableModal(false)} className="flex-1">
            Cancel
          </Button>
          <Button size="sm" onClick={handleDisableAutopay} className="flex-1">
            <span className="hidden sm:inline">Disable Autopay</span>
            <span className="sm:hidden">Disable</span>
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
};
