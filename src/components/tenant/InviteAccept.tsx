import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { formatCurrency } from '../../utils/helpers';
import { fetchInviteDetails, InviteDetails, acceptInvite } from '../../services/api';
import { authService } from '../../services/auth';
import { useToast } from '../../context/ToastContext';

export const InviteAccept: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [inviteData, setInviteData] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isLoggedIn = authService.isAuthenticated();

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Loading invite details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invalid Invite
            </h2>
            <p className="text-gray-500 mb-6">
              {error || 'This invite link is invalid or has already been used.'}
            </p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAccept = async () => {
    if (!token) return;
    
    if (isLoggedIn) {
      // User is already logged in - accept invite directly
      setAccepting(true);
      try {
        await acceptInvite(token, { password: '' }); // Empty password for existing users
        showToast('Invite accepted! You now have access to this property.');
        // Force page reload to update memberships and show role selector
        window.location.href = '/';
      } catch (error: any) {
        showToast(error.message || 'Failed to accept invite', 'error');
      } finally {
        setAccepting(false);
      }
    } else {
      // User not logged in - redirect to registration
      navigate(`/tenant/register?token=${token}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">RentBeam</h1>
          <p className="mt-2 text-gray-600">You've been invited!</p>
        </div>

        <Card>
          <CardContent className="py-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Tenant Invite</h2>
              <p className="text-gray-600">
                {inviteData.landlordName} has invited you to join RentBeam
              </p>
            </div>

            <div className="space-y-4 bg-gray-50 p-4 rounded-lg mb-6">
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
              disabled={accepting}
            >
              {accepting ? 'Accepting...' : (isLoggedIn ? 'Accept Invite' : 'Accept Invite & Register')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
