import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { AppShell } from '../ui/AppShell';
import { StatCard } from '../ui/StatCard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/helpers';
import { getPaymentStatus, getCurrentMonth, generateId, getCurrentRentMonth, formatRentMonth, isPaymentWindowOpen } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';

export const LandlordDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, tenants, properties, units, payments, loading } = useApp();
  const api = useApi();
  const { showToast } = useToast();
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
            <div className="inline-block w-12 h-12 border-4 border-t-transparent rounded-full animate-spin border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const landlordTenants = useMemo(() => {
    return tenants
      .filter((t) => t.landlordId === currentUser?.id && t.status === 'ACTIVE')
      .filter((t) => {
        const unit = units.find((u) => u.id === t.unitId);
        return isPaymentWindowOpen(unit);
      }) // Only show tenants with open payment windows
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

  const stats = useMemo(() => {
    const expected = landlordTenants.reduce((sum, t) => {
      const rent = t.unit?.rentAmount ? parseFloat(t.unit.rentAmount.toString()) : 0;
      return sum + rent;
    }, 0);
    const collected = landlordTenants
      .filter((t) => t.status === 'paid')
      .reduce((sum, t) => {
        const rent = t.unit?.rentAmount ? parseFloat(t.unit.rentAmount.toString()) : 0;
        return sum + rent;
      }, 0);
    const outstanding = expected - collected;
    const lateCount = landlordTenants.filter((t) => t.status === 'late').length;

    return { expected, collected, outstanding, lateCount };
  }, [landlordTenants]);

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
      const paymentData = {
        tenantMembershipId: markPaidModal,
        amount: parseFloat(paymentAmount),
        date: paymentDate,
        note: paymentNote || undefined,
      };

      await api.createPayment(paymentData, payments);

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
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Expected This Month" value={formatCurrency(stats.expected)} />
        <StatCard title="Collected" value={formatCurrency(stats.collected)} />
        <StatCard title="Outstanding" value={formatCurrency(stats.outstanding)} />
        <StatCard
          title="Late Tenants"
          value={stats.lateCount}
          icon={
            stats.lateCount > 0 ? (
              <svg
                className="h-6 w-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : undefined
          }
        />
      </div>

      {/* Info Note */}
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Autopay payouts</strong> typically deposit to your bank in 2–5
            business days after tenants are automatically charged on their due date.
          </p>
        </div>
      </div>

      {/* Tenants by Property */}
      {Object.entries(groupedByProperty).map(([propertyName, propertyTenants]) => (
        <div key={propertyName} className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{propertyName}</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rent Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Day
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.unit?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rentMonth}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(tenant.unit!.rentAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
