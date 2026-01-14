import React from 'react';
import { CurrentSubscription } from '../../types';
import { AlertCircle, Info, Clock, XCircle } from 'lucide-react';
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
  const { subscriptionStatus, cancelAtPeriodEnd, currentPeriodEnd, planName } = subscription;
  
  // Incomplete subscription - payment required
  if (subscriptionStatus === 'incomplete') {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Payment Required
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              Complete your payment to activate your {planName} subscription.
            </p>
            {onPayNow && (
              <button
                onClick={onPayNow}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700"
              >
                Complete Payment
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Past due - payment failed
  if (subscriptionStatus === 'past_due') {
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
  
  // Trialing subscription
  if (subscriptionStatus === 'trialing' && currentPeriodEnd) {
    const endDate = format(new Date(currentPeriodEnd), 'MMMM d, yyyy');
    
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Trial Period
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Your trial ends on {endDate}. You'll be billed automatically unless you cancel.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // No banner needed for active subscriptions
  return null;
};
