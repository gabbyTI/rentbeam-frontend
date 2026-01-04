import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent } from './ui/Card';
import { login as apiLogin, getStripeConnectStatus } from '../services/api';
import { authService } from '../services/auth';
import { useToast } from '../context/ToastContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showToast('Please enter email and password', 'error');
      return;
    }

    setLoading(true);

    try {
      // Call backend login API
      const response = await apiLogin({ email, password });

      // Store tokens and user data
      authService.setTokens(response.tokens);
      authService.setUser(response.user);

      // Determine user role and redirect
      if (response.memberships.landlord) {
        // Landlord login
        login('landlord', response.memberships.landlord.id);

        // Check if Stripe is connected
        try {
          const stripeStatus = await getStripeConnectStatus();
          if (!stripeStatus.onboarded) {
            navigate('/landlord/complete-setup');
          } else {
            navigate('/landlord/dashboard');
          }
        } catch {
          // If Stripe check fails, go to complete setup
          navigate('/landlord/complete-setup');
        }
      } else if (response.memberships.tenants.length > 0) {
        // Tenant login
        const tenant = response.memberships.tenants[0];
        login('tenant', tenant.id);
        navigate('/tenant/dashboard');
      } else {
        showToast('No account found', 'error');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      
      // Handle email not verified error
      if (errorMessage.includes('not confirmed') || errorMessage.includes('verify')) {
        showToast('Please verify your email first', 'error');
        navigate('/verify-email', { state: { email } });
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray-50 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold text-primary-600">
            RentTrack Lite
          </h1>
          <p className="text-gray-600">Welcome back</p>
        </div>

        <Card>
          <CardContent className="py-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>

              <div className="text-sm text-center text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/landlord/signup')}
                  className="font-medium text-primary-600 hover:text-primary-700"
                >
                  Sign up as Landlord
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
