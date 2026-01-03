import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { useToast } from '../../context/ToastContext';

export const TenantRegister: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { tenants, updateState } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    phone: '',
    emergencyContact: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const tenant = tenants.find((t) => t.inviteToken === token);
    if (!tenant) {
      showToast('Invalid invite token', 'error');
      return;
    }

    const updatedTenants = tenants.map((t) =>
      t.id === tenant.id
        ? {
            ...t,
            phone: formData.phone || undefined,
            emergencyContact: formData.emergencyContact || undefined,
            inviteStatus: 'accepted' as const,
          }
        : t
    );

    updateState({
      tenants: updatedTenants,
      currentUser: { role: 'tenant', id: tenant.id },
    });

    showToast('Registration complete!');
    navigate('/tenant/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">RentTrack Lite</h1>
          <p className="mt-2 text-gray-600">Complete your profile</p>
        </div>

        <Card>
          <CardContent className="py-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Phone Number (optional)"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="604-555-0100"
              />

              <Input
                label="Emergency Contact (optional)"
                type="text"
                value={formData.emergencyContact}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyContact: e.target.value })
                }
                placeholder="Jane Doe - 604-555-0101"
              />

              <Button type="submit" className="w-full">
                Complete Registration
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
