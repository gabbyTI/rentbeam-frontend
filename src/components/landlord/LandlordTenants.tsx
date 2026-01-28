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

  const [tenantForm, setTenantForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    propertyId: '',
    unitId: '',
    moveInDate: new Date().toISOString().split('T')[0],
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
    setTenantForm({
      ...tenantForm,
      unitId,
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
      await api.createTenant({
        email: tenantForm.email,
        firstName: tenantForm.firstName,
        lastName: tenantForm.lastName,
        phone: tenantForm.phone || undefined,
        unitId: tenantForm.unitId,
        moveInDate: tenantForm.moveInDate,
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
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p>
                <strong>Note:</strong> Rent for the move-in month will be marked as paid.
                This assumes you've already collected the first month's rent before adding the tenant.
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
