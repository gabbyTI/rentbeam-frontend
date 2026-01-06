/**
 * API Service Layer
 * 
 * Currently uses in-memory state updates via context.
 * To switch to REST API: Replace function implementations with fetch/axios calls.
 * Components won't need to change - they'll keep calling these same functions.
 */

import { Property, Unit, Tenant, Payment, Landlord } from '../types';
import { authService, LoginResponse } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Simple fetch-based API client for authenticated requests
const api = {
  get: async (url: string) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getAccessToken()}`
      }
    });
    if (!response.ok) await handleApiError(response);
    return response.json();
  },
  post: async (url: string, data?: any) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getAccessToken()}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) await handleApiError(response);
    return response.json();
  },
  patch: async (url: string, data?: any) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getAccessToken()}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) await handleApiError(response);
    return response.json();
  },
  delete: async (url: string) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getAccessToken()}`
      }
    });
    if (!response.ok) await handleApiError(response);
    return response.json();
  }
};

export default api;

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

// Global error handler for API responses
const handleApiError = async (response: Response, isAuthEndpoint: boolean = false) => {
  // If 401 on protected endpoints, token expired - logout user
  // But if it's an auth endpoint (login/signup), just show the error message
  if (response.status === 401 && !isAuthEndpoint) {
    console.error('🔴 Token expired or invalid - logging out');
    authService.clearAuth();
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }

  // For other errors (including 401 on auth endpoints), try to get error message from response
  let errorData;
  try {
    errorData = await response.json();
  } catch (jsonError) {
    // If response body isn't JSON, use generic message
    throw new Error(`Request failed with status ${response.status}`);
  }
  
  // Throw the actual error message from backend (prioritize message over error object)
  const errorMessage = errorData.message || errorData.error || `Request failed with status ${response.status}`;
  throw new Error(errorMessage);
};

// Helper to ensure API is initialized
const getUpdateState = () => {
  if (!updateStateFn) {
    throw new Error('API not initialized. Call initializeApi() first.');
  }
  return updateStateFn;
};

// ==================== Authentication ====================

export interface SignupLandlordRequest {
  email: string;
  password: string;
  name: string;
}

export interface SignupLandlordResponse {
  message: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface StripeConnectStatus {
  connected: boolean;
  accountId: string | null;
  onboarded: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
}

export const signupLandlord = async (data: SignupLandlordRequest): Promise<SignupLandlordResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup-landlord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response, true); // Pass true for auth endpoint
  }

  const result = await response.json();
  return result.data || result;
};

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response, true); // Pass true for auth endpoint
  }

  const result = await response.json();
  return result.data || result;
};

export const resendVerification = async (email: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    await handleApiError(response, true); // Pass true for auth endpoint
  }
};

export const confirmEmail = async (email: string, code: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/confirm-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    await handleApiError(response, true); // Pass true for auth endpoint
  }
};

export const forgotPassword = async (email: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    await handleApiError(response, true); // Pass true for auth endpoint
  }
};

export const resetPassword = async (email: string, code: string, newPassword: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });

  if (!response.ok) {
    await handleApiError(response, true); // Pass true for auth endpoint
  }
};

export const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authService.getAccessToken()}`
    },
    body: JSON.stringify({ oldPassword, newPassword }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }
};

export const initiateNotificationEmailChange = async (notificationEmail: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/notification-email/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authService.getAccessToken()}`
    },
    body: JSON.stringify({ notificationEmail }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }
};

