import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStripeConnectStatus } from '../../services/api';
import { Button } from './Button';

export const StripeOnboardingBanner: React.FC = () => {
  const navigate = useNavigate();
  const [stripeOnboarded, setStripeOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStripeStatus = async () => {
      try {
        const status = await getStripeConnectStatus();
        setStripeOnboarded(status.onboarded);
      } catch (error) {
        console.error('Failed to check Stripe status:', error);
      }
    };

    checkStripeStatus();
  }, []);

  if (stripeOnboarded !== false) {
    return null;
  }

  return (
    <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">Complete Setup Required</h3>
          <p className="mt-1 text-sm text-yellow-700">
            Connect your bank account to receive rent payments. You can view your dashboard but cannot create properties or invite tenants until setup is complete.
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              onClick={() => navigate('/landlord/complete-setup')}
            >
              Connect Bank Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
