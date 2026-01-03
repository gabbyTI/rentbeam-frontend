import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { formatCurrency } from '../../utils/helpers';

export const InviteAccept: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { tenants, units, properties, landlords } = useApp();
  const navigate = useNavigate();

  const inviteData = useMemo(() => {
    const tenant = tenants.find((t) => t.inviteToken === token);
    if (!tenant) return null;

    const unit = units.find((u) => u.id === tenant.unitId);
    const property = properties.find((p) => p.id === unit?.propertyId);
    const landlord = landlords.find((l) => l.id === tenant.landlordId);

    return { tenant, unit, property, landlord };
  }, [token, tenants, units, properties, landlords]);

  if (!inviteData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invalid Invite
            </h2>
            <p className="text-gray-500 mb-6">
              This invite link is invalid or has already been used.
            </p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { tenant, unit, property, landlord } = inviteData;

  if (tenant.inviteStatus === 'accepted') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invite Already Accepted
            </h2>
            <p className="text-gray-500 mb-6">
              You've already accepted this invite.
            </p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAccept = () => {
    navigate(`/tenant/register?token=${token}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">RentTrack Lite</h1>
          <p className="mt-2 text-gray-600">You've been invited!</p>
        </div>

        <Card>
          <CardContent className="py-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Tenant Invite</h2>
              <p className="text-gray-600">
                {landlord?.name} has invited you to join RentTrack Lite
              </p>
            </div>

            <div className="space-y-4 bg-gray-50 p-4 rounded-lg mb-6">
              <div>
                <label className="text-sm text-gray-500">Property</label>
                <p className="font-medium">{property?.name}</p>
                <p className="text-sm text-gray-600">{property?.address}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Unit</label>
                <p className="font-medium">{unit?.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Monthly Rent</label>
                <p className="font-medium">{formatCurrency(tenant.rentAmount)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Due Date</label>
                <p className="font-medium">Day {unit?.dueDay ?? 1} of each month</p>
              </div>
            </div>

            <Button onClick={handleAccept} className="w-full">
              Accept Invite
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
