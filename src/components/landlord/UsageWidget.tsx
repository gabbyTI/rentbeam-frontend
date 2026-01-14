import React from 'react';
import { CurrentSubscription } from '../../types';

interface UsageWidgetProps {
  subscription: CurrentSubscription;
}

export const UsageWidget: React.FC<UsageWidgetProps> = ({ subscription }) => {
  const { currentUnitCount, unitLimit, unitsRemaining } = subscription;
  
  // Calculate usage percentage
  const usagePercent = unitLimit > 0 ? (currentUnitCount / unitLimit) * 100 : 0;
  
  // Determine color based on usage percentage
  const getColorClass = () => {
    if (usagePercent >= 100) return 'bg-red-600';
    if (usagePercent >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const getTextColorClass = () => {
    if (usagePercent >= 100) return 'text-red-600';
    if (usagePercent >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Unit Usage</h3>
        <span className={`text-sm font-medium ${getTextColorClass()}`}>
          {currentUnitCount} / {unitLimit} units
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${getColorClass()}`}
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
        />
      </div>
      
      {/* Usage Details */}
      <div className="flex justify-between text-sm text-gray-600">
        <span>{unitsRemaining} units remaining</span>
        <span>{usagePercent.toFixed(0)}% used</span>
      </div>
      
      {/* Warning Messages */}
      {usagePercent >= 100 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            <strong>Unit limit reached!</strong> Upgrade your plan to add more properties and units.
          </p>
        </div>
      )}
      
      {usagePercent >= 80 && usagePercent < 100 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Approaching limit.</strong> Consider upgrading your plan soon.
          </p>
        </div>
      )}
    </div>
  );
};
