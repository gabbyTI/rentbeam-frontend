import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { getStripeConnectStatus, connectStripe } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const LandlordCompleteSetup: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  const success = searchParams.get('success');
  const refresh = searchParams.get('refresh');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await getStripeConnectStatus();
      setOnboarded(status.onboarded);

      if (success === 'true' && status.onboarded) {
        showToast('Bank account connected successfully! ✓');
        setTimeout(() => navigate('/landlord/dashboard'), 1500);
      } else if (refresh === 'true' && !status.onboarded) {
        showToast('Setup incomplete. Please try again.', 'info');
        handleConnect();
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to check status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);

    try {
      const baseUrl = window.location.origin;
      const { url } = await connectStripe(
        `${baseUrl}/landlord/complete-setup?refresh=true`,
        `${baseUrl}/landlord/complete-setup?success=true`
      );

      window.location.href = url;
    } catch (error: any) {
      showToast(error.message || 'Failed to connect bank account', 'error');
      setConnecting(false);
    }
  };

  const handleSkip = () => {
    navigate('/landlord/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (onboarded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">All Set!</h2>
            <p className="text-gray-600 mb-4">Your bank account is connected.</p>
            <Button onClick={() => navigate('/landlord/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">
            RentBeam
          </h1>
          <p className="text-gray-600">One more step</p>
        </div>

        <Card>
          <CardContent className="py-8">
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="h-8 w-8 text-primary-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>

                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Connect Your Bank Account
                </h2>
                <p className="text-gray-600">
                  To receive rent payments from tenants, connect your bank account securely.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-600 mr-2 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-gray-700">Bank-grade security</span>
                </div>
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-600 mr-2 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-gray-700">Takes 2-3 minutes</span>
                </div>
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-600 mr-2 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-gray-700">Required to receive payments</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full"
                >
                  {connecting ? 'Connecting...' : 'Connect Bank Account'}
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="w-full"
                >
                  Skip for Now
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                You'll be redirected to our secure payment partner to verify your identity and link your bank account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
