/**
 * API Service Layer
 * 
 * Currently uses in-memory state updates via context.
 * To switch to REST API: Replace function implementations with fetch/axios calls.
 * Components won't need to change - they'll keep calling these same functions.
 */

import { Property, Unit, Tenant, Payment, Landlord } from '../types';

type UpdateStateFunction = (updates: Partial<{
  landlords: Landlord[];
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  payments: Payment[];
}>) => void;

// Store reference to the updateState function from context
let updateStateFn: UpdateStateFunction | null = null;

export const initializeApi = (updateState: UpdateStateFunction) => {
  updateStateFn = updateState;
};

// Helper to ensure API is initialized
const getUpdateState = () => {
  if (!updateStateFn) {
    throw new Error('API not initialized. Call initializeApi() first.');
  }
  return updateStateFn;
};

// ==================== Properties ====================

export const createProperty = async (
  property: Property,
  existingProperties: Property[]
): Promise<Property> => {
  // TODO: Replace with API call
  // const response = await fetch('/api/properties', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(property)
  // });
  // const created = await response.json();
  
  getUpdateState()({
    properties: [...existingProperties, property],
  });
  return property;
};

export const updateProperty = async (
  propertyId: string,
  updates: Partial<Property>,
  existingProperties: Property[]
): Promise<Property> => {
  // TODO: Replace with API call
  // const response = await fetch(`/api/properties/${propertyId}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(updates)
  // });
  // const updated = await response.json();
  
  const updatedProperties = existingProperties.map((p) =>
    p.id === propertyId ? { ...p, ...updates } : p
  );
  getUpdateState()({ properties: updatedProperties });
  return updatedProperties.find(p => p.id === propertyId)!;
};

export const deleteProperty = async (
  propertyId: string,
  existingProperties: Property[],
  existingUnits: Unit[]
): Promise<void> => {
  // TODO: Replace with API call
  // await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' });
  
  const updatedProperties = existingProperties.filter((p) => p.id !== propertyId);
  const updatedUnits = existingUnits.filter((u) => u.propertyId !== propertyId);
  getUpdateState()({
    properties: updatedProperties,
    units: updatedUnits,
  });
};

// ==================== Units ====================

export const createUnit = async (
  unit: Unit,
  existingUnits: Unit[]
): Promise<Unit> => {
  // TODO: Replace with API call
  // const response = await fetch('/api/units', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(unit)
  // });
  // const created = await response.json();
  
  getUpdateState()({
    units: [...existingUnits, unit],
  });
  return unit;
};

export const updateUnit = async (
  unitId: string,
  updates: Partial<Unit>,
  existingUnits: Unit[]
): Promise<Unit> => {
  // TODO: Replace with API call
  // const response = await fetch(`/api/units/${unitId}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(updates)
  // });
  // const updated = await response.json();
  
  const updatedUnits = existingUnits.map((u) =>
    u.id === unitId ? { ...u, ...updates } : u
  );
  getUpdateState()({ units: updatedUnits });
  return updatedUnits.find(u => u.id === unitId)!;
};

export const deleteUnit = async (
  unitId: string,
  existingUnits: Unit[]
): Promise<void> => {
  // TODO: Replace with API call
  // await fetch(`/api/units/${unitId}`, { method: 'DELETE' });
  
  const updatedUnits = existingUnits.filter((u) => u.id !== unitId);
  getUpdateState()({ units: updatedUnits });
};

// ==================== Tenants ====================

export const createTenant = async (
  tenant: Tenant,
  existingTenants: Tenant[]
): Promise<Tenant> => {
  // TODO: Replace with API call
  // const response = await fetch('/api/tenants', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(tenant)
  // });
  // const created = await response.json();
  
  getUpdateState()({
    tenants: [...existingTenants, tenant],
  });
  return tenant;
};

export const updateTenant = async (
  tenantId: string,
  updates: Partial<Tenant>,
  existingTenants: Tenant[]
): Promise<Tenant> => {
  // TODO: Replace with API call
  // const response = await fetch(`/api/tenants/${tenantId}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(updates)
  // });
  // const updated = await response.json();
  
  const updatedTenants = existingTenants.map((t) =>
    t.id === tenantId ? { ...t, ...updates } : t
  );
  getUpdateState()({ tenants: updatedTenants });
  return updatedTenants.find(t => t.id === tenantId)!;
};

export const deleteTenant = async (
  tenantId: string,
  existingTenants: Tenant[]
): Promise<void> => {
  // TODO: Replace with API call
  // await fetch(`/api/tenants/${tenantId}`, { method: 'DELETE' });
  
  const updatedTenants = existingTenants.filter((t) => t.id !== tenantId);
  getUpdateState()({ tenants: updatedTenants });
};

export const transferTenant = async (
  tenant: Tenant,
  newTenantRecord: Tenant,
  existingTenants: Tenant[]
): Promise<Tenant> => {
  // TODO: Replace with API call
  // const response = await fetch('/api/tenants/transfer', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ oldTenantId: tenant.id, newTenantRecord })
  // });
  // const created = await response.json();
  
  const updatedTenants = existingTenants.map((t) =>
    t.id === tenant.id
      ? { ...t, residencyStatus: 'past' as const, moveOutDate: new Date().toISOString().split('T')[0] }
      : t
  );
  
  getUpdateState()({
    tenants: [...updatedTenants, newTenantRecord],
  });
  return newTenantRecord;
};

// ==================== Payments ====================

export const createPayment = async (
  payment: Payment,
  existingPayments: Payment[]
): Promise<Payment> => {
  // TODO: Replace with API call
  // const response = await fetch('/api/payments', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payment)
  // });
  // const created = await response.json();
  
  getUpdateState()({
    payments: [...existingPayments, payment],
  });
  return payment;
};

// ==================== Landlords ====================

export const updateLandlord = async (
  landlordId: string,
  updates: Partial<Landlord>,
  existingLandlords: Landlord[]
): Promise<Landlord> => {
  // TODO: Replace with API call
  // const response = await fetch(`/api/landlords/${landlordId}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(updates)
  // });
  // const updated = await response.json();
  
  const updatedLandlords = existingLandlords.map((l) =>
    l.id === landlordId ? { ...l, ...updates } : l
  );
  getUpdateState()({ landlords: updatedLandlords });
  return updatedLandlords.find(l => l.id === landlordId)!;
};
