import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { useDashboardAnalytics } from '../../hooks/useDashboardAnalytics';
import { AppShell } from '../ui/AppShell';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MetricCard } from '../ui/MetricCard';
import { ActivityFeed } from '../ui/ActivityFeed';
import { formatCurrency } from '../../utils/helpers';
import { getPaymentStatus, getCurrentRentMonth, formatRentMonth, isPaymentWindowOpen } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';

export const LandlordDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, tenants, properties, units, payments, loading } = useApp();
  const api = useApi();
  const { showToast } = useToast();
  const { analytics, loading: analyticsLoading } = useDashboardAnalytics();
  const [markPaidModal, setMarkPaidModal] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentNote, setPaymentNote] = useState('Paid via Interac e-Transfer');

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 rounded-full border-t-transparent animate-spin border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const landlordTenants = useMemo(() => {
    return tenants
      .filter((t) => t.landlordId === currentUser?.id && t.status === 'ACTIVE')
      .map((tenant) => {
        const unit = units.find((u) => u.id === tenant.unitId);
        const property = properties.find((p) => p.id === unit?.propertyId);
        const status = getPaymentStatus(tenant, payments, unit);
        return {
          ...tenant,
          // Flatten user fields for backward compatibility
          email: tenant.user.email,
          name: tenant.user.name,
          phone: tenant.user.phone,
          unit,
          property,
          status,
        };
      });
  }, [tenants, units, properties, payments, currentUser]);

  const handleMarkAsPaid = (tenantId: string) => {
    setMarkPaidModal(tenantId);
    const tenant = landlordTenants.find((t) => t.id === tenantId);
    if (tenant) {
      setPaymentAmount(tenant.unit!.rentAmount.toString());
    }
  };

  const confirmMarkAsPaid = async () => {
    if (!markPaidModal || !paymentAmount) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      const tenant = landlordTenants.find((t) => t.id === markPaidModal);
      if (!tenant || !tenant.unit) {
        showToast('Tenant or unit not found', 'error');
        return;
      }

      const paymentData = {
        tenantMembershipId: markPaidModal,
        amount: parseFloat(paymentAmount),
        date: paymentDate,
        method: 'MANUAL' as const,
        month: getCurrentRentMonth(tenant.unit),
        note: paymentNote || undefined,
      };

      await api.createPayment(paymentData);

      showToast('Payment marked as paid');
      setMarkPaidModal(null);
      setPaymentAmount('');
      setPaymentNote('Paid via Interac e-Transfer');
    } catch (error: any) {
      showToast(error.message || 'Failed to record payment', 'error');
    }
  };



  const groupedByProperty = useMemo(() => {
    const groups: Record<string, typeof landlordTenants> = {};
    landlordTenants.forEach((tenant) => {
      const propertyName = tenant.property?.name || 'Unknown Property';
      if (!groups[propertyName]) {
        groups[propertyName] = [];
      }
      groups[propertyName].push(tenant);
    });
    return groups;
  }, [landlordTenants]);

  return (
    <AppShell title="Dashboard">
      {/* Analytics Section */}
      {analyticsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 rounded-full border-t-transparent animate-spin border-primary-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading analytics...</p>
          </div>
        </div>
      ) : analytics ? (
        <>
          {/* Top Row - Key Metrics */}
          <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-3">
            <MetricCard
              title="Occupancy Rate"
              value={analytics.occupancy.total === 0 ? '—' : `${analytics.occupancy.rate.toFixed(1)}%`}
              subValue={`${analytics.occupancy.occupied}/${analytics.occupancy.total} units`}
              icon="🏠"
              variant={analytics.occupancy.total === 0 ? 'neutral' : analytics.occupancy.rate >= 90 ? 'success' : analytics.occupancy.rate >= 70 ? 'warning' : 'danger'}
              size="large"
              progressBar={{ value: analytics.occupancy.occupied, max: analytics.occupancy.total }}
              footer={
                analytics.occupancy.total === 0 ? (
                  <span className="text-sm text-gray-600">Add your first property to get started</span>
                ) : analytics.occupancy.vacant > 0 ? (
                  <span className="text-sm text-gray-600">
                    {analytics.occupancy.vacant} vacant unit{analytics.occupancy.vacant !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-sm text-green-600">✓ Fully occupied</span>
                )
              }
            />
            <MetricCard
              title="Monthly Revenue"
              value={formatCurrency(analytics.revenue.collected)}
              subValue={`of ${formatCurrency(analytics.revenue.expected)} expected`}
              icon="💰"
              variant={analytics.revenue.rate >= 90 ? 'success' : analytics.revenue.rate >= 70 ? 'warning' : 'danger'}
              size="large"
              progressBar={{ value: analytics.revenue.collected, max: analytics.revenue.expected }}
              footer={
                <span className="text-sm text-gray-600">
                  {analytics.revenue.rate.toFixed(1)}% collection rate
                </span>
              }
            />
            <MetricCard
              title="Outstanding Balance"
              value={formatCurrency(analytics.outstanding.amount)}
              subValue={`${analytics.outstanding.tenantCount} tenant${analytics.outstanding.tenantCount !== 1 ? 's' : ''} overdue`}
              icon="⚠️"
              variant={analytics.outstanding.amount === 0 ? 'success' : analytics.outstanding.amount < 1000 ? 'warning' : 'danger'}
              size="large"
              footer={
                analytics.outstanding.amount === 0 ? (
                  <span className="text-sm text-green-600">✓ No overdue payments</span>
                ) : (
                  <span className="text-sm text-red-600">Requires attention</span>
                )
              }
            />
          </div>

          {/* Payment Status Bar */}
          <div className="p-4 mb-6 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6">
            <h3 className="mb-4 text-base font-semibold sm:text-lg">Payment Status</h3>
            <div className="grid grid-cols-2 gap-3 mb-4 sm:gap-4 md:grid-cols-4">
              <div className="p-2 text-center">
                <div className="text-2xl font-bold text-green-600 sm:text-3xl">
                  {analytics.paymentStatus.paid}
                </div>
                <div className="mt-1 text-xs text-gray-600 sm:text-sm">Paid</div>
              </div>
              <div className="p-2 text-center">
                <div className="text-2xl font-bold text-blue-600 sm:text-3xl">
                  {analytics.paymentStatus.pending}
                </div>
                <div className="mt-1 text-xs text-gray-600 sm:text-sm">Pending</div>
              </div>
              <div className="p-2 text-center">
                <div className="text-2xl font-bold text-yellow-600 sm:text-3xl">
                  {analytics.paymentStatus.late}
                </div>
                <div className="mt-1 text-xs text-gray-600 sm:text-sm">Late</div>
              </div>
              <div className="p-2 text-center">
                <div className="text-2xl font-bold text-red-600 sm:text-3xl">
                  {analytics.paymentStatus.unpaid}
                </div>
                <div className="mt-1 text-xs text-gray-600 sm:text-sm">Unpaid</div>
              </div>
            </div>
          </div>

          {/* Bottom Row - Tenants & Recent Activity */}
          <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2">
            <MetricCard
              title="Tenants"
              value={analytics.activeTenants.total.toString()}
              subValue={`${analytics.activeTenants.autopayEnabled} with autopay enabled`}
              icon="👥"
              variant="neutral"
              size="medium"
              footer={
                analytics.activeTenants.pendingInvites > 0 ? (
                  <span className="text-sm text-gray-600">
                    {analytics.activeTenants.pendingInvites} pending invite{analytics.activeTenants.pendingInvites !== 1 ? 's' : ''}
                  </span>
                ) : undefined
              }
            />
            <ActivityFeed
              activities={analytics.recentActivity}
              maxItems={5}
              showViewAll={true}
              onViewAll={() => navigate('/landlord/tenants')}
            />
          </div>

          {/* Info Note */}
          <div className="mb-6">
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <p className="text-sm text-blue-800">
                💡 <strong>Autopay payouts</strong> typically deposit to your bank in 2–5
                business days after tenants are automatically charged on their due date.
              </p>
            </div>
          </div>
        </>
      ) : null}

      {/* Tenants by Property */}
      {Object.entries(groupedByProperty).map(([propertyName, propertyTenants]) => (
        <div key={propertyName} className="mb-8">
          <h2 className="mb-4 text-base font-semibold sm:text-lg">{propertyName}</h2>
          
          {/* Mobile Card View */}
          <div className="block space-y-3 lg:hidden">
            {propertyTenants.map((tenant) => {
              const rentMonth = formatRentMonth(getCurrentRentMonth(tenant.unit));
              return (
                <div key={tenant.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{tenant.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{tenant.email}</p>
                      <p className="mt-1 text-xs text-gray-600">Unit {tenant.unit?.name}</p>
                    </div>
                    <Badge variant={tenant.status}>
                      {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div>
                      <span className="text-gray-500">Rent Month</span>
                      <p className="font-medium text-gray-900">{rentMonth}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Amount</span>
                      <p className="font-medium text-gray-900">{formatCurrency(tenant.unit!.rentAmount)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Due Day</span>
                      <p className="font-medium text-gray-900">Day {tenant.unit?.dueDay ?? 1}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Payment</span>
                      <div className="mt-0.5">
                        <Badge variant={tenant.autopayEnabled ? 'autopay' : 'manual'}>
                          {tenant.autopayEnabled ? 'Autopay' : 'Manual'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {!tenant.autopayEnabled && tenant.status !== 'paid' && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkAsPaid(tenant.id)}
                      className="w-full"
                    >
                      Mark Paid
                    </Button>
                  )}
                  {tenant.status === 'paid' && (
                    <div className="text-sm font-medium text-center text-green-600">
                      ✓ Received
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm lg:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Rent Month
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Due Day
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {propertyTenants.map((tenant) => {
                  const rentMonth = formatRentMonth(getCurrentRentMonth(tenant.unit));
                  return (
                  <tr key={tenant.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {tenant.name}
                      </div>
                      <div className="text-sm text-gray-500">{tenant.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {tenant.unit?.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {rentMonth}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {formatCurrency(tenant.unit!.rentAmount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      Day {tenant.unit?.dueDay ?? 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={tenant.status}>
                        {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={tenant.autopayEnabled ? 'autopay' : 'manual'}>
                        {tenant.autopayEnabled ? 'Autopay' : 'Manual'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                      {!tenant.autopayEnabled && tenant.status !== 'paid' && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(tenant.id)}
                        >
                          Mark Paid
                        </Button>
                      )}
                      {tenant.status === 'paid' && (
                        <span className="text-green-600">✓ Received</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Mark as Paid Modal */}
      {markPaidModal && (
        <Modal
          isOpen={true}
          onClose={() => setMarkPaidModal(null)}
          title="Mark Payment as Received"
        >
          <div className="space-y-4">
            <Input
              label="Amount"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
            <Input
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
            <Input
              label="Note (optional)"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="Paid via Interac e-Transfer"
            />
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => setMarkPaidModal(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={confirmMarkAsPaid} className="flex-1">
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
};
