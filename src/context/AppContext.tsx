import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { AppState, UserRole, LandlordAccount, TenantMembership, Property, Unit, Payment } from '../types';
import { initializeApi, fetchProperties, fetchUnits, fetchTenants, fetchPayments, getStripeConnectStatus } from '../services/api';
import { authService } from '../services/auth';

interface AppContextType extends AppState {
  updateState: (updates: Partial<AppState>) => void;
  login: (role: UserRole, id: string) => void;
  logout: () => void;
  loading: boolean;
  stripeOnboarded: boolean | null;
  stripeStatus: {
    requirementsDue: string[];
    requirementsPending: string[];
    disabledReason: string | null;
    payoutsEnabled: boolean;
  } | null;
  // Dual role handling
  needsRoleSelection: boolean;
  availableRoles: {
    landlord?: { id: string };
    tenants: Array<{ id: string; unitName: string; propertyName: string }>;
  } | null;
  selectRole: (role: UserRole, id: string) => void;
  // Backward compatibility aliases
  landlords: LandlordAccount[];
  tenants: TenantMembership[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<{
    landlord?: { id: string };
    tenants: Array<{ id: string; unitName: string; propertyName: string }>;
  } | null>(null);
  const [stripeOnboarded, setStripeOnboarded] = useState<boolean | null>(null);
  const [stripeStatus, setStripeStatus] = useState<{
    requirementsDue: string[];
    requirementsPending: string[];
    disabledReason: string | null;
    payoutsEnabled: boolean;
  } | null>(null);
  const [state, setState] = useState<AppState>({
    users: [],
    landlordAccounts: [],
    properties: [],
    units: [],
    tenantMemberships: [],
    payments: [],
    currentUser: null,
  });

  const updateState = (updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // Initialize API service with updateState function
  useEffect(() => {
    initializeApi(updateState);
  }, []);

  // Restore user session on mount
  useEffect(() => {
    const restoreSession = () => {
      console.log('🔵 Attempting to restore session...');
      console.log('🔵 isAuthenticated:', authService.isAuthenticated());

      if (authService.isAuthenticated()) {
        const memberships = authService.getMemberships();
        console.log('🔵 Retrieved memberships:', memberships);

        if (memberships) {
          const hasLandlord = !!memberships.landlord;
          const hasTenants = memberships.tenants && memberships.tenants.length > 0;
          const hasMultipleTenants = memberships.tenants && memberships.tenants.length > 1;

          // Check if user needs to select an account (landlord + tenant OR multiple tenants)
          if ((hasLandlord && hasTenants) || hasMultipleTenants) {
            const selectedRole = authService.getSelectedRole();
            // If user has stored preference, use it
            if (selectedRole) {
              console.log('🔵 User has multiple accounts, using stored preference:', selectedRole);
              setState(prev => ({
                ...prev,
                currentUser: { role: selectedRole.role, id: selectedRole.id },
              }));
            } else {
              console.log('🔵 User has multiple accounts, no stored preference - showing role selector');
              setAvailableRoles({
                landlord: memberships.landlord ? { id: memberships.landlord.id } : undefined,
                tenants: memberships.tenants.map(t => ({
                  id: t.id,
                  unitName: t.unitName,
                  propertyName: t.propertyName
                }))
              });
              setNeedsRoleSelection(true);
            }
          } else if (hasLandlord) {
            console.log('🔵 Setting landlord user, id:', memberships.landlord!.id);
            setState(prev => ({
              ...prev,
              currentUser: { role: 'landlord', id: memberships.landlord!.id },
            }));
          } else if (hasTenants) {
            console.log('🔵 Setting tenant user, id:', memberships.tenants[0].id);
            setState(prev => ({
              ...prev,
              currentUser: { role: 'tenant', id: memberships.tenants[0].id },
            }));
          } else {
            console.error('🔴 Memberships object exists but no landlord or tenant found');
          }
        } else {
          console.error('🔴 No memberships found in localStorage');
        }
      } else {
        console.log('🔵 User not authenticated, skipping session restore');
      }

      // Mark session check as complete
      setSessionReady(true);
    };

    restoreSession();
  }, []);

  // Fetch data when user is authenticated
  useEffect(() => {
    const loadData = async () => {
      if (!authService.isAuthenticated() || !state.currentUser || dataLoaded) {
        return;
      }

      console.log('🔵 Loading data from backend...');
      setLoading(true);
      try {
        const promises: [
          Promise<Property[]>,
          Promise<Unit[]>,
          Promise<TenantMembership[]>,
          Promise<Payment[]>
        ] = [
            fetchProperties(),
            fetchUnits(),
            fetchTenants(),
            fetchPayments(),
          ];

        // Load Stripe status only for landlords (handled separately to avoid type issues)
        if (state.currentUser.role === 'landlord') {
          getStripeConnectStatus().then(status => {
            setStripeOnboarded(status.onboarded);
            setStripeStatus({
              requirementsDue: status.requirementsDue || [],
              requirementsPending: status.requirementsPending || [],
              disabledReason: status.disabledReason || null,
              payoutsEnabled: status.payoutsEnabled || false,
            });
          }).catch(error => {
            console.error('��� Failed to load Stripe status:', error);
            setStripeOnboarded(false);
            setStripeStatus(null);
          });
        }

        const [properties, units, tenants, payments] = await Promise.all(promises);

        console.log('🔵 Data loaded:', { properties, units, tenants, payments });

        setState(prev => ({
          ...prev,
          properties,
          units,
          tenantMemberships: tenants,
          payments,
        }));
        setDataLoaded(true);
      } catch (error) {
        console.error('🔴 Failed to load data:', error);
        // Don't logout on data fetch failure - just show empty state
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [state.currentUser?.id, dataLoaded]);

  const selectRole = (role: UserRole, id: string) => {
    console.log(`🔵 User selected role: ${role}, id: ${id}`);
    // Store the selection for future sessions
    authService.setSelectedRole(role, id);
    setState(prev => ({
      ...prev,
      currentUser: { role, id },
    }));
    setNeedsRoleSelection(false);
    setAvailableRoles(null);
  };

  const login = (role: UserRole, id: string) => {
    setState((prev) => ({
      ...prev,
      currentUser: { role, id },
    }));
  };

  const logout = () => {
    authService.clearAuth();
    setDataLoaded(false);
    setNeedsRoleSelection(false);
    setAvailableRoles(null);
    setState({
      users: [],
      landlordAccounts: [],
      properties: [],
      units: [],
      tenantMemberships: [],
      payments: [],
      currentUser: null,
    });
  };

  // Backward compatibility: expose aliases
  const contextValue = useMemo(() => ({
    ...state,
    landlords: state.landlordAccounts,
    tenants: state.tenantMemberships,
    updateState,
    login,
    logout,
    loading: !sessionReady || loading,
    stripeOnboarded,
    stripeStatus,
    needsRoleSelection,
    availableRoles,
    selectRole,
  }), [
    state.users,
    state.landlordAccounts,
    state.properties,
    state.units,
    state.tenantMemberships,
    state.payments,
    state.currentUser,
    loading,
    sessionReady,
    stripeOnboarded,
    stripeStatus,
    needsRoleSelection,
    availableRoles
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
