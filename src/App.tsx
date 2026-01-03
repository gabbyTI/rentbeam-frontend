import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/ui/Toast';
import { Login } from './components/Login';
import { LandlordOnboarding } from './components/landlord/LandlordOnboarding';
import { LandlordDashboard } from './components/landlord/LandlordDashboard';
import { LandlordProperties } from './components/landlord/LandlordProperties';
import { LandlordTenants } from './components/landlord/LandlordTenants';
import { TenantDetails } from './components/landlord/TenantDetails';
import { InviteAccept } from './components/tenant/InviteAccept';
import { TenantRegister } from './components/tenant/TenantRegister';
import { TenantDashboard } from './components/tenant/TenantDashboard';
import { TenantAutopay } from './components/tenant/TenantAutopay';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  role?: 'landlord' | 'tenant';
}> = ({ children, role }) => {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (role && currentUser.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { currentUser } = useApp();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
        path="/tenant/dashboard"
        element={
          <ProtectedRoute role="tenant">
            <TenantDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenant/autopay"
        element={
          <ProtectedRoute role="tenant">
            <TenantAutopay />
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
