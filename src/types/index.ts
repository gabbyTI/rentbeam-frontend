export type UserRole = 'landlord' | 'tenant';

export type PaymentStatus = 'paid' | 'pending' | 'due' | 'late';
export type PaymentMethod = 'CARD' | 'MANUAL'; // Backend uses uppercase
export type InviteStatus = 'PENDING' | 'ACCEPTED'; // Backend uses uppercase
export type MembershipStatus = 'ACTIVE' | 'INACTIVE'; // Backend enum

// Basic User model (matches backend)
export interface User {
  id: string;
  cognitoId?: string;
  email: string;
  notificationEmail?: string;
  name: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

// LandlordAccount (matches backend)
export interface LandlordAccount {
  id: string;
  userId: string;
  user: User;
  payoutsEnabled: boolean;
  stripeAccountId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  landlordId: string;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  property?: Property;
  name: string;
  rentAmount: number;
  dueDay: number; // Day of month (1-31)
  gracePeriodDays: number;
  createdAt: string;
  updatedAt: string;
}

// TenantMembership (matches backend)
export interface TenantMembership {
  id: string;
  userId: string;
  user: User;
  unitId: string;
  unit?: Unit;
  landlordId: string;
  moveInDate: string;
  moveOutDate?: string;
  inviteStatus: InviteStatus;
  inviteToken?: string;
  autopayEnabled: boolean;
  autopayConsentAt?: string;
  stripeCustomerId?: string;
  defaultPaymentMethodId?: string;
  paymentMethodLabel?: string;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  tenantMembershipId: string; // Changed from tenantId
  tenantMembership?: TenantMembership;
  amount: number;
  method: PaymentMethod;
  date: string;
  month: string; // Format: "YYYY-MM"
  note?: string;
  createdAt: string;
}

export interface AppState {
  users: User[];
  landlordAccounts: LandlordAccount[];
  properties: Property[];
  units: Unit[];
  tenantMemberships: TenantMembership[];
  payments: Payment[];
  currentUser: {
    role: UserRole;
    id: string;
  } | null;
}

// Legacy type aliases for backward compatibility during migration
export type Landlord = LandlordAccount;
export type Tenant = TenantMembership;
