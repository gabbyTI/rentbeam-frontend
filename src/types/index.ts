export type UserRole = 'landlord' | 'tenant';

export type PaymentStatus = 'paid' | 'pending' | 'due' | 'late';
export type PaymentMethod = 'autopay' | 'manual';
export type InviteStatus = 'pending' | 'accepted';
export type ResidencyStatus = 'current' | 'past';

export interface Landlord {
  id: string;
  name: string;
  email: string;
  payoutsEnabled: boolean;
  createdAt: string;
}

export interface Property {
  id: string;
  landlordId: string;
  name: string;
  address: string;
  createdAt: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  name: string;
  rentAmount: number;
  dueDay: number; // Day of month (1-31)
  gracePeriodDays: number;
  createdAt: string;
}

export interface Tenant {
  id: string;
  landlordId: string;
  unitId: string;
  email: string;
  name: string;
  phone?: string;
  emergencyContact?: string;
  inviteStatus: InviteStatus; // Portal access status
  residencyStatus: ResidencyStatus; // Actual occupancy status
  autopayEnabled: boolean;
  paymentMethodLabel?: string; // e.g., "Card •••• 4242"
  rentAmount: number;
  inviteToken?: string;
  moveInDate: string;
  moveOutDate?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  month: string; // Format: "YYYY-MM"
  note?: string;
  createdAt: string;
}

export interface AppState {
  landlords: Landlord[];
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  payments: Payment[];
  currentUser: {
    role: UserRole;
    id: string;
  } | null;
}
