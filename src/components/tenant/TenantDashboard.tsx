import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import stripePromise from '../../utils/stripeLoader';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PaymentHistoryList } from '../ui/PaymentHistoryList';
import { PayNowModal } from './PayNowModal';
import { formatCurrency, getPaymentStatus } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { getCurrentUser, getTenantMembership, TenantMembershipDetails, fetchPayments } from '../../services/api';
import api from '../../services/api';
import { Payment, PaymentStatus, TenantMembership } from '../../types';

export const TenantDashboard: React.FC = () => {
  const { showToast } = useToast();
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
        const profile = await getCurrentUser();
        
        if (!profile.memberships.tenants || profile.memberships.tenants.length === 0) {
          showToast('No tenant membership found', 'error');
          navigate('/login');
          return;
        }

        const membershipId = profile.memberships.tenants[0].id;
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
  }, [navigate, showToast]);

  const handlePaymentSuccess = async () => {
    try {
      const profile = await getCurrentUser();
      const membershipId = profile.memberships.tenants[0].id;
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
      <div className="space-y-6">
        {!tenantData.defaultPaymentMethodId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💳</span>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">Add a payment method</h4>
                <p className="text-sm text-blue-800 mb-3">
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

        <div className="mt-6">
          <Button
            className="w-full"
            size="lg"
            onClick={handlePayNowClick}
            disabled={!tenantData.defaultPaymentMethodId || paymentStatus === 'paid'}
          >
            {!tenantData.defaultPaymentMethodId 
              ? 'Add Payment Method to Pay'
              : paymentStatus === 'paid'
              ? `Paid - ${formatCurrency(unit.rentAmount)}`
              : `Pay Now - ${formatCurrency(unit.rentAmount)}`}
          </Button>
          {tenantData.defaultPaymentMethodId && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Using {tenantData.paymentMethodLabel}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">Current Rent</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {property.name} - Unit {unit.name}
                  </p>
                </div>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm text-gray-500">Monthly Rent</label>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(unit.rentAmount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Due Date</label>
                  <p className="text-2xl font-semibold">Day {unit.dueDay}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Property Address</span>
                  <span className="font-medium">{property.address}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Landlord</span>
                  <span className="font-medium">{landlord.user.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Move-in Date</span>
                  <span className="font-medium">
                    {new Date(tenantData.moveInDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Autopay</h3>
            </CardHeader>
            <CardContent>
              {tenantData.autopayEnabled ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700">Active</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Rent will be automatically charged on the {unit.dueDay}
                    {unit.dueDay === 1 ? 'st' : unit.dueDay === 2 ? 'nd' : unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Payment method: {tenantData.paymentMethodLabel || 'Card'}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => setShowDisableModal(true)}
                    className="w-full"
                  >
                    Disable Autopay
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Inactive</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Enable autopay to automatically pay your rent each month.
                  </p>
                  <Button onClick={() => navigate('/tenant/autopay')} className="w-full">
                    Enable Autopay
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <h3 className="text-lg font-semibold">Payment History</h3>
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
        <p className="text-gray-600 mb-6">
          Are you sure you want to disable autopay? You'll need to manually pay your rent
          each month.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowDisableModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleDisableAutopay}>Disable Autopay</Button>
        </div>
      </Modal>
    </AppShell>
  );
};
