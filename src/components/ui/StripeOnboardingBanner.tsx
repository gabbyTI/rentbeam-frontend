import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { useApp } from '../../context/AppContext';
import { connectStripe } from '../../services/api';

export const StripeOnboardingBanner: React.FC = () => {
  const navigate = useNavigate();
  const { stripeOnboarded, stripeStatus } = useApp();
  const [isLoading, setIsLoading] = useState(false);

  // Don't show banner if fully onboarded and payouts enabled
  if (stripeOnboarded && stripeStatus?.payoutsEnabled) {
    return null;
  }

  // Determine banner state and message
  let title = 'Complete Setup Required';
  let message = 'Connect your bank account to receive rent payments.';
  let buttonText = 'Connect Bank Account';
  let variant: 'warning' | 'info' = 'warning';
  let actionType: 'stripe' | 'navigate' = 'stripe';

  if (stripeOnboarded && !stripeStatus?.payoutsEnabled) {
    // Onboarded but verification pending
    variant = 'info';
    title = 'Verification in Progress';
    
    if (stripeStatus?.requirementsPending && stripeStatus.requirementsPending.length > 0) {
      message = 'Stripe is reviewing your information. This usually takes 1-2 business days. You can check the status anytime.';
      buttonText = 'View Dashboard';
      actionType = 'navigate';
    } else if (stripeStatus?.requirementsDue && stripeStatus.requirementsDue.length > 0) {
      message = 'Additional information required. Please complete your verification to start accepting payments.';
      buttonText = 'Complete Verification';
      actionType = 'stripe';
    } else {
      message = 'Your account is being reviewed by Stripe. You\'ll be able to accept payments once approved (usually within 1-2 business days).';
      buttonText = 'View Status';
      actionType = 'navigate';
    }
  }

  const handleClick = async () => {
    if (actionType === 'stripe') {
      setIsLoading(true);
      try {
        const currentUrl = window.location.origin;
        const { url } = await connectStripe(
          `${currentUrl}/landlord/dashboard`,
          `${currentUrl}/landlord/dashboard`
        );
        window.location.href = url;
      } catch (error) {
        console.error('Failed to connect Stripe:', error);
        setIsLoading(false);
      }
    } else {
      navigate('/landlord/dashboard');
    }
  };

  const bgColor = variant === 'warning' ? 'bg-yellow-50' : 'bg-blue-50';
  const borderColor = variant === 'warning' ? 'border-yellow-400' : 'border-blue-400';
  const iconColor = variant === 'warning' ? 'text-yellow-400' : 'text-blue-400';
  const titleColor = variant === 'warning' ? 'text-yellow-800' : 'text-blue-800';
  const textColor = variant === 'warning' ? 'text-yellow-700' : 'text-blue-700';

  return (
    <div className={`mb-6 ${bgColor} border-l-4 ${borderColor} p-4 rounded-lg`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
            {variant === 'warning' ? (
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            )}
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${titleColor}`}>{title}</h3>
          <p className={`mt-1 text-sm ${textColor}`}>
            {message}
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              onClick={handleClick}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : buttonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
