import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select, Input } from '../ui/Input';
import { LedgerStatement } from '../ui/LedgerStatement';
import { formatCurrency } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { resendTenantInvite, moveOutTenant, updateTenantInfo, transferTenant } from '../../services/api';
import api from '../../services/api';
import { TenantDocuments } from './TenantDocuments';

export const TenantDetails: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { tenants, units, properties, updateState } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [transferPropertyId, setTransferPropertyId] = useState('');
  const [transferUnitId, setTransferUnitId] = useState('');
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    leaseStartDate: '',
    leaseEndDate: '',
    leaseType: 'FIXED_TERM' as 'FIXED_TERM' | 'MONTH_TO_MONTH',
    rentDeposit: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
  });
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

    return { ...t, unit, property };
  }, [tenantId, tenants, units, properties]);

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
      await transferTenant(tenant.id, transferUnitId, tenants);

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
    const nameParts = (tenant.user?.name || '').trim().split(/\s+/);
    setEditForm({
      firstName: tenant.user?.firstName || nameParts[0] || '',
      lastName: tenant.user?.lastName || nameParts.slice(1).join(' '),
      phone: tenant.user?.phone || '',
      leaseStartDate: tenant.leaseStartDate?.slice(0, 10) || '',
      leaseEndDate: tenant.leaseEndDate?.slice(0, 10) || '',
      leaseType: tenant.leaseType || 'FIXED_TERM',
      rentDeposit: tenant.rentDeposit == null ? '' : String(tenant.rentDeposit),
      dateOfBirth: tenant.dateOfBirth?.slice(0, 10) || '',
      emergencyContactName: tenant.emergencyContactName || '',
      emergencyContactPhone: tenant.emergencyContactPhone || '',
      notes: tenant.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!tenant) return;

    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      showToast('First and last name are required', 'error');
      return;
    }

    const rentDeposit = editForm.rentDeposit.trim() ? Number(editForm.rentDeposit) : null;
    if (rentDeposit !== null && (!Number.isFinite(rentDeposit) || rentDeposit < 0)) {
      showToast('Security deposit must be zero or a positive amount', 'error');
      return;
    }

    if (editForm.leaseStartDate && editForm.leaseEndDate && editForm.leaseEndDate < editForm.leaseStartDate) {
      showToast('Lease end date cannot be before lease start date', 'error');
      return;
    }

    setSaving(true);
    try {
      const updatedTenant = await updateTenantInfo(tenant.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim() || null,
        leaseStartDate: editForm.leaseStartDate || null,
        leaseEndDate: editForm.leaseEndDate || null,
        leaseType: editForm.leaseType,
        rentDeposit,
        dateOfBirth: editForm.dateOfBirth || null,
        emergencyContactName: editForm.emergencyContactName.trim() || null,
        emergencyContactPhone: editForm.emergencyContactPhone.trim() || null,
        notes: editForm.notes.trim() || null,
      });

      const updatedTenants = tenants.map((t) =>
        t.id === tenant.id ? updatedTenant : t
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
      await api.post('/api/payments', {
        tenantMembershipId: tenant.id,
        amount: amount,
        paidAt: paymentDate,
        paymentMethod: paymentMethod,
        notes: paymentNote || undefined,
      });

      showToast(`Payment recorded: ${formatCurrency(amount)} via ${paymentMethod}`, 'success');
      setShowMarkAsPaidModal(false);

      // Reset form
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentAmount('');
      setPaymentMethod('Cash');
      setPaymentNote('');
      window.location.reload();
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
              {!tenant.leaseType && !tenant.leaseStartDate && !tenant.leaseEndDate && tenant.rentDeposit == null && !tenant.dateOfBirth && !tenant.emergencyContactName && !tenant.emergencyContactPhone && !tenant.notes && (
                <p className="text-sm text-gray-400">No lease or profile details recorded.</p>
              )}

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
              {tenant.dateOfBirth && (
                <div>
                  <label className="text-xs sm:text-sm text-gray-500">Date of Birth</label>
                  <p className="font-medium text-sm sm:text-base">{new Date(tenant.dateOfBirth).toLocaleDateString()}</p>
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
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-semibold">Documents</h3>
              <span className="text-[10px] uppercase tracking-wide text-gray-500">Optional</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">Attach lease or supporting documents if needed. This is optional and does not block tenant activity.</p>
            <TenantDocuments
              tenantMembershipId={tenant.id}
              isLandlord={true}
            />
          </CardContent>
        </Card>

        {/* Resident Ledger */}
        <div className="lg:col-span-2">
          <LedgerStatement
            tenantMembershipId={tenant.id}
            isLandlord={true}
            tenantName={tenant.user?.name}
          />
        </div>

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
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              The tenant, ledger balance, payment history, portal access, and autopay settings will stay unchanged. Only the unit assignment will change.
            </div>

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
                  Future charges will use the new unit's rent and due-date settings.
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
          title="Edit Tenant Details"
        >
          <div className="max-h-[75vh] space-y-5 overflow-y-auto px-1">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Contact information</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="First name"
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  disabled={saving}
                  required
                />
                <Input
                  label="Last name"
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  disabled={saving}
                  required
                />
              </div>

              <div>
                <Input
                  label="Login email"
                  type="email"
                  value={tenant.user?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The tenant manages their login email through their account.
                </p>
              </div>

              <div>
                <Input
                  label="Notification email"
                  type="email"
                  value={tenant.user?.notificationEmail || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The tenant manages their notification email in their settings.
                </p>
              </div>

              <Input
                label="Phone number (optional)"
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="Enter phone number"
                disabled={saving}
              />
            </div>

            <div className="space-y-3 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-900">Lease & profile</h4>
              <Select
                label="Lease type"
                value={editForm.leaseType}
                onChange={(e) => setEditForm({ ...editForm, leaseType: e.target.value as 'FIXED_TERM' | 'MONTH_TO_MONTH' })}
                disabled={saving}
              >
                <option value="FIXED_TERM">Fixed term</option>
                <option value="MONTH_TO_MONTH">Month-to-month</option>
              </Select>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Lease start date"
                  type="date"
                  value={editForm.leaseStartDate}
                  onChange={(e) => setEditForm({ ...editForm, leaseStartDate: e.target.value })}
                  disabled={saving}
                />
                <Input
                  label="Lease end date"
                  type="date"
                  value={editForm.leaseEndDate}
                  onChange={(e) => setEditForm({ ...editForm, leaseEndDate: e.target.value })}
                  disabled={saving}
                />
                <Input
                  label="Security deposit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.rentDeposit}
                  onChange={(e) => setEditForm({ ...editForm, rentDeposit: e.target.value })}
                  disabled={saving}
                />
                <Input
                  label="Date of birth"
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Emergency contact name"
                  value={editForm.emergencyContactName}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                  disabled={saving}
                />
                <Input
                  label="Emergency contact phone"
                  type="tel"
                  value={editForm.emergencyContactPhone}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  disabled={saving}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                />
              </div>
            </div>

            <div className="flex space-x-3 border-t border-gray-200 pt-4">
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
