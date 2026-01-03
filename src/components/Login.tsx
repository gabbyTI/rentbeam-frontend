import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent } from './ui/Card';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const { landlords, tenants, login } = useApp();
  const navigate = useNavigate();

  const handleLandlordLogin = () => {
    if (!email) {
      alert('Please enter an email');
      return;
    }

    // Check if landlord exists
    const landlord = landlords.find((l) => l.email === email);

    if (landlord) {
      login('landlord', landlord.id);
      navigate('/landlord/dashboard');
    } else {
      // New landlord - go to onboarding
      navigate('/landlord/onboarding');
    }
  };

  const handleTenantLogin = () => {
    if (!email) {
      alert('Please enter an email');
      return;
    }

    // Find tenant by email
    const tenant = tenants.find((t) => t.email === email);

    if (!tenant) {
      alert('No tenant account found with this email');
      return;
    }

    if (tenant.inviteStatus === 'pending') {
      alert('Please accept your portal invite first');
      return;
    }

    if (tenant.residencyStatus === 'past') {
      alert('Your tenancy has ended. Please contact your landlord if this is incorrect.');
      return;
    }

    login('tenant', tenant.id);
    navigate('/tenant/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">
            RentTrack Lite
          </h1>
          <p className="text-gray-600">Simple rent tracking for small landlords</p>
        </div>

        <Card>
          <CardContent className="py-8">
            <div className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              <div className="space-y-3">
                <Button onClick={handleLandlordLogin} className="w-full">
                  Continue as Landlord
                </Button>
                <Button
                  onClick={handleTenantLogin}
                  variant="secondary"
                  className="w-full"
                >
                  Continue as Tenant
                </Button>
              </div>

              <div className="mt-6 border-t pt-6">
                <p className="text-xs text-gray-500 text-center mb-3">
                  Demo Credentials (mock data):
                </p>
                <div className="space-y-2 text-xs text-gray-600">
                  <p>
                    <strong>Landlord:</strong> sarah@example.com or michael@example.com
                  </p>
                  <p>
                    <strong>Tenant:</strong> emma.wilson@example.com or
                    james.brown@example.com
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500">
          This is a demo app with mock data only. No real payments are processed.
        </p>
      </div>
    </div>
  );
};
