import React from 'react';
import { SubscriptionPlan, PlanDetails } from '../../types';
import { Check, Zap } from 'lucide-react';

interface PlanCardProps {
  plan: SubscriptionPlan;
  details: PlanDetails;
  currentPlan: SubscriptionPlan;
  onSelect: (plan: SubscriptionPlan) => void;
  isLoading?: boolean;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  details,
  currentPlan,
  onSelect,
  isLoading = false
}) => {
  const isCurrent = plan === currentPlan;
  const isUpgrade = getPlanTier(plan) > getPlanTier(currentPlan);
  const isDowngrade = getPlanTier(plan) < getPlanTier(currentPlan);
  const isFree = plan === 'free';
  
  // Determine button text and state
  const getButtonConfig = () => {
    if (isCurrent) {
      return { text: 'Current Plan', disabled: true, variant: 'current' };
    }
    // Hide button for free plan when user is on a paid plan
    // Users should use "Cancel Subscription" to return to free
    if (isFree && currentPlan !== 'free') {
      return { text: '', disabled: true, variant: 'hidden', hidden: true };
    }
    if (isUpgrade) {
      return { text: 'Upgrade', disabled: false, variant: 'upgrade' };
    }
    if (isDowngrade) {
      return { text: 'Downgrade', disabled: false, variant: 'downgrade' };
    }
    return { text: 'Select Plan', disabled: false, variant: 'default' };
  };
  
  const buttonConfig = getButtonConfig();
  
  // Button styling based on variant
  const getButtonClass = () => {
    if (buttonConfig.disabled) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }
    if (buttonConfig.variant === 'upgrade') {
      return 'bg-blue-600 text-white hover:bg-blue-700';
    }
    if (buttonConfig.variant === 'downgrade') {
      return 'bg-gray-200 text-gray-700 hover:bg-gray-300';
    }
    return 'bg-blue-600 text-white hover:bg-blue-700';
  };

  return (
    <div className={`
      relative bg-white rounded-lg shadow-md border-2 transition-all
      ${isCurrent ? 'border-blue-500' : 'border-gray-200'}
      ${details.recommended ? 'ring-2 ring-blue-400' : ''}
    `}>
      {/* Recommended Badge */}
      {details.recommended && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
            <Zap size={12} />
            RECOMMENDED
          </span>
        </div>
      )}
      
      {/* Current Plan Badge */}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="inline-flex items-center px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
            CURRENT PLAN
          </span>
        </div>
      )}
      
      <div className="p-6">
        {/* Plan Name & Price */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{details.name}</h3>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-gray-900">${details.price}</span>
            {!isFree && <span className="text-gray-600">/month</span>}
          </div>
          <p className="text-sm text-gray-600 mt-2">{details.unitLimit} units included</p>
        </div>
        
        {/* Features List */}
        <ul className="space-y-3 mb-6">
          {details.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
        
        {/* Action Button */}
        {!buttonConfig.hidden && (
          <button
            onClick={() => onSelect(plan)}
            disabled={buttonConfig.disabled || isLoading}
            className={`
              w-full py-3 px-4 rounded-lg font-semibold transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${getButtonClass()}
            `}
          >
            {isLoading ? 'Processing...' : buttonConfig.text}
          </button>
        )}
      </div>
    </div>
  );
};

// Helper function to get plan tier for comparison
function getPlanTier(plan: SubscriptionPlan): number {
  const tiers: Record<SubscriptionPlan, number> = {
    free: 0,
    starter: 1,
    growth: 2,
    professional: 3
  };
  return tiers[plan];
}
