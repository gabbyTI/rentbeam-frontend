import React from 'react';
import { Card, CardContent } from './Card';

type MetricVariant = 'success' | 'warning' | 'danger' | 'neutral';
type MetricSize = 'large' | 'medium' | 'small';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subValue?: string;
  icon?: string;
  variant?: MetricVariant;
  size?: MetricSize;
  progressBar?: {
    value: number;
    max: number;
  };
  footer?: React.ReactNode;
  onClick?: () => void;
}

const getVariantColors = (variant: MetricVariant) => {
  switch (variant) {
    case 'success':
      return {
        bg: 'bg-green-50',
        text: 'text-green-900',
        border: 'border-green-200',
        progress: 'bg-green-500'
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-900',
        border: 'border-yellow-200',
        progress: 'bg-yellow-500'
      };
    case 'danger':
      return {
        bg: 'bg-red-50',
        text: 'text-red-900',
        border: 'border-red-200',
        progress: 'bg-red-500'
      };
    default:
      return {
        bg: 'bg-white',
        text: 'text-gray-900',
        border: 'border-gray-200',
        progress: 'bg-blue-500'
      };
  }
};

const getSizeClasses = (size: MetricSize) => {
  switch (size) {
    case 'large':
      return {
        value: 'text-4xl sm:text-5xl md:text-6xl',
        title: 'text-base sm:text-lg',
        subtitle: 'text-sm sm:text-base'
      };
    case 'medium':
      return {
        value: 'text-2xl sm:text-3xl md:text-4xl',
        title: 'text-sm sm:text-base',
        subtitle: 'text-xs sm:text-sm'
      };
    case 'small':
      return {
        value: 'text-2xl',
        title: 'text-sm',
        subtitle: 'text-xs'
      };
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  subValue,
  icon,
  variant = 'neutral',
  size = 'large',
  progressBar,
  footer,
  onClick
}) => {
  const colors = getVariantColors(variant);
  const sizes = getSizeClasses(size);

  const content = (
    <Card className={`${colors.bg} ${colors.border} ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className={`${sizes.title} font-medium text-gray-600 mb-1`}>
              {title}
            </p>
            {subtitle && (
              <p className={`${sizes.subtitle} text-gray-500`}>{subtitle}</p>
            )}
          </div>
          {icon && (
            <span className="text-3xl">{icon}</span>
          )}
        </div>

        <div className="mb-3">
          <p className={`${sizes.value} font-bold ${colors.text}`}>
            {value}
          </p>
          {subValue && (
            <p className="text-sm text-gray-600 mt-1">{subValue}</p>
          )}
        </div>

        {progressBar && (
          <div className="mb-3">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`${colors.progress} h-2.5 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min((progressBar.value / progressBar.max) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {footer && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (onClick) {
    return (
      <div onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
        {content}
      </div>
    );
  }

  return content;
};