export const confirmNotificationEmailChange = async (code: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/notification-email/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authService.getAccessToken()}`
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }
};

export interface CurrentUserProfile {
  user: {
    id: string;
    email: string;
    notificationEmail?: string;
    name: string;
    phone?: string;
    businessName?: string;
    taxId?: string;
    cognitoId: string;
  };
  memberships: {
    landlord: {
      id: string;
      defaultDueDay?: number;
      defaultGracePeriodDays?: number;
    } | null;
    tenants: Array<{
      id: string;
      unitId: string;
      unitName: string;
      propertyName: string;
      status: string;
    }>;
  };
}

export const getCurrentUser = async (): Promise<CurrentUserProfile> => {
  const token = authService.getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  return result.data;
};

export interface TenantMembershipDetails {
  id: string;
  userId: string;
  unitId: string;
  landlordId: string;
  moveInDate: string;
  moveOutDate: string | null;
  inviteStatus: string;
  autopayEnabled: boolean;
  stripeCustomerId: string | null;
  paymentMethodLabel: string | null;
  status: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
  };
  unit: {
    id: string;
    name: string;
    rentAmount: number;
    dueDay: number;
    gracePeriodDays: number;
    property: {
      id: string;
      name: string;
      address: string;
      landlord: {
        id: string;
        user: {
          id: string;
          name: string;
          email: string;
        };
      };
    };
  };
}

export const getTenantMembership = async (membershipId: string): Promise<TenantMembershipDetails> => {
  const token = authService.getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/tenants/${membershipId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  return result.data;
};

export const getStripeConnectStatus = async (): Promise<StripeConnectStatus> => {
  const token = authService.getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/stripe/connect/status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  return result.data || result;
};

export const connectStripe = async (refreshUrl: string, returnUrl: string): Promise<{ url: string; accountId: string }> => {
  const token = authService.getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/stripe/connect/onboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ refreshUrl, returnUrl }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  return result.data || result;
};

// ==================== Properties ====================

export const fetchProperties = async (): Promise<Property[]> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/properties`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  return result.data || result;
};

export const createProperty = async (
  property: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'landlordId'>,
  existingProperties: Property[]
): Promise<Property> => {
  console.log('🔵 createProperty called with:', property);
  const token = authService.getAccessToken();
  console.log('🔵 Token:', token ? 'exists' : 'missing');
  console.log('🔵 Making POST request to:', `${API_BASE_URL}/api/properties`);
  
  const response = await fetch(`${API_BASE_URL}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(property)
  });

  console.log('🔵 Response status:', response.status);

  if (!response.ok) {
    console.error('🔴 API Error - Status:', response.status);
    await handleApiError(response);
  }

  const result = await response.json();
  console.log('🔵 API Response:', result);
  const created = result.data || result;
  
  getUpdateState()({
    properties: [...existingProperties, created],
  });
  return created;
};

export const updateProperty = async (
  propertyId: string,
  updates: Partial<Property>,
  existingProperties: Property[]
): Promise<Property> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  const updated = result.data || result;
  
  const updatedProperties = existingProperties.map((p) =>
    p.id === propertyId ? updated : p
  );
  getUpdateState()({ properties: updatedProperties });
  return updated;
};

export const deleteProperty = async (
  propertyId: string,
  existingProperties: Property[],
  existingUnits: Unit[]
): Promise<void> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }
  
  const updatedProperties = existingProperties.filter((p) => p.id !== propertyId);
  const updatedUnits = existingUnits.filter((u) => u.propertyId !== propertyId);
  getUpdateState()({
    properties: updatedProperties,
    units: updatedUnits,
  });
};

// ==================== Units ====================

export const fetchUnits = async (): Promise<Unit[]> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/units`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch units');
  }

  const result = await response.json();
  return result.data || result;
};

export const createUnit = async (
  unit: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>,
  existingUnits: Unit[]
): Promise<Unit> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/units`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(unit)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  const created = result.data || result;
  
  getUpdateState()({
    units: [...existingUnits, created],
  });
  return created;
};

export const updateUnit = async (
  unitId: string,
  updates: Partial<Unit>,
  existingUnits: Unit[]
): Promise<Unit> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/units/${unitId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  const updated = result.data || result;
  
  const updatedUnits = existingUnits.map((u) =>
    u.id === unitId ? updated : u
  );
  getUpdateState()({ units: updatedUnits });
  return updated;
};

export const deleteUnit = async (
  unitId: string,
  existingUnits: Unit[]
): Promise<void> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/units/${unitId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }
  
  const updatedUnits = existingUnits.filter((u) => u.id !== unitId);
  getUpdateState()({ units: updatedUnits });
};

// ==================== Tenants ====================

export const fetchTenants = async (): Promise<Tenant[]> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/tenants`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch tenants');
  }

  const result = await response.json();
  return result.data || result;
};

