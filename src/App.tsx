import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/ui/Toast';
import { Login } from './components/Login';
import { AccountSelector } from './components/AccountSelector';
import { LandlordSignup } from './components/landlord/LandlordSignup';
import { VerifyEmail } from './components/VerifyEmail';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { LandlordCompleteSetup } from './components/landlord/LandlordCompleteSetup';
import { LandlordCompleteProfile } from './components/landlord/LandlordCompleteProfile';
import { LandlordOnboarding } from './components/landlord/LandlordOnboarding';
import { LandlordDashboard } from './components/landlord/LandlordDashboard';
import { LandlordProperties } from './components/landlord/LandlordProperties';
import { LandlordTenants } from './components/landlord/LandlordTenants';
import { TenantDetails } from './components/landlord/TenantDetails';
import { InviteAccept } from './components/tenant/InviteAccept';
import { TenantRegister } from './components/tenant/TenantRegister';
import { TenantDashboard } from './components/tenant/TenantDashboard';
import { TenantSettings } from './components/tenant/TenantSettings';
import { LandlordSettings } from './components/landlord/LandlordSettings';
import { SetupPaymentMethod } from './components/tenant/SetupPaymentMethod';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  role?: 'landlord' | 'tenant';
}> = ({ children, role }) => {
  const { currentUser, loading } = useApp();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-t-transparent rounded-full animate-spin border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (role && currentUser.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { currentUser, needsRoleSelection, availableRoles, selectRole } = useApp();

  // Show role selector if user has multiple roles
  if (needsRoleSelection && availableRoles) {
    return (
      <AccountSelector
        onSelectAccount={selectRole}
        landlordId={availableRoles.landlord?.id}
        tenantMemberships={availableRoles.tenants}
      />
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/landlord/signup" element={<LandlordSignup />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/landlord/complete-profile" element={<LandlordCompleteProfile />} />
      <Route path="/landlord/complete-setup" element={<LandlordCompleteSetup />} />
      <Route path="/landlord/onboarding" element={<LandlordOnboarding />} />
      <Route path="/invite/:token" element={<InviteAccept />} />
      <Route path="/tenant/register" element={<TenantRegister />} />

      <Route
        path="/landlord/dashboard"
        element={
          <ProtectedRoute role="landlord">
            <LandlordDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/properties"
        element={
          <ProtectedRoute role="landlord">
            <LandlordProperties />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/tenants"
        element={
          <ProtectedRoute role="landlord">
            <LandlordTenants />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/tenants/:tenantId"
        element={
          <ProtectedRoute role="landlord">
            <TenantDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/settings"
        element={
          <ProtectedRoute role="landlord">
            <LandlordSettings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tenant/dashboard"
        element={
          <ProtectedRoute role="tenant">
            <TenantDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenant/autopay"
        element={<Navigate to="/tenant/settings" replace />}
      />
      <Route
        path="/tenant/payment-method"
        element={
          <ProtectedRoute role="tenant">
            <SetupPaymentMethod />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenant/settings"
        element={
          <ProtectedRoute role="tenant">
            <TenantSettings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          currentUser ? (
            currentUser.role === 'landlord' ? (
              <Navigate to="/landlord/dashboard" replace />
            ) : (
              <Navigate to="/tenant/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          <AppRoutes />
          <ToastContainer />
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
