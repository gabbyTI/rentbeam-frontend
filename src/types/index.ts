export type UserRole = 'landlord' | 'tenant';

export type PaymentStatus = 'paid' | 'processing' | 'pending' | 'due' | 'late';
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
  address?: string; // Computed display string (assembled server-side)
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  acceptOnlinePayments: boolean;
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
  paymentMethodType?: string;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  // Lease details
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseType?: 'FIXED_TERM' | 'MONTH_TO_MONTH';
  rentDeposit?: number;
  // Tenant profile
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export type DocumentType = 'LEASE' | 'MOVE_IN_INSPECTION' | 'MOVE_OUT_INSPECTION' | 'NOTICE' | 'ID_VERIFICATION' | 'OTHER';

export interface TenantDocument {
  id: string;
  tenantMembershipId: string;
  type: DocumentType;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  uploadedByUserId: string;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  tenantMembershipId: string; // Changed from tenantId
  tenantMembership?: TenantMembership;
  amount: number;
  method: PaymentMethod;
  paymentMethod?: 'Cash' | 'Check' | 'Zelle' | 'Venmo' | 'Other'; // For manual payments
  date: string;
  month: string; // Format: "YYYY-MM"
  status?: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  note?: string;
  // Card payment fields
  rentAmount?: number;
  processingFee?: number;
  totalAmount?: number;
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
// Dashboard Analytics Types
export interface OccupancyMetrics {
  rate: number;
  occupied: number;
  total: number;
  vacant: number;
}

export interface RevenueMetrics {
  collected: number;
  expected: number;
  rate: number;
}

export interface OutstandingMetrics {
  amount: number;
  tenantCount: number;
}

export interface PaymentStatusMetrics {
  paid: number;
  pending: number;
  late: number;
  unpaid: number;
}

export interface ActiveTenantsMetrics {
  total: number;
  autopayEnabled: number;
  pendingInvites: number;
}

export interface RecentActivityItem {
  id: string;
  tenantName: string;
  amount: number;
  date: string;
  status: 'paid' | 'late';
}

export interface DashboardAnalytics {
  occupancy: OccupancyMetrics;
  revenue: RevenueMetrics;
  outstanding: OutstandingMetrics;
  paymentStatus: PaymentStatusMetrics;
  activeTenants: ActiveTenantsMetrics;
  recentActivity: RecentActivityItem[];
}