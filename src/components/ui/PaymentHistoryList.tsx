import React from 'react';
import { Payment } from '../../types';
import { formatCurrency, formatDate, wasPaymentLate } from '../../utils/helpers';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';

interface PaymentHistoryListProps {
  payments: Payment[];
  dueDay: number;
  gracePeriodDays: number;
}

export const PaymentHistoryList: React.FC<PaymentHistoryListProps> = ({ 
  payments, 
  dueDay, 
  gracePeriodDays 
}) => {
  if (payments.length === 0) {
    return (
      <EmptyState
        title="No payment history"
        description="Payment records will appear here once rent is paid."
      />
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => {
        const isLate = wasPaymentLate(payment, dueDay, gracePeriodDays);
        
        // Calculate due date from payment month and dueDay
        const [year, month] = payment.month.split('-');
        const dueDate = new Date(parseInt(year), parseInt(month) - 1, dueDay);
        
        return (
          <div
            key={payment.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">
                  {formatCurrency(payment.amount)}
                </span>
                <Badge variant={payment.method}>
                  {payment.method === 'autopay' ? 'Autopay (Card)' : 'Manual (Interac)'}
                </Badge>
                <Badge variant={isLate ? 'late' : 'paid'}>
                  {isLate ? 'Late' : 'On Time'}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Due: {formatDate(dueDate.toISOString())} • Paid: {formatDate(payment.date)}
              </p>
              {payment.note && (
                <p className="text-sm text-gray-600 mt-1">{payment.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
