import React, { useState, useEffect } from 'react';
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
  const { login, currentUser } = useApp();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      const redirectPath = currentUser.role === 'landlord' 
        ? '/landlord/dashboard' 
        : '/tenant/dashboard';
      navigate(redirectPath, { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showToast('Please enter email and password', 'error');
      return;
    }

    setLoading(true);
    console.log('🔵 Starting login for:', email);

    try {
      // Step 1: Call backend login API
      console.log('🔵 Step 1: Calling backend API...');
      const response = await apiLogin({ email, password });
      console.log('🔵 Step 1: Backend response:', response);

      // Step 2: Store auth data
      console.log('🔵 Step 2: Storing tokens and user data...');
      authService.setTokens(response.tokens);
      authService.setUser(response.user);
      authService.setMemberships(response.memberships);
      console.log('🔵 Step 2: Auth data stored');

      // Step 3: Set current user in app context
      console.log('🔵 Step 3: Setting current user...');
      const hasLandlord = !!response.memberships.landlord;
      const hasTenants = response.memberships.tenants && response.memberships.tenants.length > 0;
      
      // Check if user has both roles - let AppContext handle role selection
      if (hasLandlord && hasTenants) {
        console.log('🔵 User has both roles - redirecting to home for AppContext to handle');
        // Don't call login() here - let AppContext detect dual roles and show selector
        window.location.href = '/';
        return;
      } else if (hasLandlord) {
        console.log('🔵 User is landlord only, id:', response.memberships.landlord!.id);
        login('landlord', response.memberships.landlord!.id);

        // Step 4: Check Stripe status
        console.log('🔵 Step 4: Checking Stripe status...');
        try {
          const stripeStatus = await getStripeConnectStatus();
          console.log('🔵 Stripe status:', stripeStatus);
          
          if (!stripeStatus.onboarded) {
            console.log('🔵 Redirecting to complete setup');
            navigate('/landlord/complete-setup');
          } else {
            console.log('🔵 Redirecting to dashboard');
            navigate('/landlord/dashboard');
          }
        } catch (stripeError) {
          console.error('🔴 Stripe check failed:', stripeError);
          navigate('/landlord/complete-setup');
        }
      } else if (hasTenants) {
        console.log('🔵 User is tenant only, id:', response.memberships.tenants[0].id);
        login('tenant', response.memberships.tenants[0].id);
        navigate('/tenant/dashboard');
      } else {
        console.error('🔴 No memberships found');
        showToast('No account found', 'error');
      }
    } catch (error: any) {
      console.error('🔴 Login error:', error);
      const errorMessage = error.message || 'Login failed';
      
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
            RentBeam
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

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Forgot password?
                </button>
              </div>

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