export const createTenant = async (
  tenant: { email: string; name: string; phone?: string; unitId: string; moveInDate?: string },
  existingTenants: Tenant[]
): Promise<any> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(tenant)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  const data = result.data || result;
  const created = data.membership || data;
  
  getUpdateState()({
    tenants: [...existingTenants, created],
  });
  return tenant;
};

export const resendTenantInvite = async (tenantId: string): Promise<void> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}/resend-invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }
};

export const updateTenantInfo = async (
  tenantId: string, 
  data: { name?: string; phone?: string }
): Promise<void> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}/user-info`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response);
  }
};

// ==================== Invites ====================

export interface InviteDetails {
  landlordName: string;
  email: string;
  name: string;
  property: {
    name: string;
    address: string;
  };
  unit: {
    name: string;
  };
  dueDay: number;
  rentAmount: number; // This is from the unit, kept for backward compatibility
}

export const fetchInviteDetails = async (token: string): Promise<InviteDetails> => {
  const response = await fetch(`${API_BASE_URL}/api/invites/${token}`, {
    method: 'GET',
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  return result.data;
};

export interface AcceptInviteRequest {
  password: string;
  phone?: string;
  emergencyContact?: string;
}

export interface AcceptInviteResponse {
  tokens: {
    idToken: string;
    accessToken: string;
    refreshToken: string;
  };
}

export const acceptInvite = async (
  token: string,
  data: AcceptInviteRequest
): Promise<AcceptInviteResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/invites/${token}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  return result.data;
};

export const updateTenant = async (
  tenantId: string,
  updates: Partial<Tenant>,
  existingTenants: Tenant[]
): Promise<Tenant> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  const updated = result.data || result;
  
  const updatedTenants = existingTenants.map((t) =>
    t.id === tenantId ? updated : t
  );
  getUpdateState()({ tenants: updatedTenants });
  return updated;
};

export const deleteTenant = async (
  tenantId: string,
  existingTenants: Tenant[]
): Promise<void> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }
  
  const updatedTenants = existingTenants.filter((t) => t.id !== tenantId);
  getUpdateState()({ tenants: updatedTenants });
};

export const moveOutTenant = async (
  tenantId: string,
  moveOutDate: string,
  existingTenants: Tenant[]
): Promise<{ membership: Tenant; outstandingBalance: boolean; unpaidPeriods: string[] }> => {
  const token = authService.getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}/move-out`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ moveOutDate }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  const movedOutTenant = result.data.membership;
  
  // Update local state - set tenant to INACTIVE
  const updatedTenants = existingTenants.map((t) =>
    t.id === tenantId ? movedOutTenant : t
  );
  getUpdateState()({ tenants: updatedTenants });
  
  return result.data;
};

export const transferTenant = async (
  tenant: Tenant,
  newTenantData: { email: string; name: string; phone?: string; moveInDate?: string },
  existingTenants: Tenant[]
): Promise<Tenant> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/tenants/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      oldTenantMembershipId: tenant.id,
      newTenant: {
        email: newTenantData.email,
        name: newTenantData.name,
        phone: newTenantData.phone,
        unitId: tenant.unitId,
        moveInDate: newTenantData.moveInDate,
      }
    })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  const data = result.data || result;
  const oldMembership = data.oldMembership || data.old;
  const newMembership = data.newMembership || data.new;
  
  // Update old tenant's status to INACTIVE and add new tenant
  const updatedTenants = existingTenants.map((t) =>
    t.id === tenant.id ? oldMembership : t
  );
  
  getUpdateState()({
    tenants: [...updatedTenants, newMembership],
  });
  
  return newMembership;
};

// ==================== Payments ====================

export const fetchPayments = async (): Promise<Payment[]> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/payments`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payments');
  }

  const result = await response.json();
  return result.data || result;
};

export const createPayment = async (
  payment: Omit<Payment, 'id' | 'createdAt'>,
  existingPayments: Payment[]
): Promise<Payment> => {
  const token = authService.getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payment)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const result = await response.json();
  const created = result.data || result;
  
  getUpdateState()({
    payments: [...existingPayments, created],
  });
  return created;
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
