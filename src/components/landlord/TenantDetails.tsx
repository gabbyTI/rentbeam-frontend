import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select, Input } from '../ui/Input';
import { PaymentHistoryList } from '../ui/PaymentHistoryList';
import { formatCurrency } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { resendTenantInvite, moveOutTenant, updateTenantInfo, transferTenant } from '../../services/api';
import api from '../../services/api';
import { TenantDocuments } from './TenantDocuments';

export const TenantDetails: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { tenants, units, properties, payments, updateState } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [transferPropertyId, setTransferPropertyId] = useState('');
  const [transferUnitId, setTransferUnitId] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Check' | 'Zelle' | 'Venmo' | 'Other'>('Cash');
  const [paymentNote, setPaymentNote] = useState('');

  const tenant = useMemo(() => {
    const t = tenants.find((t) => t.id === tenantId);
    if (!t) return null;

    const unit = units.find((u) => u.id === t.unitId);
    const property = properties.find((p) => p.id === unit?.propertyId);
    const tenantPayments = payments.filter((p) => p.tenantMembershipId === t.id);

    return { ...t, unit, property, payments: tenantPayments };
  }, [tenantId, tenants, units, properties, payments]);

  const landlordProperties = useMemo(() => {
    if (!tenant) return [];
    return properties.filter((p) => p.landlordId === tenant.landlordId);
  }, [properties, tenant]);

  const availableUnits = useMemo(() => {
    if (!transferPropertyId || !tenant) return [];
    const occupiedUnitIds = tenants
      .filter((t) => t.status === 'ACTIVE')
      .map((t) => t.unitId);
    return units.filter(
      (u) => u.propertyId === transferPropertyId && !occupiedUnitIds.includes(u.id)
    );
  }, [units, transferPropertyId, tenants, tenant]);

  const handleMoveOut = async () => {
    if (!tenant) return;

    try {
      const moveOutDate = new Date().toISOString().split('T')[0];
      const result = await moveOutTenant(tenant.id, moveOutDate, tenants);

      if (result.outstandingBalance) {
        showToast(
          `Tenant moved out successfully. Warning: Unpaid rent for ${result.unpaidPeriods.join(', ')}`,
          'info'
        );
      } else {
        showToast('Tenant moved out successfully');
      }

      setShowMoveOutModal(false);
      window.location.reload();
    } catch (error: any) {
      showToast(error.message || 'Failed to move out tenant', 'error');
    }
  };

  const handleTransfer = async () => {
    if (!tenant || !transferUnitId) {
      showToast('Please select a unit', 'error');
      return;
    }

    const newUnit = units.find((u) => u.id === transferUnitId);
    if (!newUnit) return;

    setSaving(true);
    try {
      await transferTenant(
        tenant,
        {
          email: tenant.user?.email || '',
          name: tenant.user?.name || '',
          phone: tenant.user?.phone,
          unitId: transferUnitId,
          moveInDate: new Date().toISOString().split('T')[0],
        },
        tenants
      );

      showToast('Tenant transferred successfully');
      setShowTransferModal(false);
      setTransferPropertyId('');
      setTransferUnitId('');
      window.location.reload();
    } catch (error: any) {
      showToast(error.message || 'Failed to transfer tenant', 'error');
    } finally {
      setSaving(false);
    }
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

  const handleEdit = () => {
    if (!tenant) return;
    setEditName(tenant.user?.name || '');
    setEditPhone(tenant.user?.phone || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!tenant) return;

    // Validation
    if (!editName.trim()) {
      showToast('Name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateTenantInfo(tenant.id, {
        name: editName,
        phone: editPhone || undefined,
      });

      // Update local state
      const updatedTenants = tenants.map((t) =>
        t.id === tenant.id
          ? {
            ...t,
            user: {
              ...t.user!,
              name: editName,
              phone: editPhone || undefined,
            },
          }
          : t
      );
      updateState({ tenantMemberships: updatedTenants });

      showToast('Tenant information updated successfully');
      setShowEditModal(false);
    } catch (error: any) {
      showToast(error.message || 'Failed to update tenant information', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!tenant) return;

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/api/payments', {
        tenantMembershipId: tenant.id,
        amount: amount,
        paidAt: paymentDate,
        paymentMethod: paymentMethod,
        notes: paymentNote || undefined,
      });

      // Refresh payments
      const updatedPayments = [...payments, response.data];
      updateState({ payments: updatedPayments });

      showToast(`Payment recorded: ${formatCurrency(amount)} via ${paymentMethod}`, 'success');
      setShowMarkAsPaidModal(false);

      // Reset form
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentAmount('');
      setPaymentMethod('Cash');
      setPaymentNote('');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to record payment';
      showToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openMarkAsPaidModal = () => {
    if (!tenant) return;
    // Pre-fill with rent amount
    setPaymentAmount(tenant.unit?.rentAmount.toString() || '');
    setShowMarkAsPaidModal(true);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/landlord/tenants')}
        >
          ← Back
        </Button>
        {tenant && tenant.status === 'ACTIVE' && (
          <div className="flex flex-wrap gap-2">
            {tenant.property?.acceptOnlinePayments === false && (
              <Button
                variant="primary"
                size="sm"
                onClick={openMarkAsPaidModal}
              >
                <span className="hidden sm:inline">Mark as Paid</span>
                <span className="sm:hidden">Mark Paid</span>
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTransferModal(true)}
            >
              <span className="hidden sm:inline">Transfer Unit</span>
              <span className="sm:hidden">Transfer</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowMoveOutModal(true)}
            >
              <span className="hidden sm:inline">Move Out</span>
              <span className="sm:hidden">Move Out</span>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Tenant Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold">Tenant Information</h3>
              <Button variant="secondary" size="sm" onClick={handleEdit}>
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-xs sm:text-sm text-gray-500">Name</label>
                <p className="font-medium text-sm sm:text-base">{tenant.user?.name}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm text-gray-500">Login Email</label>
                <p className="font-medium text-sm sm:text-base break-all">{tenant.user?.email}</p>
              </div>
              {tenant.user?.notificationEmail && (
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Notification Email</label>
                  <p className="font-medium text-sm sm:text-base break-all">{tenant.user.notificationEmail}</p>
                </div>
              )}
              {tenant.user?.phone && (
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Phone</label>
                  <p className="font-medium text-sm sm:text-base">{tenant.user.phone}</p>
                </div>
              )}
              <div>
                <label className="text-xs sm:text-sm text-gray-500">Residency Status</label>
                <div className="mt-1">
                  <Badge variant={tenant.status === 'ACTIVE' ? 'current' : 'past'}>
                    {tenant.status === 'ACTIVE' ? 'Current Resident' : 'Past Resident'}
                  </Badge>
                </div>
              </div>
              {tenant.status === 'ACTIVE' && (
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Portal Access</label>
                  <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                    <div>
                      <Badge variant={tenant.inviteStatus === 'ACCEPTED' ? 'accepted' : 'pending'}>
                        {tenant.inviteStatus === 'ACCEPTED' ? 'Accepted' : 'Pending Invite'}
                      </Badge>
                    </div>
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

        {/* Payment Info */}
        {tenant.inviteStatus === 'ACCEPTED' && tenant.status === 'ACTIVE' && (
          <Card>
            <CardHeader>
              <h3 className="text-base sm:text-lg font-semibold">Payment Information</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Payment Method</label>
                  {tenant.defaultPaymentMethodId ? (
                    <div className="mt-1 flex items-center gap-2">
                      <span>💳</span>
                      <span className="font-medium text-sm sm:text-base">{tenant.paymentMethodLabel}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-gray-600 text-sm sm:text-base">No card saved</p>
                  )}
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Autopay</label>
                  <div className="mt-1">
                    <Badge variant={tenant.autopayEnabled ? 'autopay' : 'manual'}>
                      {tenant.autopayEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unit Info */}
        <Card>
          <CardHeader>
            <h3 className="text-base sm:text-lg font-semibold">Unit Details</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-xs sm:text-sm text-gray-500">Property</label>
                <p className="font-medium text-sm sm:text-base">{tenant.property?.name}</p>
                <p className="text-xs sm:text-sm text-gray-600">{tenant.property?.address}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm text-gray-500">Unit</label>
                <p className="font-medium text-sm sm:text-base">{tenant.unit?.name}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm text-gray-500">Monthly Rent</label>
                <p className="font-medium text-sm sm:text-base">{formatCurrency(tenant.unit!.rentAmount)}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm text-gray-500">Due Day</label>
                <p className="font-medium text-sm sm:text-base">Day {tenant.unit?.dueDay ?? 1} of each month</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm text-gray-500">Grace Period</label>
                <p className="font-medium text-sm sm:text-base">
                  {tenant.unit?.gracePeriodDays ?? 0} days (late after day {(tenant.unit?.dueDay ?? 1) + (tenant.unit?.gracePeriodDays ?? 0)})
                </p>
              </div>
              <div>
                <label className="text-xs sm:text-sm text-gray-500">Move-In Date</label>
                <p className="font-medium text-sm sm:text-base">{new Date(tenant.moveInDate).toLocaleDateString()}</p>
              </div>
              {tenant.moveOutDate && (
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Move-Out Date</label>
                  <p className="font-medium text-sm sm:text-base">{new Date(tenant.moveOutDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lease & Profile Info */}
        <Card>
          <CardHeader>
            <h3 className="text-base sm:text-lg font-semibold">Lease & Profile</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenant.leaseType && (
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Lease Type</label>
                  <p className="font-medium text-sm sm:text-base">
                    {tenant.leaseType === 'FIXED_TERM' ? 'Fixed Term' : 'Month-to-Month'}
                  </p>
                </div>
              )}
              {tenant.leaseStartDate && (
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Lease Start</label>
                  <p className="font-medium text-sm sm:text-base">{new Date(tenant.leaseStartDate).toLocaleDateString()}</p>
                </div>
              )}
              {tenant.leaseEndDate && (
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Lease End</label>
                  <p className="font-medium text-sm sm:text-base">{new Date(tenant.leaseEndDate).toLocaleDateString()}</p>
                </div>
              )}
              {tenant.rentDeposit != null && (
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Security Deposit</label>
                  <p className="font-medium text-sm sm:text-base">{formatCurrency(tenant.rentDeposit)}</p>
                </div>
              )}
              {tenant.emergencyContactName && (
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Emergency Contact</label>
                  <p className="font-medium text-sm sm:text-base">{tenant.emergencyContactName}</p>
                  {tenant.emergencyContactPhone && (
                    <p className="text-xs sm:text-sm text-gray-600">{tenant.emergencyContactPhone}</p>
                  )}
                </div>
              )}
              {tenant.notes && (
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Notes</label>
                  <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap">{tenant.notes}</p>
                </div>
              )}
              {!tenant.leaseType && !tenant.leaseStartDate && !tenant.emergencyContactName && !tenant.notes && (
                <p className="text-sm text-gray-400">No additional details recorded.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-base sm:text-lg font-semibold">Documents</h3>
          </CardHeader>
          <CardContent>
            <TenantDocuments
              tenantMembershipId={tenant.id}
              isLandlord={true}
            />
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-base sm:text-lg font-semibold">Payment History</h3>
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
            <p className="text-sm sm:text-base text-gray-700">
              Are you sure you want to move out <strong>{tenant?.user?.name}</strong>?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs sm:text-sm text-yellow-900">
                This will:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-yellow-800 mt-2 space-y-1">
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
              Transfer <strong>{tenant?.user?.name}</strong> to a different unit
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
              <Button onClick={handleTransfer} disabled={saving} className="flex-1">
                {saving ? 'Transferring...' : 'Transfer Tenant'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Tenant Information Modal */}
      {showEditModal && (
        <Modal
          isOpen={true}
          onClose={() => !saving && setShowEditModal(false)}
          title="Edit Tenant Information"
        >
          <div className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter tenant name"
              disabled={saving}
              required
            />

            <div>
              <Input
                label="Login Email"
                type="email"
                value={tenant.user?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                This is the tenant's login email and cannot be changed.
              </p>
            </div>

            {tenant.user?.notificationEmail && (
              <div>
                <Input
                  label="Notification Email"
                  type="email"
                  value={tenant.user.notificationEmail}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tenant can update this in their settings.
                </p>
              </div>
            )}

            <Input
              label="Phone Number (Optional)"
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="Enter phone number"
              disabled={saving}
            />

            <div className="flex space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mark as Paid Modal */}
      {showMarkAsPaidModal && (
        <Modal
          isOpen={true}
          onClose={() => !saving && setShowMarkAsPaidModal(false)}
          title="Record Manual Payment"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-900">
                Recording a manual payment for <strong>{tenant.user?.name}</strong>
              </p>
            </div>

            <Input
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={saving}
              required
            />

            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              disabled={saving}
              required
            />

            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              disabled={saving}
            >
              <option value="Cash">💵 Cash</option>
              <option value="Check">✓ Check</option>
              <option value="Zelle">Ⓩ Zelle</option>
              <option value="Venmo">Ⓥ Venmo</option>
              <option value="Other">Other</option>
            </Select>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Add any additional notes..."
                disabled={saving}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowMarkAsPaidModal(false)}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkAsPaid}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
};
