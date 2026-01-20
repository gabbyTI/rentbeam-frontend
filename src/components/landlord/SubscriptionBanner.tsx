import React from 'react';
import { CurrentSubscription } from '../../types';
import { AlertCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface SubscriptionBannerProps {
  subscription: CurrentSubscription;
  onReactivate?: () => void;
  onUpdatePayment?: () => void;
  onCancelIncomplete?: () => void;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  subscription,
  onReactivate,
  onUpdatePayment,
  onCancelIncomplete
}) => {
  const { subscriptionStatus, cancelAtPeriodEnd, currentPeriodEnd, planName, isOverLimit, overLimitBy, restrictions } = subscription;
  
  // Incomplete subscription - payment required (highest priority - must fix this before upgrading)
  if (subscriptionStatus === 'incomplete' || subscriptionStatus === 'incomplete_expired') {
    return (
      <div className="p-4 mb-6 border-l-4 border-yellow-400 bg-yellow-50">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="flex-1 ml-3">
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
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => {
                  const plansSection = document.getElementById('available-plans');
                  if (plansSection) {
                    plansSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                {subscriptionStatus === 'incomplete_expired' ? 'View Plans' : 'Complete Payment'}
              </button>
              {onCancelIncomplete && (
                <button
                  onClick={onCancelIncomplete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel & Stay on Free
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Over limit - critical warning
  if (isOverLimit) {
    return (
      <div className="p-4 mb-6 border-l-4 border-red-400 bg-red-50">
        <div className="flex items-start">
          <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div className="flex-1 ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Payment Failed
            </h3>
            <p className="mt-1 text-sm text-red-700">
              Your recent payment failed. Please update your payment method to avoid service interruption.
            </p>
            {onUpdatePayment && (
              <button
                onClick={onUpdatePayment}
                className="px-4 py-2 mt-3 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
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
      <div className="p-4 mb-6 border-l-4 border-red-600 bg-red-50">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1 ml-3">
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
              className="inline-block px-4 py-2 mt-3 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
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
    const endDate = currentPeriodEnd ? format(new Date(currentPeriodEnd), 'MMMM d, yyyy') : 'N/A';
    
    return (
      <div className="p-4 mb-6 border-l-4 border-orange-400 bg-orange-50">
        <div className="flex items-start">
          <Clock className="h-5 w-5 text-orange-400 mt-0.5" />
          <div className="flex-1 ml-3">
            <h3 className="text-sm font-medium text-orange-800">
              Subscription Ending
            </h3>
            <p className="mt-1 text-sm text-orange-700">
              Your subscription will be canceled on {endDate}. You'll be moved to the Free plan.
            </p>
            {onReactivate && (
              <button
                onClick={onReactivate}
                className="px-4 py-2 mt-3 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
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
      <div className="p-4 mb-6 border-l-4 border-orange-400 bg-orange-50">
        <div className="flex items-start">
          <Clock className="h-5 w-5 text-orange-400 mt-0.5" />
          <div className="flex-1 ml-3">
            <h3 className="text-sm font-medium text-orange-800">
              Subscription Ending
            </h3>
            <p className="mt-1 text-sm text-orange-700">
              Your subscription will be canceled on {endDate}. You'll be moved to the Free plan.
            </p>
            {onReactivate && (
              <button
                onClick={onReactivate}
                className="px-4 py-2 mt-3 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
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
