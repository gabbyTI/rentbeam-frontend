import React from 'react';
import { PaymentStatus, PaymentMethod } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: PaymentStatus | PaymentMethod | 'pending' | 'accepted' | 'current' | 'past' | 'default' | 'PENDING' | 'ACCEPTED' | 'ACTIVE' | 'INACTIVE' | 'autopay' | 'manual';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  const variants: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    due: 'bg-orange-100 text-orange-800',
    late: 'bg-red-100 text-red-800',
    AUTOPAY: 'bg-blue-100 text-blue-800',
    autopay: 'bg-blue-100 text-blue-800',
    MANUAL: 'bg-gray-100 text-gray-800',
    manual: 'bg-gray-100 text-gray-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    accepted: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    current: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-600',
    past: 'bg-gray-100 text-gray-600',
    default: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium ${variants[variant] || variants.default}`}
    >
      {children}
    </span>
  );
};
