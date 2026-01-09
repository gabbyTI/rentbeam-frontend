import React from 'react';
import { Button } from './ui/Button';

interface AccountSelectorProps {
  onSelectAccount: (role: 'landlord' | 'tenant', id: string) => void;
  landlordId?: string;
  tenantMemberships?: Array<{ id: string; unitName: string; propertyName: string }>;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  onSelectAccount,
  landlordId,
  tenantMemberships = []
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-center mb-6">Choose Your Account</h2>
        <p className="text-gray-600 text-center mb-8">
          You have access to multiple accounts. Please select which account you'd like to use:
        </p>
        
        <div className="space-y-4">
          {landlordId && (
            <Button
              onClick={() => onSelectAccount('landlord', landlordId)}
              className="w-full justify-start"
              variant="secondary"
            >
              <div className="text-left">
                <div className="font-semibold">🏠 Landlord Dashboard</div>
                <div className="text-sm text-gray-600">Manage your properties and tenants</div>
              </div>
            </Button>
          )}
          
          {tenantMemberships.map((membership) => (
            <Button
              key={membership.id}
              onClick={() => onSelectAccount('tenant', membership.id)}
              className="w-full justify-start"
              variant="secondary"
            >
              <div className="text-left">
                <div className="font-semibold">🏠 Tenant - {membership.propertyName}</div>
                <div className="text-sm text-gray-600">Unit {membership.unitName}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};