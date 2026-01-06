import React from 'react';
import { Card, CardContent } from './Card';

interface TenantMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

export const TenantMetricCard: React.FC<TenantMetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'border-gray-200',
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    info: 'border-blue-200 bg-blue-50',
  };

  const valueColors = {
    default: 'text-gray-900',
    success: 'text-green-900',
    warning: 'text-yellow-900',
    info: 'text-blue-900',
  };

  const getTrendIcon = () => {
    if (trend === 'up') return '↗';
    if (trend === 'down') return '↘';
    return '→';
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card className={`border ${variantStyles[variant]}`}>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">{title}</span>
            {icon && <span className="text-lg sm:text-xl">{icon}</span>}
          </div>
          
          <div className={`text-2xl sm:text-3xl font-bold ${valueColors[variant]}`}>
            {value}
          </div>
          
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
          
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-xs sm:text-sm ${getTrendColor()}`}>
              <span>{getTrendIcon()}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
