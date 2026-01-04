import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Input';
import { PaymentHistoryList } from '../ui/PaymentHistoryList';
import { formatCurrency } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { resendTenantInvite } from '../../services/api';

export const TenantDetails: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { tenants, units, properties, payments, updateState } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferPropertyId, setTransferPropertyId] = useState('');
  const [transferUnitId, setTransferUnitId] = useState('');

  const tenant = useMemo(() => {
    const t = tenants.find((t) => t.id === tenantId);
    if (!t) return null;

    const unit = units.find((u) => u.id === t.unitId);
    const property = properties.find((p) => p.id === unit?.propertyId);
    const tenantPayments = payments.filter((p) => p.tenantId === t.id);

    return { ...t, unit, property, payments: tenantPayments };
  }, [tenantId, tenants, units, properties, payments]);

  const landlordProperties = useMemo(() => {
    if (!tenant) return [];
    return properties.filter((p) => p.landlordId === tenant.landlordId);
  }, [properties, tenant]);

  const availableUnits = useMemo(() => {
    if (!transferPropertyId) return [];
    const occupiedUnitIds = tenants
      .filter((t) => t.status === 'ACTIVE' && t.id !== tenantId)
      .map((t) => t.unitId);
    return units.filter(
      (u) => u.propertyId === transferPropertyId && !occupiedUnitIds.includes(u.id)
    );
  }, [units, transferPropertyId, tenants, tenantId]);

  const handleMoveOut = () => {
    if (!tenant) return;

    const updatedTenants = tenants.map((t) =>
      t.id === tenant.id
        ? {
            ...t,
            status: 'INACTIVE' as const,
            autopayEnabled: false,
            paymentMethodLabel: undefined,
            moveOutDate: new Date().toISOString().split('T')[0],
          }
        : t
    );

    updateState({ tenants: updatedTenants });
    showToast('Tenant moved out successfully');
    setShowMoveOutModal(false);
    navigate('/landlord/tenants');
  };

  const handleTransfer = () => {
    if (!tenant || !transferUnitId) {
      showToast('Please select a unit', 'error');
      return;
    }

    const newUnit = units.find((u) => u.id === transferUnitId);
    if (!newUnit) return;

    // Create new tenant record for new unit
    const newTenantRecord = {
      ...tenant,
      id: `tenant-${Date.now()}`,
      unitId: transferUnitId,
      rentAmount: newUnit.rentAmount,
      status: 'ACTIVE' as const,
      moveInDate: new Date().toISOString().split('T')[0],
      moveOutDate: undefined,
      createdAt: new Date().toISOString(),
    };

    // Mark old tenant record as past (preserves old unit history)
    const updatedTenants = tenants.map((t) =>
      t.id === tenant.id
        ? {
            ...t,
            status: 'INACTIVE' as const,
            autopayEnabled: false,
            paymentMethodLabel: undefined,
            moveOutDate: new Date().toISOString().split('T')[0],
          }
        : t
    );

    updateState({ tenants: [...updatedTenants, newTenantRecord] });
    showToast('Tenant transferred successfully');
    setShowTransferModal(false);
    setTransferPropertyId('');
    setTransferUnitId('');
    navigate('/landlord/tenants');
  };

  const handleResendInvite = async () => {
    if (!tenant) return;

    try {
      await resendTenantInvite(tenant.id);
      showToast('Invite resent successfully');
    } catch (error: any) {
      showToast(error.message || 'Failed to resend invite', 'error');
    }
  };

  if (!tenant) {
    return (
      <AppShell title="Tenant Details">
        <div className="text-center py-12">
          <p className="text-gray-500">Tenant not found</p>
          <Button onClick={() => navigate('/landlord/tenants')} className="mt-4">
            Back to Tenants
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Tenant Details">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/landlord/tenants')}
        >
          ← Back to Tenants
        </Button>
        {tenant && tenant.status === 'ACTIVE' && (
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTransferModal(true)}
            >
              Transfer Unit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowMoveOutModal(true)}
            >
              Move Out
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Info */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Tenant Information</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <p className="font-medium">{tenant.user?.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-medium">{tenant.user?.email}</p>
              </div>
              {tenant.user?.phone && (
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <p className="font-medium">{tenant.user.phone}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-500">Residency Status</label>
                <div className="mt-1">
                  <Badge variant={tenant.status === 'ACTIVE' ? 'current' : 'past'}>
                    {tenant.status === 'ACTIVE' ? 'Current Resident' : 'Past Resident'}
                  </Badge>
                </div>
              </div>
              {tenant.status === 'ACTIVE' && (
                <div>
                  <label className="text-sm text-gray-500">Portal Access</label>
                  <div className="mt-1 flex items-center justify-between">
                    <Badge variant={tenant.inviteStatus === 'ACCEPTED' ? 'accepted' : 'pending'}>
                      {tenant.inviteStatus === 'ACCEPTED' ? 'Accepted' : 'Pending Invite'}
                    </Badge>
                    {tenant.inviteStatus === 'PENDING' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleResendInvite}
                      >
                        Resend Invite
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unit Info */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Unit Details</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">Property</label>
                <p className="font-medium">{tenant.property?.name}</p>
                <p className="text-sm text-gray-600">{tenant.property?.address}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Unit</label>
                <p className="font-medium">{tenant.unit?.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Monthly Rent</label>
                <p className="font-medium">{formatCurrency(tenant.rentAmount)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Due Day</label>
                <p className="font-medium">Day {tenant.unit?.dueDay ?? 1} of each month</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Grace Period</label>
                <p className="font-medium">
                  {tenant.unit?.gracePeriodDays ?? 0} days (late after day {(tenant.unit?.dueDay ?? 1) + (tenant.unit?.gracePeriodDays ?? 0)})
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Move-In Date</label>
                <p className="font-medium">{new Date(tenant.moveInDate).toLocaleDateString()}</p>
              </div>
              {tenant.moveOutDate && (
                <div>
                  <label className="text-sm text-gray-500">Move-Out Date</label>
                  <p className="font-medium">{new Date(tenant.moveOutDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-lg font-semibold">Payment History</h3>
          </CardHeader>
          <CardContent>
            <PaymentHistoryList 
              payments={tenant.payments} 
              dueDay={tenant.unit?.dueDay ?? 1}
              gracePeriodDays={tenant.unit?.gracePeriodDays ?? 0}
            />
          </CardContent>
        </Card>
      </div>

      {/* Move Out Confirmation Modal */}
      {showMoveOutModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowMoveOutModal(false)}
          title="Move Out Tenant"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to move out <strong>{tenant?.name}</strong>?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-900">
                This will:
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-800 mt-2 space-y-1">
                <li>Free up the unit for new tenants</li>
                <li>Disable autopay (if enabled)</li>
                <li>Mark tenant as "Moved Out"</li>
                <li>Preserve all payment history</li>
              </ul>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowMoveOutModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleMoveOut} className="flex-1">
                Confirm Move Out
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Transfer Unit Modal */}
      {showTransferModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowTransferModal(false);
            setTransferPropertyId('');
            setTransferUnitId('');
          }}
          title="Transfer to Another Unit"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Transfer <strong>{tenant?.name}</strong> to a different unit
            </p>

            <Select
              label="Property"
              value={transferPropertyId}
              onChange={(e) => {
                setTransferPropertyId(e.target.value);
                setTransferUnitId('');
              }}
            >
              <option value="">Select a property</option>
              {landlordProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </Select>

            {transferPropertyId && (
              <Select
                label="Unit"
                value={transferUnitId}
                onChange={(e) => setTransferUnitId(e.target.value)}
              >
                <option value="">Select a unit</option>
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} - ${unit.rentAmount}/month (Due day {unit.dueDay})
                  </option>
                ))}
              </Select>
            )}

            {transferUnitId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  Rent amount and due date will be updated to match the new unit's settings.
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferPropertyId('');
                  setTransferUnitId('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleTransfer} className="flex-1">
                Transfer Tenant
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
};
