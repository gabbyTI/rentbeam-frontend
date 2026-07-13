import React, { useState } from 'react';
import { LedgerEntry } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';
import { calculateDaysLate, isPaymentOnTime } from '../../utils/tenantAnalytics';

interface PaymentHistoryListProps {
  entries: LedgerEntry[];
  dueDay: number;
  gracePeriodDays: number;
}

export const PaymentHistoryList: React.FC<PaymentHistoryListProps> = ({
  entries,
  dueDay,
  gracePeriodDays
}) => {
  const [showFailedPayments, setShowFailedPayments] = useState(false);

  const postedEntries = entries.filter((entry) => entry.type === 'PAYMENT' && entry.status === 'POSTED');

  if (postedEntries.length === 0) {
    return (
      <EmptyState
        title="No payment history"
        description="Ledger payment records will appear here once rent is paid."
      />
    );
  }

  const filteredEntries = showFailedPayments ? postedEntries : postedEntries;
  const failedPaymentsCount = 0;

  const monthString = (date: string) => {
    const parsed = new Date(date);
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  };

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
        {filteredEntries.length === 0 ? (
          <EmptyState
            title="No payments to display"
            description="All ledger payment entries are filtered out."
          />
        ) : (
          filteredEntries.map((entry) => {
            const effectiveDate = new Date(entry.effectiveDate);
            const month = monthString(entry.effectiveDate);
            const isLate = !isPaymentOnTime(effectiveDate, month, dueDay, gracePeriodDays);
            const daysLate = calculateDaysLate(effectiveDate, month, dueDay);
            const isManual = entry.source === 'MANUAL';
            const amount = Number(entry.paymentAmount || 0);

            let methodLabel = 'Card';
            let methodEmoji = '';
            if (isManual) {
              if (entry.description.includes('Cash')) {
                methodLabel = 'Cash';
                methodEmoji = '💵';
              } else if (entry.description.includes('Check')) {
                methodLabel = 'Check';
                methodEmoji = '✓';
              } else if (entry.description.includes('Zelle')) {
                methodLabel = 'Zelle';
                methodEmoji = 'Ⓩ';
              } else if (entry.description.includes('Venmo')) {
                methodLabel = 'Venmo';
                methodEmoji = 'Ⓥ';
              } else {
                methodLabel = 'Manual';
                methodEmoji = '';
              }
            }

            return (
              <div
                key={entry.id}
                className="p-3 sm:p-4 rounded-lg bg-gray-50"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {isManual ? (
                      <span className="font-medium text-gray-900 text-sm sm:text-base">
                        {formatCurrency(amount)}
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1 text-sm sm:text-base">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={isManual ? 'manual' : 'autopay'}>
                      {isManual ? `${methodEmoji} ${methodLabel}` : 'Card'}
                    </Badge>
                    <Badge variant={isLate ? 'late' : 'paid'}>
                      {isLate ? `Late${daysLate > 0 ? ` (${daysLate} days)` : ''}` : 'On Time'}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Paid: {formatDate(entry.effectiveDate)}
                  </p>
                  {entry.description && (
                    <p className="text-xs sm:text-sm italic text-gray-600">
                      {entry.description}
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
