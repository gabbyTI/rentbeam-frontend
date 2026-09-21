/**
 * Custom hook for accessing API operations
 * 
 * Provides convenient access to all CRUD operations.
 * Components can use this instead of directly calling updateState.
 */

import { useApp } from '../context/AppContext';
import * as api from '../services/api';

export const useApi = () => {
  const state = useApp();

  return {
    // State access (read-only for components)
    state: {
      landlords: state.landlords,
      properties: state.properties,
      units: state.units,
      tenants: state.tenants,
      payments: state.payments,
      currentUser: state.currentUser,
    },
    
    // Auth
    login: state.login,
    logout: state.logout,

    // Properties
    createProperty: (property: Parameters<typeof api.createProperty>[0]) =>
      api.createProperty(property, state.properties),
    
    updateProperty: (propertyId: string, updates: Parameters<typeof api.updateProperty>[1]) =>
      api.updateProperty(propertyId, updates, state.properties),
    
    deleteProperty: (propertyId: string) =>
      api.deleteProperty(propertyId, state.properties, state.units),

    // Units
    createUnit: (unit: Parameters<typeof api.createUnit>[0]) =>
      api.createUnit(unit, state.units),
    
    updateUnit: (unitId: string, updates: Parameters<typeof api.updateUnit>[1]) =>
      api.updateUnit(unitId, updates, state.units),
    
    deleteUnit: (unitId: string) =>
      api.deleteUnit(unitId, state.units),

    // Tenants
    createTenant: (tenant: Parameters<typeof api.createTenant>[0]) =>
      api.createTenant(tenant),
    
    updateTenant: (tenantId: string, updates: Parameters<typeof api.updateTenant>[1]) =>
      api.updateTenant(tenantId, updates, state.tenants),
    
    deleteTenant: (tenantId: string) =>
      api.deleteTenant(tenantId, state.tenants),
    
    transferTenant: (tenantId: Parameters<typeof api.transferTenant>[0], newUnitId: Parameters<typeof api.transferTenant>[1]) =>
      api.transferTenant(tenantId, newUnitId, state.tenants),

    // Payments
    createPayment: (payment: Parameters<typeof api.createPayment>[0]) =>
      api.createPayment(payment, state.payments),

    // Landlords
    updateLandlord: (landlordId: string, updates: Parameters<typeof api.updateLandlord>[1]) =>
      api.updateLandlord(landlordId, updates, state.landlords),
  };
};
