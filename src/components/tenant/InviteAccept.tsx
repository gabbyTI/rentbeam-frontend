import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { formatCurrency } from '../../utils/helpers';
import { fetchInviteDetails, InviteDetails } from '../../services/api';

export const InviteAccept: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [inviteData, setInviteData] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      try {
        const data = await fetchInviteDetails(token);
        setInviteData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load invite details');
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Loading invite details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Invalid Invite
            </h2>
            <p className="mb-6 text-gray-500">
              {error || 'This invite link is invalid or has already been used.'}
            </p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAccept = () => {
    if (inviteData?.userExists) {
      navigate(`/login?token=${token}`);
    } else {
      navigate(`/tenant/register?token=${token}`);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary-600">RentBeam</h1>
          <p className="mt-2 text-gray-600">You've been invited!</p>
        </div>

        <Card>
          <CardContent className="py-6">
            <div className="mb-6 text-center">
              <h2 className="mb-2 text-xl font-semibold">Tenant Invite</h2>
              <p className="text-gray-600">
                {inviteData.landlordName} has invited you to join RentBeam
              </p>
            </div>

            <div className="p-4 mb-6 space-y-4 rounded-lg bg-gray-50">
              <div>
                <label className="text-sm text-gray-500">Property</label>
                <p className="font-medium">{inviteData.property.name}</p>
                <p className="text-sm text-gray-600">{inviteData.property.address}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Unit</label>
                <p className="font-medium">{inviteData.unit.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Monthly Rent</label>
                <p className="font-medium">{formatCurrency(inviteData.rentAmount)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Due Date</label>
                <p className="font-medium">Day {inviteData.dueDay} of each month</p>
              </div>
            </div>

            <Button 
              onClick={handleAccept} 
              className="w-full"
            >
              {inviteData.userExists ? 'Login to Accept Invite' : 'Register to Accept Invite'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
