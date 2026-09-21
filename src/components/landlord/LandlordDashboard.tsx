import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useDashboardAnalytics } from '../../hooks/useDashboardAnalytics';
import { AppShell } from '../ui/AppShell';
import { Button } from '../ui/Button';
import { MetricCard } from '../ui/MetricCard';
import { ActivityFeed } from '../ui/ActivityFeed';
import { formatCurrency } from '../../utils/helpers';
import { fetchLedgerBalance } from '../../services/api';
import { LedgerSummary } from '../../types';

export const LandlordDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, tenants, properties, units, loading } = useApp();
  const { analytics, loading: analyticsLoading } = useDashboardAnalytics();
  const [ledgerSummaries, setLedgerSummaries] = useState<Record<string, LedgerSummary>>({});

  React.useEffect(() => {
    const loadLedgerBalances = async () => {
      try {
        const activeTenantIds = tenants
          .filter((t) => t.landlordId === currentUser?.id && t.status === 'ACTIVE')
          .map((t) => t.id);

        const results = await Promise.all(
          activeTenantIds.map(async (tenantId) => {
            const summary = await fetchLedgerBalance(tenantId);
            return [tenantId, summary] as const;
          })
        );

        setLedgerSummaries(Object.fromEntries(results));
      } catch (error) {
        console.error('Failed to load ledger balances for landlord dashboard', error);
        setLedgerSummaries({});
      }
    };

    if (currentUser?.id && tenants.length > 0) {
      loadLedgerBalances();
    }
  }, [currentUser?.id, tenants]);

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
        const summary = ledgerSummaries[tenant.id];
        const currentBalance = summary?.currentBalance ?? 0;
        return {
          ...tenant,
          // Flatten user fields for backward compatibility
          email: tenant.user.email,
          name: tenant.user.name,
          phone: tenant.user.phone,
          unit,
          property,
          membershipStatus: tenant.status,
          currentBalance,
          totalPaid: summary?.totalPaid ?? 0,
          lastPostedDate: summary?.lastPostedDate ?? null,
        };
      });
  }, [tenants, units, properties, currentUser, ledgerSummaries]);



  return (
    <AppShell title="Dashboard">
      {analyticsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 rounded-full border-t-transparent animate-spin border-primary-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading analytics...</p>
          </div>
        </div>
      ) : analytics ? (
        <>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Payment overview</h1>
              <p className="mt-1 text-sm text-gray-600">See who has paid, who has a balance, and what needs recording.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/landlord/tenants')}>Add tenant</Button>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard
              title="Collected this month"
              value={formatCurrency(analytics.revenue.collected)}
              subValue="Posted payments"
              icon="💰"
              variant="success"
              size="large"
              footer={<span className="text-sm text-gray-600">{analytics.recentActivity.length} recent payment{analytics.recentActivity.length === 1 ? '' : 's'}</span>}
            />
            <MetricCard
              title="Still owed"
              value={formatCurrency(analytics.outstanding.amount)}
              subValue="Across active tenants"
              icon="↗"
              variant={analytics.outstanding.amount > 0 ? 'warning' : 'success'}
              size="large"
              footer={<span className="text-sm text-gray-600">Based on posted ledger balances</span>}
            />
            <MetricCard
              title="Tenants with a balance"
              value={analytics.outstanding.tenantCount.toString()}
              subValue="Need payment follow-up"
              icon="👥"
              variant={analytics.outstanding.tenantCount > 0 ? 'warning' : 'success'}
              size="large"
              footer={<span className="text-sm text-gray-600">{analytics.activeTenants.total} active tenant{analytics.activeTenants.total === 1 ? '' : 's'}</span>}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.6fr]">
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Tenants</h2>
                  <p className="text-sm text-gray-500">Balances and recent account activity</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/landlord/tenants')}>View all</Button>
              </div>
              {landlordTenants.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="font-medium text-gray-900">No tenants yet</p>
                  <p className="mt-1 text-sm text-gray-500">Add your first tenant to start tracking payments.</p>
                  <Button className="mt-4" size="sm" onClick={() => navigate('/landlord/tenants')}>Add tenant</Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {landlordTenants.map((tenant) => (
                    <div key={tenant.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <button type="button" className="text-left" onClick={() => navigate(`/landlord/tenants/${tenant.id}`)}>
                        <p className="font-medium text-gray-900">{tenant.name}</p>
                        <p className="mt-1 text-sm text-gray-500">{tenant.property?.name || 'No property'} · {tenant.unit?.name || 'No unit'}</p>
                      </button>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className={`font-semibold ${tenant.currentBalance > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                            {formatCurrency(tenant.currentBalance)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {tenant.lastPostedDate ? `Last activity ${new Date(tenant.lastPostedDate).toLocaleDateString()}` : 'No ledger activity'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <ActivityFeed
              activities={analytics.recentActivity}
              maxItems={5}
              title="Recent payments"
              showStatus={false}
            />
          </div>
        </>
      ) : null}

      {/* The dashboard is intentionally summary-first. Detailed per-property tables are removed from the home screen. */}

    </AppShell>
  );
};
