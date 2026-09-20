import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import stripePromise from '../../utils/stripeLoader';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { LedgerStatement } from '../ui/LedgerStatement';
import { PayNowModal } from './PayNowModal';
import { RentStatusCard } from './RentStatusCard';
import { formatCurrency } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { getTenantMembership, TenantMembershipDetails, fetchLedgerBalance, fetchLedgerStatement } from '../../services/api';
import api from '../../services/api';
import { LedgerEntry, PaymentStatus } from '../../types';

const toMonthString = (isoDate: string) => {
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getPaymentStatusFromLedger = (
  entries: LedgerEntry[],
  currentBalance: number,
  dueDay: number,
  gracePeriodDays: number,
  moveInDate: string
): PaymentStatus => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
  const graceDueDate = new Date(dueDate);
  graceDueDate.setDate(graceDueDate.getDate() + gracePeriodDays);

  const paymentWindowOpenDate = new Date(dueDate);
  paymentWindowOpenDate.setDate(dueDate.getDate() - 5);
  const moveIn = new Date(moveInDate);

  const monthEntries = entries.filter((e) => e.status === 'POSTED' && toMonthString(e.effectiveDate) === currentMonth);
  const monthCharges = monthEntries
    .filter((e) => e.type === 'CHARGE')
    .reduce((sum, e) => sum + Number(e.chargeAmount || 0), 0);
  const monthReductions = monthEntries
    .filter((e) => e.type === 'PAYMENT' || e.type === 'CREDIT')
    .reduce((sum, e) => sum + Number(e.paymentAmount || 0), 0);
  const hasPostedCharges = entries.some((e) => e.status === 'POSTED' && e.type === 'CHARGE');

  if (monthCharges > 0 && monthReductions >= monthCharges) return 'paid';
  if (hasPostedCharges && currentBalance <= 0.005) return 'paid';
  if (moveIn > paymentWindowOpenDate) return 'pending';
  if (now < dueDate) return 'pending';
  if (now <= graceDueDate) return 'due';
  return 'late';
};

