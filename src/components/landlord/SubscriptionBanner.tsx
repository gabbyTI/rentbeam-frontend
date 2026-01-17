import React from 'react';
import { CurrentSubscription } from '../../types';
import { AlertCircle, Info, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface SubscriptionBannerProps {
  subscription: CurrentSubscription;
  onPayNow?: () => void;
  onReactivate?: () => void;
  onUpdatePayment?: () => void;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  subscription,
  onPayNow,
  onReactivate,
  onUpdatePayment
}) => {
  const { subscriptionStatus, cancelAtPeriodEnd, currentPeriodEnd, planName, isOverLimit, overLimitBy, restrictions } = subscription;
  
  // Incomplete subscription - payment required (highest priority - must fix this before upgrading)
  if (subscriptionStatus === 'incomplete' || subscriptionStatus === 'incomplete_expired') {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              {subscriptionStatus === 'incomplete_expired' ? 'Subscription Expired' : 'Payment Required'}
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              {subscriptionStatus === 'incomplete_expired' 
                ? isOverLimit
                  ? `Your previous subscription attempt expired. You currently have ${overLimitBy} more ${overLimitBy === 1 ? 'unit' : 'units'} than your ${planName} plan allows. Please subscribe to a paid plan to restore access.`
                  : 'Your previous subscription attempt expired. Please start a new subscription to access premium features.'
                : 'Complete your payment to activate your subscription.'}
            </p>
            <button
              onClick={() => {
                const plansSection = document.getElementById('available-plans');
                if (plansSection) {
                  plansSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="inline-block mt-3 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700"
            >
              {subscriptionStatus === 'incomplete_expired' ? 'View Plans' : 'Complete Payment'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Over limit - critical warning
  if (isOverLimit) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex items-start">
          <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Payment Failed
            </h3>
            <p className="mt-1 text-sm text-red-700">
              Your recent payment failed. Please update your payment method to avoid service interruption.
            </p>
            {onUpdatePayment && (
              <button
                onClick={onUpdatePayment}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
              >
                Update Payment Method
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Over limit - critical warning
  if (isOverLimit) {
    return (
      <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-900">
              Account Over Limit
            </h3>
            <p className="mt-1 text-sm text-red-800">
              You have {overLimitBy} more {overLimitBy === 1 ? 'unit' : 'units'} than your {planName} plan allows.
            </p>
            {restrictions && restrictions.length > 0 && (
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {restrictions.map((restriction, idx) => (
                  <li key={idx}>{restriction}</li>
                ))}
              </ul>
            )}
            <a
              href="/landlord/subscription"
              className="inline-block mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
            >
              Upgrade Now
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // Past due - payment failed
  if (subscriptionStatus === 'past_due') {
    const endDate = format(new Date(currentPeriodEnd), 'MMMM d, yyyy');
    
    return (
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
        <div className="flex items-start">
          <Clock className="h-5 w-5 text-orange-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-orange-800">
              Subscription Ending
            </h3>
            <p className="mt-1 text-sm text-orange-700">
              Your subscription will be canceled on {endDate}. You'll be moved to the Free plan.
            </p>
            {onReactivate && (
              <button
                onClick={onReactivate}
                className="mt-3 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700"
              >
                Keep My Subscription
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Scheduled cancellation
  if (cancelAtPeriodEnd && currentPeriodEnd) {
    const endDate = format(new Date(currentPeriodEnd), 'MMMM d, yyyy');
    
    return (
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
        <div className="flex items-start">
          <Clock className="h-5 w-5 text-orange-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-orange-800">
              Subscription Ending
            </h3>
            <p className="mt-1 text-sm text-orange-700">
              Your subscription will be canceled on {endDate}. You'll be moved to the Free plan.
            </p>
            {onReactivate && (
              <button
                onClick={onReactivate}
                className="mt-3 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700"
              >
                Keep My Subscription
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // No banner needed for active subscriptions
  return null;
};
