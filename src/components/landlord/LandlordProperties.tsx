import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { AppShell } from '../ui/AppShell';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../../context/ToastContext';

export const LandlordProperties: React.FC = () => {
  const { currentUser, properties, units, tenants, stripeOnboarded } = useApp();
  const api = useApi();
  const { showToast } = useToast();
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [isAddingUnit, setIsAddingUnit] = useState<string | null>(null);
  const [isEditingProperty, setIsEditingProperty] = useState<string | null>(null);
  const [isEditingUnit, setIsEditingUnit] = useState<string | null>(null);

  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
    acceptOnlinePayments: false,
  });

  const [unitForm, setUnitForm] = useState({
    name: '',
    rentAmount: '',
    dueDay: '1',
    gracePeriodDays: '5',
  });

  const landlordProperties = useMemo(() => {
    return properties
      .filter((p) => p.landlordId === currentUser?.id)
      .map((property) => ({
        ...property,
        units: units.filter((u) => u.propertyId === property.id),
      }));
  }, [properties, units, currentUser]);

  const handleAddProperty = async () => {
    if (!propertyForm.name || !propertyForm.address) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      await api.createProperty({
        name: propertyForm.name,
        address: propertyForm.address,
        acceptOnlinePayments: propertyForm.acceptOnlinePayments,
      });

      showToast('Property added successfully');
      setIsAddingProperty(false);
      setPropertyForm({ name: '', address: '', acceptOnlinePayments: false });
    } catch (error: any) {
      showToast(error.message || 'Failed to add property', 'error');
    }
  };

  const handleAddUnit = async (propertyId: string) => {
    if (!unitForm.name || !unitForm.rentAmount || !unitForm.dueDay) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      await api.createUnit({
        propertyId,
        name: unitForm.name,
        rentAmount: parseFloat(unitForm.rentAmount),
        dueDay: parseInt(unitForm.dueDay),
        gracePeriodDays: parseInt(unitForm.gracePeriodDays),
      });

      showToast('Unit added successfully');
      setIsAddingUnit(null);
      setUnitForm({ name: '', rentAmount: '', dueDay: '1', gracePeriodDays: '5' });
    } catch (error: any) {
      showToast(error.message || 'Failed to add unit', 'error');
    }
  };

  const handleEditProperty = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId);
    if (property) {
      setPropertyForm({ 
        name: property.name, 
        address: property.address,
        acceptOnlinePayments: property.acceptOnlinePayments ?? true,
      });
      setIsEditingProperty(propertyId);
    }
  };

  const handleUpdateProperty = async () => {
    if (!propertyForm.name || !propertyForm.address) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      await api.updateProperty(isEditingProperty!, {
        name: propertyForm.name,
        address: propertyForm.address,
        acceptOnlinePayments: propertyForm.acceptOnlinePayments,
      });

      showToast('Property updated successfully');
      setIsEditingProperty(null);
      setPropertyForm({ name: '', address: '', acceptOnlinePayments: false });
    } catch (error: any) {
      showToast(error.message || 'Failed to update property', 'error');
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    const propertyUnits = units.filter((u) => u.propertyId === propertyId);
    const occupiedUnits = propertyUnits.filter((u) =>
      tenants.some((t) => t.unitId === u.id && t.status === 'ACTIVE')
    );

    if (occupiedUnits.length > 0) {
      showToast('Cannot delete property with active tenants', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this property and all its units?')) {
      return;
    }

    try {
      await api.deleteProperty(propertyId);
      showToast('Property deleted');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete property', 'error');
    }
  };

  const handleEditUnit = (unit: any) => {
    setUnitForm({
      name: unit.name,
      rentAmount: unit.rentAmount.toString(),
      dueDay: unit.dueDay.toString(),
      gracePeriodDays: unit.gracePeriodDays.toString(),
    });
    setIsEditingUnit(unit.id);
  };

  const handleUpdateUnit = async () => {
    if (!unitForm.name || !unitForm.rentAmount || !unitForm.dueDay) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      await api.updateUnit(isEditingUnit!, {
        name: unitForm.name,
        rentAmount: parseFloat(unitForm.rentAmount),
        dueDay: parseInt(unitForm.dueDay),
        gracePeriodDays: parseInt(unitForm.gracePeriodDays),
      });

      showToast('Unit updated successfully');
      setIsEditingUnit(null);
      setUnitForm({ name: '', rentAmount: '', dueDay: '1', gracePeriodDays: '5' });
    } catch (error: any) {
      showToast(error.message || 'Failed to update unit', 'error');
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    const hasActiveTenant = tenants.some(
      (t) => t.unitId === unitId && t.status === 'ACTIVE'
    );

    if (hasActiveTenant) {
      showToast('Cannot delete unit with active tenant', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this unit?')) {
      return;
    }

    try {
      await api.deleteUnit(unitId);
      showToast('Unit deleted');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete unit', 'error');
    }
  };

  return (
    <AppShell title="Properties">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Properties</h2>
        <Button 
          onClick={() => setIsAddingProperty(true)}
          size="sm"
        >
          <span className="hidden sm:inline">Add Property</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {landlordProperties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add your first property to get started"
          action={
            <Button 
              onClick={() => setIsAddingProperty(true)}
            >
              Add Property
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {landlordProperties.map((property) => (
            <Card key={property.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold truncate">{property.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{property.address}</p>
                  </div>
                  <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditProperty(property.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsAddingUnit(property.id)}
                    >
                      <span className="hidden sm:inline">Add Unit</span>
                      <span className="sm:hidden">+</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteProperty(property.id)}
                    >
                      <span className="hidden sm:inline">Delete</span>
                      <span className="sm:hidden">×</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {property.units.length === 0 ? (
                  <p className="text-xs sm:text-sm text-gray-500">No units yet</p>
                ) : (
                  <div className="space-y-2">
                    {property.units.map((unit) => (
                      <div
                        key={unit.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 p-3 rounded-lg bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base font-medium truncate">{unit.name}</p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            ${unit.rentAmount}/month • Due day {unit.dueDay}
                          </p>
                        </div>
                        <div className="flex space-x-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditUnit(unit)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteUnit(unit.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Property Modal */}
      {isAddingProperty && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddingProperty(false)}
          title="Add Property"
        >
          <div className="space-y-4">
            <Input
              label="Property Name"
              value={propertyForm.name}
              onChange={(e) =>
                setPropertyForm({ ...propertyForm, name: e.target.value })
              }
              placeholder="Sunset Apartments"
            />
            <Input
              label="Address"
              value={propertyForm.address}
              onChange={(e) =>
                setPropertyForm({ ...propertyForm, address: e.target.value })
              }
              placeholder="123 Main St, Vancouver, BC"
            />
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => setIsAddingProperty(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleAddProperty} className="flex-1">
                Add Property
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Property Modal */}
      {isEditingProperty && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsEditingProperty(null);
            setPropertyForm({ name: '', address: '', acceptOnlinePayments: true });
          }}
          title="Edit Property"
        >
          <div className="space-y-4">
            <Input
              label="Property Name"
              value={propertyForm.name}
              onChange={(e) =>
                setPropertyForm({ ...propertyForm, name: e.target.value })
              }
              placeholder="Sunset Apartments"
            />
            <Input
              label="Address"
              value={propertyForm.address}
              onChange={(e) =>
                setPropertyForm({ ...propertyForm, address: e.target.value })
              }
              placeholder="123 Main St, Vancouver, BC"
            />
            <div className="border-t pt-4">
              <label className={`flex items-center justify-between ${!stripeOnboarded ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                <div>
                  <span className="text-sm font-medium text-gray-700">Accept Online Payments</span>
                  <p className="text-xs text-gray-500 mt-1">
                    {!stripeOnboarded 
                      ? 'Complete bank account setup to enable online payments'
                      : 'Allows tenants to pay rent through the app with cards. Disable if you prefer manual tracking.'
                    }
                  </p>
                </div>
                <div className="ml-4">
                  <input
                    type="checkbox"
                    checked={propertyForm.acceptOnlinePayments}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, acceptOnlinePayments: e.target.checked })
                    }
                    disabled={!stripeOnboarded && !propertyForm.acceptOnlinePayments}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </label>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditingProperty(null);
                  setPropertyForm({ name: '', address: '', acceptOnlinePayments: true });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateProperty} className="flex-1">
                Update Property
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Unit Modal */}
      {isAddingUnit && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddingUnit(null)}
          title="Add Unit"
        >
          <div className="space-y-4">
            <Input
              label="Unit Name/Number"
              value={unitForm.name}
              onChange={(e) =>
                setUnitForm({ ...unitForm, name: e.target.value })
              }
              placeholder="Unit 101"
            />
            <Input
              label="Monthly Rent ($)"
              type="number"
              value={unitForm.rentAmount}
              onChange={(e) =>
                setUnitForm({ ...unitForm, rentAmount: e.target.value })
              }
              placeholder="1800"
            />
            <Input
              label="Due Day of Month"
              type="number"
              min="1"
              max="31"
              value={unitForm.dueDay}
              onChange={(e) =>
                setUnitForm({ ...unitForm, dueDay: e.target.value })
              }
            />
            <Input
              label="Grace Period (days)"
              type="number"
              min="0"
              max="30"
              value={unitForm.gracePeriodDays}
              onChange={(e) =>
                setUnitForm({ ...unitForm, gracePeriodDays: e.target.value })
              }
            />
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => setIsAddingUnit(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleAddUnit(isAddingUnit)}
                className="flex-1"
              >
                Add Unit
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Unit Modal */}
      {isEditingUnit && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsEditingUnit(null);
            setUnitForm({ name: '', rentAmount: '', dueDay: '1', gracePeriodDays: '5' });
          }}
          title="Edit Unit"
        >
          <div className="space-y-4">
            <Input
              label="Unit Name/Number"
              value={unitForm.name}
              onChange={(e) =>
                setUnitForm({ ...unitForm, name: e.target.value })
              }
              placeholder="Unit 101"
            />
            <Input
              label="Monthly Rent ($)"
              type="number"
              value={unitForm.rentAmount}
              onChange={(e) =>
                setUnitForm({ ...unitForm, rentAmount: e.target.value })
              }
              placeholder="1800"
            />
            <Input
              label="Due Day of Month"
              type="number"
              min="1"
              max="31"
              value={unitForm.dueDay}
              onChange={(e) =>
                setUnitForm({ ...unitForm, dueDay: e.target.value })
              }
            />
            <Input
              label="Grace Period (days)"
              type="number"
              min="0"
              max="30"
              value={unitForm.gracePeriodDays}
              onChange={(e) =>
                setUnitForm({ ...unitForm, gracePeriodDays: e.target.value })
              }
            />
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditingUnit(null);
                  setUnitForm({ name: '', rentAmount: '', dueDay: '1', gracePeriodDays: '5' });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateUnit} className="flex-1">
                Update Unit
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
};
