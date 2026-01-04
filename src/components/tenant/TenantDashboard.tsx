import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PaymentHistoryList } from '../ui/PaymentHistoryList';
import { formatCurrency } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { getCurrentUser, getTenantMembership, TenantMembershipDetails } from '../../services/api';

export const TenantDashboard: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState<TenantMembershipDetails | null>(null);

  useEffect(() => {
    const loadTenantData = async () => {
      try {
        const profile = await getCurrentUser();
        
        if (!profile.memberships.tenants || profile.memberships.tenants.length === 0) {
          showToast('No tenant membership found', 'error');
          navigate('/login');
          return;
        }

        // Get the first tenant membership (user could have multiple in theory)
        const membershipId = profile.memberships.tenants[0].id;
        const membership = await getTenantMembership(membershipId);
        setTenantData(membership);
      } catch (err: any) {
        showToast(err.message || 'Failed to load tenant data', 'error');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    loadTenantData();
  }, [navigate, showToast]);

  if (loading) {
    return (
      <AppShell title="Dashboard">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (!tenantData) {
    return (
      <AppShell title="Dashboard">
        <div className="text-center py-12">
          <p className="text-gray-500">Tenant data not found</p>
        </div>
      </AppShell>
    );
  }

  const { unit, user } = tenantData;
  const property = unit.property;
  const landlord = unit.property.landlord;

  const handleDisableAutopay = () => {
    // TODO: Implement API call to disable autopay
    showToast('Autopay disabled');
    setShowDisableModal(false);
  };

  return (
    <AppShell title="Dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">Current Rent</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {property.name} - Unit {unit.name}
                </p>
              </div>
              <Badge variant={tenantData.status === 'ACTIVE' ? 'current' : 'past'}>
                {tenantData.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm text-gray-500">Monthly Rent</label>
                <p className="text-2xl font-semibold">
                  {formatCurrency(tenantData.rentAmount)}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Due Date</label>
                <p className="text-2xl font-semibold">Day {unit.dueDay}</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Property Address</span>
                <span className="font-medium">{property.address}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Landlord</span>
                <span className="font-medium">{landlord.user.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Move-in Date</span>
                <span className="font-medium">
                  {new Date(tenantData.moveInDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Autopay Card */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Autopay</h3>
          </CardHeader>
          <CardContent>
            {tenantData.autopayEnabled ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">Active</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Rent will be automatically charged on the {unit.dueDay}
                  {unit.dueDay === 1 ? 'st' : unit.dueDay === 2 ? 'nd' : unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Payment method: {tenantData.paymentMethodLabel || 'Card'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowDisableModal(true)}
                  className="w-full"
                >
                  Disable Autopay
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Inactive</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Enable autopay to automatically pay your rent each month.
                </p>
                <Button onClick={() => navigate('/tenant/autopay')} className="w-full">
                  Enable Autopay
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <h3 className="text-lg font-semibold">Payment History</h3>
          </CardHeader>
          <CardContent>
            <PaymentHistoryList payments={[]} />
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        title="Disable Autopay"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to disable autopay? You'll need to manually pay your rent
          each month.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowDisableModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleDisableAutopay}>Disable Autopay</Button>
        </div>
      </Modal>
    </AppShell>
  );
};
