import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../ui/AppShell';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { generateId } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const LandlordProperties: React.FC = () => {
  const { currentUser, properties, units, tenants, updateState } = useApp();
  const { showToast } = useToast();
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [isAddingUnit, setIsAddingUnit] = useState<string | null>(null);
  const [isEditingProperty, setIsEditingProperty] = useState<string | null>(null);
  const [isEditingUnit, setIsEditingUnit] = useState<string | null>(null);

  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
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

  const handleAddProperty = () => {
    if (!propertyForm.name || !propertyForm.address) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const newProperty = {
      id: generateId('property'),
      landlordId: currentUser!.id,
      name: propertyForm.name,
      address: propertyForm.address,
      createdAt: new Date().toISOString(),
    };

    updateState({
      properties: [...properties, newProperty],
    });

    showToast('Property added successfully');
    setIsAddingProperty(false);
    setPropertyForm({ name: '', address: '' });
  };

  const handleAddUnit = (propertyId: string) => {
    if (!unitForm.name || !unitForm.rentAmount || !unitForm.dueDay) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const newUnit = {
      id: generateId('unit'),
      propertyId,
      name: unitForm.name,
      rentAmount: parseFloat(unitForm.rentAmount),
      dueDay: parseInt(unitForm.dueDay),
      gracePeriodDays: parseInt(unitForm.gracePeriodDays),
      createdAt: new Date().toISOString(),
    };

    updateState({
      units: [...units, newUnit],
    });

    showToast('Unit added successfully');
    setIsAddingUnit(null);
    setUnitForm({ name: '', rentAmount: '', dueDay: '1', gracePeriodDays: '5' });
  };

  const handleEditProperty = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId);
    if (property) {
      setPropertyForm({ name: property.name, address: property.address });
      setIsEditingProperty(propertyId);
    }
  };

  const handleUpdateProperty = () => {
    if (!propertyForm.name || !propertyForm.address) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const updatedProperties = properties.map((p) =>
      p.id === isEditingProperty
        ? { ...p, name: propertyForm.name, address: propertyForm.address }
        : p
    );

    updateState({ properties: updatedProperties });
    showToast('Property updated successfully');
    setIsEditingProperty(null);
    setPropertyForm({ name: '', address: '' });
  };

  const handleDeleteProperty = (propertyId: string) => {
    const propertyUnits = units.filter((u) => u.propertyId === propertyId);
    const occupiedUnits = propertyUnits.filter((u) =>
      tenants.some((t) => t.unitId === u.id && t.residencyStatus === 'current')
    );

    if (occupiedUnits.length > 0) {
      showToast('Cannot delete property with active tenants', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this property and all its units?')) {
      return;
    }

    updateState({
      properties: properties.filter((p) => p.id !== propertyId),
      units: units.filter((u) => u.propertyId !== propertyId),
    });

    showToast('Property deleted');
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

  const handleUpdateUnit = () => {
    if (!unitForm.name || !unitForm.rentAmount || !unitForm.dueDay) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const updatedUnits = units.map((u) =>
      u.id === isEditingUnit
        ? {
            ...u,
            name: unitForm.name,
            rentAmount: parseFloat(unitForm.rentAmount),
            dueDay: parseInt(unitForm.dueDay),
            gracePeriodDays: parseInt(unitForm.gracePeriodDays),
          }
        : u
    );

    updateState({ units: updatedUnits });
    showToast('Unit updated successfully');
    setIsEditingUnit(null);
    setUnitForm({ name: '', rentAmount: '', dueDay: '1', gracePeriodDays: '5' });
  };

  const handleDeleteUnit = (unitId: string) => {
    const hasActiveTenant = tenants.some(
      (t) => t.unitId === unitId && t.residencyStatus === 'current'
    );

    if (hasActiveTenant) {
      showToast('Cannot delete unit with active tenant', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this unit?')) {
      return;
    }

    updateState({
      units: units.filter((u) => u.id !== unitId),
    });

    showToast('Unit deleted');
  };

  return (
    <AppShell title="Properties">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Properties</h2>
        <Button onClick={() => setIsAddingProperty(true)}>Add Property</Button>
      </div>

      {landlordProperties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add your first property to get started"
          action={<Button onClick={() => setIsAddingProperty(true)}>Add Property</Button>}
        />
      ) : (
        <div className="space-y-6">
          {landlordProperties.map((property) => (
            <Card key={property.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{property.name}</h3>
                    <p className="text-sm text-gray-500">{property.address}</p>
                  </div>
                  <div className="flex space-x-2">
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
                      Add Unit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteProperty(property.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {property.units.length === 0 ? (
                  <p className="text-sm text-gray-500">No units yet</p>
                ) : (
                  <div className="space-y-2">
                    {property.units.map((unit) => (
                      <div
                        key={unit.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                      >
                        <div>
                          <p className="font-medium">{unit.name}</p>
                          <p className="text-sm text-gray-500">
                            ${unit.rentAmount}/month • Due day {unit.dueDay}
                          </p>
                        </div>
                        <div className="flex space-x-2">
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
            setPropertyForm({ name: '', address: '' });
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
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditingProperty(null);
                  setPropertyForm({ name: '', address: '' });
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