export const TenantDashboard: React.FC = () => {
  const { showToast } = useToast();
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showPayNowModal, setShowPayNowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState<TenantMembershipDetails | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [currentBalance, setCurrentBalance] = useState(0);

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

        const [ledgerEntries, ledgerSummary] = await Promise.all([
          fetchLedgerStatement(membershipId),
          fetchLedgerBalance(membershipId),
        ]);

        setLedgerEntries(ledgerEntries);
        setCurrentBalance(ledgerSummary.currentBalance);

        const status = getPaymentStatusFromLedger(
          ledgerEntries,
          ledgerSummary.currentBalance,
          membership.unit.dueDay,
          membership.unit.gracePeriodDays,
          membership.moveInDate
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
  }, [navigate, showToast, currentUser, location.key]); // location.key changes on each navigation

  const handlePaymentSuccess = async () => {
    try {
      if (!currentUser || currentUser.role !== 'tenant') return;

      const membershipId = currentUser.id; // Use selected tenant membership ID
      const membership = await getTenantMembership(membershipId);
      setTenantData(membership);

      const [ledgerEntries, ledgerSummary] = await Promise.all([
        fetchLedgerStatement(membershipId),
        fetchLedgerBalance(membershipId),
      ]);

      setLedgerEntries(ledgerEntries);
      setCurrentBalance(ledgerSummary.currentBalance);

      const status = getPaymentStatusFromLedger(
        ledgerEntries,
        ledgerSummary.currentBalance,
        membership.unit.dueDay,
        membership.unit.gracePeriodDays,
        membership.moveInDate
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
        <div className="py-12 text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (!tenantData) {
    return (
      <AppShell title="Dashboard">
        <div className="py-12 text-center">
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



  return (
    <AppShell title="Dashboard">
      <div className="space-y-4 sm:space-y-6">{acceptsOnlinePayments && !tenantData.defaultPaymentMethodId && (
        <div className="p-3 border border-blue-200 rounded-lg bg-blue-50 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="text-xl sm:text-2xl">💳</span>
            <div className="flex-1">
              <h4 className="mb-1 text-sm font-medium text-blue-900 sm:text-base">Add a payment method</h4>
              <p className="mb-3 text-xs text-blue-800 sm:text-sm">
                Set up your card or bank account to pay rent online with ease. Processing fees apply.
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
          <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl">💵</span>
              <div className="flex-1">
                <h4 className="mb-1 text-sm font-medium text-gray-900 sm:text-base">Manual Payments</h4>
                <p className="text-xs text-gray-700 sm:text-sm">
                  Payments are arranged directly with your landlord. Online card payments are not available for this property.
                </p>
              </div>
            </div>
          </div>
        )}

        {acceptsOnlinePayments && tenantData.defaultPaymentMethodId && (
          <div className="mt-4 sm:mt-6">
            <Button
              className="w-full text-sm sm:text-base"
              size="lg"
              onClick={handlePayNowClick}
              disabled={paymentStatus === 'paid'}
            >
              <span className="hidden sm:inline">
                {paymentStatus === 'paid'
                    ? currentBalance < 0
                      ? `Credit ${formatCurrency(Math.abs(currentBalance))}`
                      : `Paid - ${formatCurrency(unit.rentAmount)}`
                    : `Pay Now - ${formatCurrency(unit.rentAmount)}`}
              </span>
              <span className="sm:hidden">
                {paymentStatus === 'paid'
                    ? currentBalance < 0
                      ? `Credit ${formatCurrency(Math.abs(currentBalance))}`
                      : `Paid - ${formatCurrency(unit.rentAmount)}`
                    : `Pay ${formatCurrency(unit.rentAmount)}`}
              </span>
            </Button>
            <p className="mt-2 text-xs text-center text-gray-500">
              Using {tenantData.paymentMethodLabel}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:gap-6">
          <div className={acceptsOnlinePayments ? "lg:col-span-2" : "lg:col-span-3"}>
            <RentStatusCard
              paymentStatus={paymentStatus}
              rentAmount={Number(unit.rentAmount)}
              dueDay={unit.dueDay}
              gracePeriodDays={gracePeriodDays}
              propertyName={property.name}
              unitName={unit.name}
              propertyAddress={property.address}
              landlordName={landlord.user.displayName || landlord.user.name}
              moveInDate={tenantData.moveInDate}
              paidMonthName={
                ledgerEntries.find(e => e.status === 'POSTED' && e.type === 'PAYMENT' && Number(e.paymentAmount || 0) > 0)
                  ? new Date(
                    Number(toMonthString(ledgerEntries.find(e => e.status === 'POSTED' && e.type === 'PAYMENT' && Number(e.paymentAmount || 0) > 0)!.effectiveDate).split('-')[0]),
                    Number(toMonthString(ledgerEntries.find(e => e.status === 'POSTED' && e.type === 'PAYMENT' && Number(e.paymentAmount || 0) > 0)!.effectiveDate).split('-')[1]) - 1
                  ).toLocaleString('default', { month: 'long' })
                  : undefined
              }
              daysUntilDue={diffDays}
              daysGraceRemaining={graceDaysRemaining}
              daysOverdue={Math.abs(graceDaysRemaining)}
              autopayEnabled={tenantData.autopayEnabled}
            />
          </div>

          {acceptsOnlinePayments && (
            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold sm:text-lg">Autopay</h3>
              </CardHeader>
              <CardContent>
                {tenantData.autopayEnabled ? (
                  <>
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium text-green-700 sm:text-sm">Active</span>
                    </div>
                    <p className="mb-3 text-xs text-gray-600 sm:text-sm sm:mb-4">
                      Rent will be automatically charged on the {unit.dueDay}
                      {unit.dueDay === 1 ? 'st' : unit.dueDay === 2 ? 'nd' : unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                    </p>
                    <p className="mb-3 text-xs text-gray-500 sm:text-sm sm:mb-4">
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
                      <span className="text-xs font-medium text-gray-700 sm:text-sm">Inactive</span>
                    </div>
                    <p className="mb-3 text-xs text-gray-600 sm:text-sm sm:mb-4">
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

          {/* Resident Ledger — tenant view */}
          <div className="lg:col-span-3">
            <LedgerStatement
              tenantMembershipId={tenantData.id}
              isLandlord={false}
            />
          </div>
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
            membershipId={tenantData.id}
          />
        </Elements>
      )}

      <Modal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        title="Disable Autopay"
      >
        <p className="mb-4 text-sm text-gray-600 sm:text-base sm:mb-6">
          Are you sure you want to disable autopay? You'll need to manually pay your rent
          each month.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
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
