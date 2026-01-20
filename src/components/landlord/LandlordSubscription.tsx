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
  previewUpgrade
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

// Plan definitions with features
const PLAN_DETAILS: Record<SubscriptionPlan, PlanDetails> = {
  free: {
    name: 'Free',
    price: 0,
    unitLimit: 3,
    features: [
      'Up to 3 units',
      'Basic property management',
      'Manual rent collection',
      'Email support'
    ]
  },
  starter: {
    name: 'Starter',
    price: 29,
    unitLimit: 10,
    features: [
      'Up to 10 units',
      'Online rent collection',
      'Automated reminders',
      'Payment tracking',
      'Priority email support'
    ]
  },
  growth: {
    name: 'Growth',
    price: 79,
    unitLimit: 50,
    recommended: true,
    features: [
      'Up to 50 units',
      'Everything in Starter',
      'Auto-pay for tenants',
      'Advanced reporting',
      'Phone & email support'
    ]
  },
  professional: {
    name: 'Professional',
    price: 149,
    unitLimit: 100,
    features: [
      'Up to 100 units',
      'Everything in Growth',
      'Dedicated account manager',
      'Custom integrations',
      'Priority support'
    ]
  }
};

export const LandlordSubscription: React.FC = () => {
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [pendingDowngradePlan, setPendingDowngradePlan] = useState<SubscriptionPlan | null>(null);
  const [pendingUpgradePlan, setPendingUpgradePlan] = useState<SubscriptionPlan | null>(null);
  const [upgradePreviewData, setUpgradePreviewData] = useState<any>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Load subscription data
  const loadSubscription = async () => {
    try {
      const data = await getCurrentSubscription();
      setSubscription(data);
    } catch (error: any) {
      showToast(error.message || 'Failed to load subscription', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  // Handle return from Stripe payment
  useEffect(() => {
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');
    
    if (status === 'success' && sessionId) {
      showToast('Payment successful! Your subscription is now active.', 'success');
      loadSubscription();
      // Clean up URL
      navigate('/landlord/subscription', { replace: true });
    } else if (status === 'canceled') {
      showToast('Payment was canceled. You can try again anytime.', 'info');
      // Clean up URL
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

    // For upgrades on paid plans, show preview modal
    if (isUpgrade && subscription.planType !== 'free') {
      setPendingUpgradePlan(plan);
      try {
        const preview = await previewUpgrade(plan);
        setUpgradePreviewData(preview);
        setShowUpgradeModal(true);
      } catch (error: any) {
        showToast(error.message || 'Failed to load upgrade preview', 'error');
        setSelectedPlan(null);
      }
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
        await loadSubscription();
      } else {
        // Downgrade (should have been caught by modal, but just in case)
        await downgradeSubscription(plan);
        showToast('Downgrade scheduled for end of billing period', 'success');
        await loadSubscription();
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
      await loadSubscription();
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
      
      // If hostedInvoiceUrl is present, redirect to payment page
      if (response.hostedInvoiceUrl) {
        showToast('Redirecting to secure payment page...', 'info');
        window.location.href = response.hostedInvoiceUrl;
      } else {
        // No payment needed (shouldn't happen for upgrades)
        showToast('Subscription upgraded successfully!', 'success');
        await loadSubscription();
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to upgrade subscription', 'error');
    } finally {
      setActionLoading(false);
      setSelectedPlan(null);
      setPendingUpgradePlan(null);
      setUpgradePreviewData(null);
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
      await loadSubscription();
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
      await loadSubscription();
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
      await cancelIncompleteSubscription();
      showToast('Incomplete subscription canceled. You can now use the free plan.', 'success');
      await loadSubscription();
    } catch (error: any) {
      showToast(error.message || 'Failed to cancel incomplete subscription', 'error');
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
              <span className={`font-semibold ${
                subscription.subscriptionStatus === 'active' ? 'text-green-600' :
                subscription.subscriptionStatus === 'past_due' ? 'text-red-600' :
                'text-yellow-600'
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
          {(Object.keys(PLAN_DETAILS) as SubscriptionPlan[]).map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              details={PLAN_DETAILS[plan]}
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
              targetUnitLimit={PLAN_DETAILS[pendingDowngradePlan].unitLimit}
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
                setUpgradePreviewData(null);
              }}
              onConfirm={handleConfirmUpgrade}
              previewData={upgradePreviewData}
              targetPlan={pendingUpgradePlan}
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
