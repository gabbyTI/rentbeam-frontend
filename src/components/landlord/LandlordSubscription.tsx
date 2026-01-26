import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getCurrentSubscription,
  createSubscription,
  upgradeSubscription,
  downgradeSubscription,
  cancelSubscription,
  cancelIncompleteSubscription,
  reactivateSubscription,
  getCustomerPortal,
  getSubscriptionPlans,
  PlanConfig
} from '../../services/api';
import { AppShell } from '../ui/AppShell';
import { UsageWidget } from './UsageWidget';
import { PlanCard } from './PlanCard';
import { SubscriptionBanner } from './SubscriptionBanner';
import {
  CancelConfirmationModal,
  DowngradeConfirmationModal,
  ReactivateConfirmationModal,
  UpgradeConfirmationModal
} from './SubscriptionModals';
import {
  CurrentSubscription,
  SubscriptionPlan,
  PlanDetails
} from '../../types';
import { useToast } from '../../context/ToastContext';
import { ExternalLink, Loader2 } from 'lucide-react';

export const LandlordSubscription: React.FC = () => {
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<Record<string, PlanDetails>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [pendingDowngradePlan, setPendingDowngradePlan] = useState<SubscriptionPlan | null>(null);
  const [pendingUpgradePlan, setPendingUpgradePlan] = useState<SubscriptionPlan | null>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Load subscription data and plans
  const loadData = async () => {
    try {
      const [subData, plansData] = await Promise.all([
        getCurrentSubscription(),
        getSubscriptionPlans()
      ]);

      setSubscription(subData);

      // Transform PlanConfig[] to Record<SubscriptionPlan, PlanDetails>
      const plansMap: Record<string, PlanDetails> = {};
      plansData.forEach(p => {
        plansMap[p.id] = {
          name: p.name,
          price: p.price,
          unitLimit: p.limits.units,
          features: p.features,
          recommended: p.id === 'growth' // Preserve recommended flag logic if needed, or get from backend
        };
      });
      setPlans(plansMap);

    } catch (error: any) {
      showToast(error.message || 'Failed to load subscription data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Poll for updates (helper)
  const pollForUpdate = async (attempts = 0) => {
    try {
      const data = await getCurrentSubscription();

      if (data.subscriptionStatus === 'active') {
        setSubscription(data);
        showToast('Your subscription is now active!', 'success');
        navigate('/landlord/subscription', { replace: true });
      } else if (attempts < 10) {
        setTimeout(() => pollForUpdate(attempts + 1), 1000);
      } else {
        setSubscription(data);
        showToast('Subscription is being processed. Refresh if not updated.', 'info');
        navigate('/landlord/subscription', { replace: true });
      }
    } catch (error) {
      console.error('Polling error', error);
    }
  };

  // Handle return from Stripe payment
  // With webhook-driven architecture, there may be a brief delay before DB is updated
  useEffect(() => {
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');

    if (status === 'success' && sessionId) {
      showToast('Payment received! Activating your subscription...', 'success');
      pollForUpdate();
    } else if (status === 'canceled') {
      showToast('Payment was canceled. You can try again anytime.', 'info');
      loadData();
      navigate('/landlord/subscription', { replace: true });
    }
  }, [searchParams]);

  // Handle plan selection
  const handlePlanSelect = async (plan: SubscriptionPlan) => {
    if (!subscription) return;

    setSelectedPlan(plan);

    // Determine if upgrade or downgrade
    const isUpgrade = getPlanTier(plan) > getPlanTier(subscription.planType);
    const isDowngrade = getPlanTier(plan) < getPlanTier(subscription.planType);

    // Show confirmation modal for downgrades
    if (isDowngrade) {
      setPendingDowngradePlan(plan);
      setShowDowngradeModal(true);
      return;
    }

    // For upgrades on paid plans, show confirmation modal
    if (isUpgrade && subscription.planType !== 'free') {
      setPendingUpgradePlan(plan);
      setShowUpgradeModal(true);
      return;
    }

    // Execute new subscription (free to paid) immediately
    await executePlanChange(plan);
  };

  // Execute the actual plan change
  const executePlanChange = async (plan: SubscriptionPlan) => {
    if (!subscription) return;

    setActionLoading(true);

    try {
      const isUpgrade = getPlanTier(plan) > getPlanTier(subscription.planType);

      if (subscription.planType === 'free') {
        // Create new subscription
        const response = await createSubscription(plan);
        showToast('Redirecting to payment...', 'info');
        // Redirect to Stripe hosted invoice
        window.location.href = response.hostedInvoiceUrl;
      } else if (isUpgrade) {
        // Upgrade immediately
        await upgradeSubscription(plan);
        showToast('Subscription upgraded successfully!', 'success');
        await loadData(); // Reload all data
      } else {
        // Downgrade (should have been caught by modal, but just in case)
        await downgradeSubscription(plan);
        showToast('Downgrade scheduled for end of billing period', 'success');
        await loadData();
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update subscription', 'error');
    } finally {
      setActionLoading(false);
      setSelectedPlan(null);
    }
  };

  // Handle downgrade confirmation
  const handleConfirmDowngrade = async () => {
    if (!pendingDowngradePlan) return;

    setShowDowngradeModal(false);
    setActionLoading(true);

    try {
      await downgradeSubscription(pendingDowngradePlan);
      showToast('Downgrade scheduled for end of billing period', 'success');
      await loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to schedule downgrade', 'error');
    } finally {
      setActionLoading(false);
      setSelectedPlan(null);
      setPendingDowngradePlan(null);
    }
  };

  // Handle upgrade confirmation
  const handleConfirmUpgrade = async () => {
    if (!pendingUpgradePlan) return;

    setShowUpgradeModal(false);
    setActionLoading(true);

    try {
      const response = await upgradeSubscription(pendingUpgradePlan);

      // Redirect to payment page if invoice URL provided
      if (response.hostedInvoiceUrl) {
        showToast('Redirecting to secure payment page...', 'info');
        window.location.href = response.hostedInvoiceUrl;
      } else {
        showToast('Upgrade initiated successfully!', 'success');
        await loadData();
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to upgrade subscription', 'error');
    } finally {
      setActionLoading(false);
      setSelectedPlan(null);
      setPendingUpgradePlan(null);
    }
  };

  // Handle cancel subscription
  const handleCancel = () => {
    setShowCancelModal(true);
  };

  // Handle cancel confirmation
  const handleConfirmCancel = async () => {
    setShowCancelModal(false);
    setActionLoading(true);

    try {
      await cancelSubscription(false);
      showToast('Subscription will be canceled at the end of billing period', 'success');
      await loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to cancel subscription', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reactivate subscription
  const handleReactivate = () => {
    setShowReactivateModal(true);
  };

  // Handle reactivate confirmation
  const handleConfirmReactivate = async () => {
    setShowReactivateModal(false);
    setActionLoading(true);

    try {
      await reactivateSubscription();
      showToast('Subscription reactivated successfully!', 'success');
      await loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to reactivate subscription', 'error');
    } finally {
      setActionLoading(false);
    }
  };
  // Handle cancel incomplete subscription
  const handleCancelIncomplete = async () => {
    setActionLoading(true);

    try {
      const response = await cancelIncompleteSubscription();
      const message = response?.message || 'Subscription canceled successfully.';
      showToast(message, 'success');
      await loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to cancel subscription', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Stripe customer portal
  const handleOpenPortal = async () => {
    try {
      const { url } = await getCustomerPortal();
      window.location.href = url;
    } catch (error: any) {
      showToast(error.message || 'Failed to open customer portal', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Failed to load subscription data. Please try again.</p>
        </div>
      </div>
    );
  }

  // Sort plans: free, starter, growth, professional
  const sortedPlans = ['free', 'starter', 'growth', 'professional']
    .filter(id => plans[id])
    .map(id => id as SubscriptionPlan);

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription & Billing</h1>
        <p className="text-gray-600">Manage your RentBeam subscription and payment methods</p>
      </div>

      {/* Subscription Status Banner */}
      <SubscriptionBanner
        subscription={subscription}
        onReactivate={handleReactivate}
        onUpdatePayment={handleOpenPortal}
        onCancelIncomplete={handleCancelIncomplete}
      />

      {/* Current Plan & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Current Plan Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Plan:</span>
              <span className="font-semibold text-gray-900">{subscription.planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price:</span>
              <span className="font-semibold text-gray-900">${subscription.price}/month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-semibold ${subscription.subscriptionStatus === 'active' ? 'text-green-600' :
                subscription.subscriptionStatus === 'past_due' ? 'text-red-600' :
                  subscription.subscriptionStatus === 'incomplete' ? 'text-yellow-600' :
                    'text-gray-600'
                }`}>
                {subscription.subscriptionStatus?.replace('_', ' ').toUpperCase() || 'FREE'}
              </span>
            </div>
            {subscription.currentPeriodEnd && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {subscription.cancelAtPeriodEnd ? 'Ends on:' : 'Renews on:'}
                </span>
                <span className="font-semibold text-gray-900">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Manage Buttons */}
          <div className="mt-6 space-y-2">
            {subscription.planType !== 'free' && (
              <button
                onClick={handleOpenPortal}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <ExternalLink size={16} />
                Manage Payment Methods
              </button>
            )}
            {subscription.planType !== 'free' && !subscription.cancelAtPeriodEnd && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Usage Widget */}
        <UsageWidget subscription={subscription} />
      </div>

      {/* Available Plans */}
      <div id="available-plans" className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              details={plans[plan]}
              currentPlan={subscription.planType}
              onSelect={handlePlanSelect}
              isLoading={actionLoading && selectedPlan === plan}
            />
          ))}
        </div>
      </div>

      {/* Confirmation Modals */}
      {subscription && (
        <>
          <CancelConfirmationModal
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            onConfirm={handleConfirmCancel}
            subscription={subscription}
            isLoading={actionLoading}
          />

          <ReactivateConfirmationModal
            isOpen={showReactivateModal}
            onClose={() => setShowReactivateModal(false)}
            onConfirm={handleConfirmReactivate}
            subscription={subscription}
            isLoading={actionLoading}
          />

          {pendingDowngradePlan && (
            <DowngradeConfirmationModal
              isOpen={showDowngradeModal}
              onClose={() => {
                setShowDowngradeModal(false);
                setSelectedPlan(null);
                setPendingDowngradePlan(null);
              }}
              onConfirm={handleConfirmDowngrade}
              currentPlan={subscription.planType}
              targetPlan={pendingDowngradePlan}
              currentUnitCount={subscription.currentUnitCount}
              targetUnitLimit={plans[pendingDowngradePlan].unitLimit}
              isLoading={actionLoading}
            />
          )}

          {pendingUpgradePlan && (
            <UpgradeConfirmationModal
              isOpen={showUpgradeModal}
              onClose={() => {
                setShowUpgradeModal(false);
                setSelectedPlan(null);
                setPendingUpgradePlan(null);
              }}
              onConfirm={handleConfirmUpgrade}
              targetPlan={pendingUpgradePlan}
              currentPlan={subscription.planType}
              isLoading={actionLoading}
            />
          )}
        </>
      )}
    </AppShell>
  );
};

// Helper function
function getPlanTier(plan: SubscriptionPlan): number {
  const tiers: Record<SubscriptionPlan, number> = {
    free: 0,
    starter: 1,
    growth: 2,
    professional: 3
  };
  return tiers[plan];
}
