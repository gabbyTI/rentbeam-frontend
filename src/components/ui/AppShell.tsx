import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from './Button';
import { StripeOnboardingBanner } from './StripeOnboardingBanner';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, title }) => {
  const { currentUser, logout, stripeOnboarded } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
                RentTrack Lite
              </h1>
            </div>
            {currentUser && (
              <div className="flex items-center space-x-2 sm:space-x-4">
                <span className="hidden sm:inline text-sm text-gray-600 capitalize">
                  {currentUser.role}
                </span>
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
              <button
                onClick={() => navigate('/landlord/dashboard')}
                className="py-4 px-1 text-xs sm:text-sm font-medium text-gray-700 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600 whitespace-nowrap"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/landlord/properties')}
                className="py-4 px-1 text-xs sm:text-sm font-medium text-gray-700 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600 whitespace-nowrap"
              >
                Properties
              </button>
              <button
                onClick={() => navigate('/landlord/tenants')}
                className="py-4 px-1 text-xs sm:text-sm font-medium text-gray-700 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600 whitespace-nowrap"
              >
                Tenants
              </button>
              <button
                onClick={() => navigate('/landlord/settings')}
                className="py-4 px-1 text-xs sm:text-sm font-medium text-gray-700 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600 whitespace-nowrap"
              >
                Settings
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Navigation for tenant */}
      {currentUser?.role === 'tenant' && (
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button
                onClick={() => navigate('/tenant/dashboard')}
                className="py-4 text-sm font-medium text-gray-700 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/tenant/settings')}
                className="py-4 text-sm font-medium text-gray-700 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600"
              >
                Settings
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentUser?.role === 'landlord' && <StripeOnboardingBanner stripeOnboarded={stripeOnboarded} />}
        {children}
      </main>
    </div>
  );
};
