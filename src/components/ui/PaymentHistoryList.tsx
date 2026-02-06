import React, { useState } from 'react';
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
  const [showFailedPayments, setShowFailedPayments] = useState(false);

  // Filter payments based on toggle
  const filteredPayments = showFailedPayments
    ? payments
    : payments.filter(p => p.status !== 'FAILED');

  if (payments.length === 0) {
    return (
      <EmptyState
        title="No payment history"
        description="Payment records will appear here once rent is paid."
      />
    );
  }

  const failedPaymentsCount = payments.filter(p => p.status === 'FAILED').length;

  return (
    <div className="space-y-4">
      {/* Filter Toggle */}
      {failedPaymentsCount > 0 && (
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFailedPayments}
              onChange={(e) => setShowFailedPayments(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Show failed attempts
            </span>
          </label>
        </div>
      )}

      {/* Payment List */}
      <div className="space-y-3">
        {filteredPayments.length === 0 ? (
          <EmptyState
            title="No payments to display"
            description="All payments are filtered out."
          />
        ) : (
          filteredPayments.map((payment) => {
            const isLate = wasPaymentLate(payment, dueDay, gracePeriodDays);
            const isFailed = payment.status === 'FAILED';

            // Calculate due date from payment month and dueDay
            const [year, month] = payment.month.split('-');
            const dueDate = new Date(parseInt(year), parseInt(month) - 1, dueDay);

            // Determine payment method display
            let methodLabel = 'Card';
            let methodEmoji = '';
            if (payment.method === 'MANUAL') {
              if (payment.paymentMethod === 'Cash') {
                methodLabel = 'Cash';
                methodEmoji = '💵';
              } else if (payment.paymentMethod === 'Check') {
                methodLabel = 'Check';
                methodEmoji = '✓';
              } else if (payment.paymentMethod === 'Zelle') {
                methodLabel = 'Zelle';
                methodEmoji = 'Ⓩ';
              } else if (payment.paymentMethod === 'Venmo') {
                methodLabel = 'Venmo';
                methodEmoji = 'Ⓥ';
              } else {
                methodLabel = payment.paymentMethod || 'Manual';
                methodEmoji = '';
              }
            }

            return (
              <div
                key={payment.id}
                className={`p-3 sm:p-4 rounded-lg ${isFailed ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                  }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {payment.method === 'CARD' ? (
                      <div className="flex flex-wrap items-center gap-1 text-sm sm:text-base">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(payment.rentAmount || 0)}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500">rent</span>
                        <span className="text-gray-400">+</span>
                        <span className="text-xs sm:text-sm text-gray-600">
                          {formatCurrency(payment.processingFee || 0)}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500">fee</span>
                        <span className="text-gray-400">=</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(payment.totalAmount || 0)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-medium text-gray-900 text-sm sm:text-base">
                        {formatCurrency(payment.amount)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={payment.method === 'CARD' ? 'autopay' : 'manual'}>
                      {payment.method === 'CARD' ? 'Card' : `${methodEmoji} ${methodLabel}`}
                    </Badge>
                    {isFailed ? (
                      <Badge variant="late">
                        ❌ Failed
                      </Badge>
                    ) : (
                      <Badge variant={isLate ? 'late' : 'paid'}>
                        {isLate ? 'Late' : 'On Time'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Due: {formatDate(dueDate.toISOString())} • {isFailed ? 'Attempted' : 'Paid'}: {formatDate(payment.date)}
                  </p>
                  {payment.note && (
                    <p className={`text-xs sm:text-sm italic ${isFailed ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
                      {payment.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
