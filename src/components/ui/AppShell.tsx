import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from './Button';
import { StripeOnboardingBanner } from './StripeOnboardingBanner';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const navClass = (path: string) =>
    `py-4 px-1 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${isActive(path)
      ? 'text-primary-600 border-primary-600'
      : 'text-gray-700 hover:text-primary-600 border-transparent hover:border-primary-600'
    }`;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchRole = () => {
    // Clear selected role to force role selector
    localStorage.removeItem('rentbeam_selected_role');
    window.location.reload();
  };

  // Check for multiple accounts from stored memberships
  const memberships = JSON.parse(localStorage.getItem('rentbeam_memberships') || 'null');
  const hasMultipleAccounts = memberships && (
    (memberships.landlord && memberships.tenants && memberships.tenants.length > 0) ||
    (memberships.tenants && memberships.tenants.length > 1)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <h1
                className="text-lg sm:text-xl font-bold text-primary-600 cursor-pointer"
                onClick={() => navigate(currentUser?.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard')}
              >
                RentBeam
              </h1>
            </div>
            {currentUser && (
              <div className="flex items-center space-x-2 sm:space-x-4">
                <span className="hidden sm:inline text-sm text-gray-600 capitalize">
                  {currentUser.role}
                </span>
                {hasMultipleAccounts && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSwitchRole}
                    className="text-xs sm:text-sm"
                  >
                    Switch Account
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(currentUser.role === 'landlord' ? '/landlord/settings' : '/tenant/settings')}
                  className="hidden sm:inline-flex"
                >
                  Settings
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation for landlord */}
      {currentUser?.role === 'landlord' && (
        <nav className="bg-white border-b border-gray-200 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-4 sm:space-x-8">
              <button onClick={() => navigate('/landlord/dashboard')} className={navClass('/landlord/dashboard')}>Dashboard</button>
              <button onClick={() => navigate('/landlord/properties')} className={navClass('/landlord/properties')}>Properties</button>
              <button onClick={() => navigate('/landlord/tenants')} className={navClass('/landlord/tenants')}>Tenants</button>
              <button onClick={() => navigate('/landlord/settings')} className={navClass('/landlord/settings')}>Settings</button>
            </div>
          </div>
        </nav>
      )}

      {/* Navigation for tenant */}
      {currentUser?.role === 'tenant' && (
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button onClick={() => navigate('/tenant/dashboard')} className={navClass('/tenant/dashboard')}>Dashboard</button>
              <button onClick={() => navigate('/tenant/tenancy')} className={navClass('/tenant/tenancy')}>My Tenancy</button>
              <button onClick={() => navigate('/tenant/settings')} className={navClass('/tenant/settings')}>Settings</button>
            </div>
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentUser?.role === 'landlord' && <StripeOnboardingBanner />}
        {children}
      </main>
    </div>
  );
};
