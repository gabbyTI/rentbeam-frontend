import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { AppShell } from '../ui/AppShell';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { formatCurrency } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const LandlordTenants: React.FC = () => {
  const { currentUser, tenants, properties, units } = useApp();
  const api = useApi();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [addingTenant, setAddingTenant] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  const [tenantForm, setTenantForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    propertyId: '',
    unitId: '',
    moveInDate: new Date().toISOString().split('T')[0],
    // Additional details
    leaseStartDate: '',
    leaseEndDate: '',
    leaseType: 'FIXED_TERM',
    rentDeposit: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
    // Opening ledger entries (optional)
    openingChargeEnabled: false,
    openingChargeAmount: '',
    openingChargeCode: 'RNTA',
    openingChargeDescription: 'Opening Rent Charge',
    openingCreditEnabled: false,
    openingCreditAmount: '',
    openingCreditCode: 'CONC',
    openingCreditDescription: 'Opening Concession',
    openingPaymentEnabled: false,
    openingPaymentAmount: '',
    openingPaymentDescription: 'Opening Manual Payment',
    openingEffectiveDate: '',
  });

  const landlordProperties = useMemo(() => {
    return properties.filter((p) => p.landlordId === currentUser?.id);
  }, [properties, currentUser]);

  const availableUnits = useMemo(() => {
    if (!tenantForm.propertyId) return [];
    const occupiedUnitIds = tenants
      .filter((t) => t.status === 'ACTIVE')
      .map((t) => t.unitId);
    return units.filter(
      (u) => u.propertyId === tenantForm.propertyId && !occupiedUnitIds.includes(u.id)
    );
  }, [units, tenantForm.propertyId, tenants]);

  const landlordTenants = useMemo(() => {
    const filterStatus = showArchive ? 'INACTIVE' : 'ACTIVE';
    return tenants
      .filter((t) => t.landlordId === currentUser?.id && t.status === filterStatus)
      .map((tenant) => {
        const unit = units.find((u) => u.id === tenant.unitId);
        const property = properties.find((p) => p.id === unit?.propertyId);
        return { ...tenant, unit, property };
      });
  }, [tenants, units, properties, currentUser, showArchive]);

  const handlePropertyChange = (propertyId: string) => {
    setTenantForm({
      ...tenantForm,
      propertyId,
      unitId: '',
    });
  };

  const handleUnitChange = (unitId: string) => {
    const selectedUnit = units.find((u) => u.id === unitId);
    setTenantForm({
      ...tenantForm,
      unitId,
      openingChargeAmount: selectedUnit && !tenantForm.openingChargeAmount
        ? String(selectedUnit.rentAmount)
        : tenantForm.openingChargeAmount,
    });
  };

  const handleAddTenant = async () => {
    if (
      !tenantForm.firstName ||
      !tenantForm.lastName ||
      !tenantForm.email ||
      !tenantForm.unitId
    ) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setAddingTenant(true);
    try {
      const openingLedgerEntries: Array<{
        type: 'CHARGE' | 'PAYMENT' | 'CREDIT';
        amount: number;
        description: string;
        code?: string;
        effectiveDate?: string;
      }> = [];

      if (tenantForm.openingChargeEnabled && tenantForm.openingChargeAmount) {
        openingLedgerEntries.push({
          type: 'CHARGE',
          amount: parseFloat(tenantForm.openingChargeAmount),
          code: tenantForm.openingChargeCode || 'RNTA',
          description: tenantForm.openingChargeDescription || 'Opening Rent Charge',
          effectiveDate: tenantForm.openingEffectiveDate || tenantForm.moveInDate || undefined,
        });
      }

      if (tenantForm.openingCreditEnabled && tenantForm.openingCreditAmount) {
        openingLedgerEntries.push({
          type: 'CREDIT',
          amount: parseFloat(tenantForm.openingCreditAmount),
          code: tenantForm.openingCreditCode || 'CONC',
          description: tenantForm.openingCreditDescription || 'Opening Concession',
          effectiveDate: tenantForm.openingEffectiveDate || tenantForm.moveInDate || undefined,
        });
      }

      if (tenantForm.openingPaymentEnabled && tenantForm.openingPaymentAmount) {
        openingLedgerEntries.push({
          type: 'PAYMENT',
          amount: parseFloat(tenantForm.openingPaymentAmount),
          description: tenantForm.openingPaymentDescription || 'Opening Manual Payment',
          effectiveDate: tenantForm.openingEffectiveDate || tenantForm.moveInDate || undefined,
        });
      }

      await api.createTenant({
        email: tenantForm.email,
        firstName: tenantForm.firstName,
        lastName: tenantForm.lastName,
        phone: tenantForm.phone || undefined,
        unitId: tenantForm.unitId,
        moveInDate: tenantForm.moveInDate,
        leaseStartDate: tenantForm.leaseStartDate || undefined,
        leaseEndDate: tenantForm.leaseEndDate || undefined,
        leaseType: tenantForm.leaseType || undefined,
        rentDeposit: tenantForm.rentDeposit ? parseFloat(tenantForm.rentDeposit) : undefined,
        dateOfBirth: tenantForm.dateOfBirth || undefined,
        emergencyContactName: tenantForm.emergencyContactName || undefined,
        emergencyContactPhone: tenantForm.emergencyContactPhone || undefined,
        notes: tenantForm.notes || undefined,
        openingLedgerEntries: openingLedgerEntries.length > 0 ? openingLedgerEntries : undefined,
      });

      showToast(`Tenant added successfully. Invite sent to ${tenantForm.email}`);
      setIsAdding(false);
      setTenantForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        propertyId: '',
        unitId: '',
        moveInDate: new Date().toISOString().split('T')[0],
        leaseStartDate: '',
        leaseEndDate: '',
        leaseType: 'FIXED_TERM',
        rentDeposit: '',
        dateOfBirth: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        notes: '',
        openingChargeEnabled: false,
        openingChargeAmount: '',
        openingChargeCode: 'RNTA',
        openingChargeDescription: 'Opening Rent Charge',
        openingCreditEnabled: false,
        openingCreditAmount: '',
        openingCreditCode: 'CONC',
        openingCreditDescription: 'Opening Concession',
        openingPaymentEnabled: false,
        openingPaymentAmount: '',
        openingPaymentDescription: 'Opening Manual Payment',
        openingEffectiveDate: '',
      });
      window.location.reload();
    } catch (error: any) {
      showToast(error.message || 'Failed to add tenant', 'error');
    } finally {
      setAddingTenant(false);
    }
  };

  return (
    <AppShell title="Tenants">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <div className="flex gap-2 sm:gap-4 items-center">
          <h2 className="text-xl sm:text-2xl font-bold">Tenants</h2>
          <Button
            variant={showArchive ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setShowArchive(!showArchive)}
          >
            <span className="hidden sm:inline">{showArchive ? 'Show Current' : 'Show Archive'}</span>
            <span className="sm:hidden">{showArchive ? 'Current' : 'Archive'}</span>
          </Button>
        </div>
        <Button onClick={() => setIsAdding(true)} size="sm">
          <span className="hidden sm:inline">Add Tenant</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {landlordTenants.length === 0 ? (
        <EmptyState
          title={showArchive ? 'No past tenants' : 'No tenants yet'}
          description={showArchive ? 'Past tenants will appear here' : 'Add your first tenant to get started'}
          action={!showArchive ? <Button onClick={() => setIsAdding(true)}>Add Tenant</Button> : undefined}
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-3">
            {landlordTenants.map((tenant) => (
              <div key={tenant.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {tenant.user?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{tenant.user?.email}</p>
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {tenant.property?.name} - {tenant.unit?.name}
                    </p>
                  </div>
                  <Badge variant={tenant.status === 'ACTIVE' ? 'current' : 'past'}>
                    {tenant.status === 'ACTIVE' ? 'Current' : 'Past'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                  <div>
                    <span className="text-gray-500">Rent</span>
                    <p className="font-medium text-gray-900">{formatCurrency(tenant.unit!.rentAmount)}</p>
                  </div>
                  {tenant.status === 'ACTIVE' && (
                    <div>
                      <span className="text-gray-500">Portal</span>
                      <div className="mt-0.5">
                        <Badge variant={tenant.inviteStatus === 'ACCEPTED' ? 'accepted' : 'pending'}>
                          {tenant.inviteStatus === 'ACCEPTED' ? 'Accepted' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {tenant.defaultPaymentMethodId && (
                    <div>
                      <span className="text-gray-500">Payment</span>
                      <p className="font-medium text-gray-900">
                        💳 {tenant.paymentMethodLabel}
                      </p>
                    </div>
                  )}
                  {tenant.inviteStatus === 'ACCEPTED' && tenant.status === 'ACTIVE' && (
                    <div>
                      <span className="text-gray-500">Autopay</span>
                      <div className="mt-0.5">
                        <Badge variant={tenant.autopayEnabled ? 'autopay' : 'manual'}>
                          {tenant.autopayEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/landlord/tenants/${tenant.id}`)}
                  className="w-full"
                >
                  View Details
                </Button>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property & Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Residency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Portal Access
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Autopay
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {landlordTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {tenant.user?.name}
                      </div>
                      <div className="text-sm text-gray-500">{tenant.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {tenant.property?.name}
                      </div>
                      <div className="text-sm text-gray-500">{tenant.unit?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(tenant.unit!.rentAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={tenant.status === 'ACTIVE' ? 'current' : 'past'}>
                        {tenant.status === 'ACTIVE' ? 'Current' : 'Past'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.status === 'ACTIVE' ? (
                        <Badge variant={tenant.inviteStatus === 'ACCEPTED' ? 'accepted' : 'pending'}>
                          {tenant.inviteStatus === 'ACCEPTED' ? 'Accepted' : 'Pending'}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {tenant.defaultPaymentMethodId ? (
                        <div className="flex items-center gap-1">
                          <span>💳</span>
                          <span className="text-gray-900">{tenant.paymentMethodLabel}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No card</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.inviteStatus === 'ACCEPTED' && tenant.status === 'ACTIVE' && (
                        <Badge variant={tenant.autopayEnabled ? 'autopay' : 'manual'}>
                          {tenant.autopayEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/landlord/tenants/${tenant.id}`)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Tenant Modal */}
      {isAdding && (
        <Modal
          isOpen={true}
          onClose={() => setIsAdding(false)}
          title="Add Tenant"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p>
                <strong>Ledger-first:</strong> No rent is assumed paid when creating a tenant.
                Add opening entries below only if you want to seed an opening balance.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                type="text"
                value={tenantForm.firstName}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, firstName: e.target.value })
                }
                placeholder="John"
              />
              <Input
                label="Last Name"
                type="text"
                value={tenantForm.lastName}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, lastName: e.target.value })
                }
                placeholder="Doe"
              />
            </div>

            <Input
              label="Tenant Email"
              type="email"
              value={tenantForm.email}
              onChange={(e) =>
                setTenantForm({ ...tenantForm, email: e.target.value })
              }
              placeholder="tenant@example.com"
            />

            <Input
              label="Phone (optional)"
              type="tel"
              value={tenantForm.phone}
              onChange={(e) =>
                setTenantForm({ ...tenantForm, phone: e.target.value })
              }
              placeholder="(555) 123-4567"
            />

            <Select
              label="Property"
              value={tenantForm.propertyId}
              onChange={(e) => handlePropertyChange(e.target.value)}
            >
              <option value="">Select a property</option>
              {landlordProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </Select>

            {tenantForm.propertyId && (
              <Select
                label="Unit"
                value={tenantForm.unitId}
                onChange={(e) => handleUnitChange(e.target.value)}
              >
                <option value="">Select a unit</option>
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} - ${unit.rentAmount}/month
                  </option>
                ))}
              </Select>
            )}

            <Input
              label="Move-in Date"
              type="date"
              value={tenantForm.moveInDate}
              onChange={(e) =>
                setTenantForm({ ...tenantForm, moveInDate: e.target.value })
              }
            />

            {/* Opening Ledger Entries */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-800">Opening Ledger Entries (optional)</h4>

              <Input
                label="Opening Effective Date (optional)"
                type="date"
                value={tenantForm.openingEffectiveDate}
                onChange={(e) => setTenantForm({ ...tenantForm, openingEffectiveDate: e.target.value })}
              />

              <div className="space-y-2 border border-gray-100 rounded-lg p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={tenantForm.openingChargeEnabled}
                    onChange={(e) => setTenantForm({ ...tenantForm, openingChargeEnabled: e.target.checked })}
                  />
                  Add opening charge
                </label>
                {tenantForm.openingChargeEnabled && (
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="Charge Code"
                      type="text"
                      value={tenantForm.openingChargeCode}
                      onChange={(e) => setTenantForm({ ...tenantForm, openingChargeCode: e.target.value.toUpperCase() })}
                      placeholder="RNTA"
                    />
                    <Input
                      label="Amount"
                      type="number"
                      value={tenantForm.openingChargeAmount}
                      onChange={(e) => setTenantForm({ ...tenantForm, openingChargeAmount: e.target.value })}
                      placeholder="0.00"
                    />
                    <Input
                      label="Description"
                      type="text"
                      value={tenantForm.openingChargeDescription}
                      onChange={(e) => setTenantForm({ ...tenantForm, openingChargeDescription: e.target.value })}
                      placeholder="Opening Rent Charge"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2 border border-gray-100 rounded-lg p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={tenantForm.openingCreditEnabled}
                    onChange={(e) => setTenantForm({ ...tenantForm, openingCreditEnabled: e.target.checked })}
                  />
                  Add opening credit
                </label>
                {tenantForm.openingCreditEnabled && (
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="Credit Code"
                      type="text"
                      value={tenantForm.openingCreditCode}
                      onChange={(e) => setTenantForm({ ...tenantForm, openingCreditCode: e.target.value.toUpperCase() })}
                      placeholder="CONC"
                    />
                    <Input
                      label="Amount"
                      type="number"
                      value={tenantForm.openingCreditAmount}
                      onChange={(e) => setTenantForm({ ...tenantForm, openingCreditAmount: e.target.value })}
                      placeholder="0.00"
                    />
                    <Input
                      label="Description"
                      type="text"
                      value={tenantForm.openingCreditDescription}
                      onChange={(e) => setTenantForm({ ...tenantForm, openingCreditDescription: e.target.value })}
                      placeholder="Opening Concession"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2 border border-gray-100 rounded-lg p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={tenantForm.openingPaymentEnabled}
                    onChange={(e) => setTenantForm({ ...tenantForm, openingPaymentEnabled: e.target.checked })}
                  />
                  Add opening payment (already paid)
                </label>
                {tenantForm.openingPaymentEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Amount"
                      type="number"
                      value={tenantForm.openingPaymentAmount}
                      onChange={(e) => setTenantForm({ ...tenantForm, openingPaymentAmount: e.target.value })}
                      placeholder="0.00"
                    />
                    <Input
                      label="Description"
                      type="text"
                      value={tenantForm.openingPaymentDescription}
                      onChange={(e) => setTenantForm({ ...tenantForm, openingPaymentDescription: e.target.value })}
                      placeholder="Opening Manual Payment"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Additional Details — collapsible */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span>Additional Details (optional)</span>
                <span className="text-gray-400 text-xs">{showAdditionalDetails ? '▲ Hide' : '▼ Show'}</span>
              </button>

              {showAdditionalDetails && (
                <div className="p-4 space-y-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Lease Start Date"
                      type="date"
                      value={tenantForm.leaseStartDate}
                      onChange={(e) => setTenantForm({ ...tenantForm, leaseStartDate: e.target.value })}
                    />
                    <Input
                      label="Lease End Date"
                      type="date"
                      value={tenantForm.leaseEndDate}
                      onChange={(e) => setTenantForm({ ...tenantForm, leaseEndDate: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lease Type</label>
                      <select
                        value={tenantForm.leaseType}
                        onChange={(e) => setTenantForm({ ...tenantForm, leaseType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="FIXED_TERM">Fixed Term</option>
                        <option value="MONTH_TO_MONTH">Month-to-Month</option>
                      </select>
                    </div>
                    <Input
                      label="Security Deposit ($)"
                      type="number"
                      value={tenantForm.rentDeposit}
                      onChange={(e) => setTenantForm({ ...tenantForm, rentDeposit: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <Input
                    label="Date of Birth"
                    type="date"
                    value={tenantForm.dateOfBirth}
                    onChange={(e) => setTenantForm({ ...tenantForm, dateOfBirth: e.target.value })}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Emergency Contact Name"
                      type="text"
                      value={tenantForm.emergencyContactName}
                      onChange={(e) => setTenantForm({ ...tenantForm, emergencyContactName: e.target.value })}
                      placeholder="Jane Doe"
                    />
                    <Input
                      label="Emergency Contact Phone"
                      type="tel"
                      value={tenantForm.emergencyContactPhone}
                      onChange={(e) => setTenantForm({ ...tenantForm, emergencyContactPhone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={tenantForm.notes}
                      onChange={(e) => setTenantForm({ ...tenantForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                      placeholder="Has a dog, prefers email contact, etc."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setIsAdding(false)}
                disabled={addingTenant}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleAddTenant} disabled={addingTenant} className="flex-1">
                {addingTenant ? 'Adding...' : 'Add Tenant'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
};
