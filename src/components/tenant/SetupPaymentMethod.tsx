import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import stripePromise from '../../utils/stripeLoader';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { FeeBreakdown } from '../ui/FeeBreakdown';
import { useToast } from '../../context/ToastContext';
import { getCurrentUser, getTenantMembership, TenantMembershipDetails } from '../../services/api';
import api from '../../services/api';

const SetupForm: React.FC<{ tenantData: TenantMembershipDetails }> = ({ tenantData }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Submit the payment element
      const { error: submitError } = await elements.submit();
      if (submitError) {
        showToast(submitError.message || 'Failed to submit payment details', 'error');
        setLoading(false);
        return;
      }

      // Confirm the setup
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/tenant/dashboard`,
        },
        redirect: 'if_required',
      });

      if (error) {
        showToast(error.message || 'Failed to save payment method', 'error');
      } else {
        showToast('Payment method saved successfully!', 'success');
        navigate('/tenant/dashboard');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save payment method', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Fee Disclosure */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💳 Payment Method Setup</h4>
          <p className="text-sm text-blue-800 mb-3">
            Add your card to pay rent online. You can enable autopay later if you'd like.
          </p>
          <div className="bg-white rounded-lg p-4">
            <FeeBreakdown rentAmount={Number(tenantData.unit.rentAmount)} />
          </div>
        </div>

        {/* Stripe Payment Element */}
        <div className="bg-white border rounded-lg p-4">
          <PaymentElement />
        </div>

        {/* Terms and Submit */}
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            By saving your payment method, you authorize RentBeam to securely store your card
            details for future rent payments. Processing fees apply to each transaction.
          </p>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/tenant/dashboard')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!stripe || loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Payment Method'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

export const SetupPaymentMethod: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState<TenantMembershipDetails | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const initialized = React.useRef(false);

  useEffect(() => {
    const initializeSetup = async () => {
      // Prevent double-call in React Strict Mode
      if (initialized.current) return;
      initialized.current = true;

      try {
        const profile = await getCurrentUser();

        if (!profile.memberships.tenants || profile.memberships.tenants.length === 0) {
          showToast('No tenant membership found', 'error');
          navigate('/login');
          return;
        }

        const membershipId = profile.memberships.tenants[0].id;
        const membership = await getTenantMembership(membershipId);
        setTenantData(membership);

        // Check if property accepts online payments
        if (membership.unit.property.acceptOnlinePayments === false) {
          showToast('This property does not accept online payments', 'error');
          navigate('/tenant/dashboard');
          return;
        }

        // Get setup intent client secret
        const response = await api.post('/api/stripe/setup-intent');
        setClientSecret(response.data.clientSecret);
      } catch (err: any) {
        showToast(err.message || 'Failed to initialize payment setup', 'error');
        navigate('/tenant/dashboard');
      } finally {
        setLoading(false);
      }
    };

    initializeSetup();
  }, [navigate, showToast]);

  if (loading || !tenantData || !clientSecret) {
    return (
      <AppShell title="Setup Payment Method">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-t-transparent rounded-full animate-spin border-primary-600"></div>
                <p className="mt-4 text-gray-600">Loading payment setup...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Setup Payment Method">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Add Payment Method</h2>
            <p className="text-sm text-gray-500 mt-1">
              {tenantData.unit.property.name} - Unit {tenantData.unit.name}
            </p>
          </CardHeader>
          <CardContent>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#2563eb',
                  },
                },
              }}
            >
              <SetupForm tenantData={tenantData} />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};
