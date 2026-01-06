import { Payment } from '../types';

export interface TenantPaymentSummary {
  onTimeRate: number;
  currentStreak: number;
  totalPaidThisYear: number;
  totalFeesThisYear: number;
  totalPayments: number;
  latePayments: number;
  onTimePayments: number;
}

export interface YearToDateSummary {
  totalRent: number;
  totalFees: number;
  totalAmount: number;
  monthlyAverage: number;
  paymentsCount: number;
}

export interface PaymentTimelineItem {
  month: string;
  status: 'on-time' | 'late' | 'pending' | 'failed';
  amount: number;
  date?: Date;
  daysLate?: number;
}

/**
 * Calculate if a payment was made on time
 */
export function isPaymentOnTime(
  paymentDate: Date,
  monthString: string,
  dueDay: number,
  gracePeriodDays: number
): boolean {
  const [year, month] = monthString.split('-').map(Number);
  const dueDate = new Date(year, month - 1, dueDay);
  const graceEndDate = new Date(dueDate);
  graceEndDate.setDate(dueDate.getDate() + gracePeriodDays);
  
  return paymentDate <= graceEndDate;
}

/**
 * Calculate days late for a payment
 */
export function calculateDaysLate(
  paymentDate: Date,
  monthString: string,
  dueDay: number
): number {
  const [year, month] = monthString.split('-').map(Number);
  const dueDate = new Date(year, month - 1, dueDay);
  
  const diffTime = paymentDate.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Calculate tenant payment summary metrics
 */
export function calculateTenantPaymentSummary(
  payments: Payment[],
  dueDay: number,
  gracePeriodDays: number
): TenantPaymentSummary {
  const currentYear = new Date().getFullYear();
  
  // Filter succeeded payments only
  const successfulPayments = payments.filter(p => p.status === 'SUCCEEDED');
  
  // Calculate on-time vs late
  let onTimeCount = 0;
  let lateCount = 0;
  let currentStreakCount = 0;
  let streakBroken = false;
  
  // Sort by date descending (newest first) for streak calculation
  const sortedPayments = [...successfulPayments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  successfulPayments.forEach(payment => {
    const paymentDate = new Date(payment.date);
    const onTime = isPaymentOnTime(paymentDate, payment.month, dueDay, gracePeriodDays);
    
    if (onTime) {
      onTimeCount++;
    } else {
      lateCount++;
    }
  });
  
  // Calculate current streak (consecutive on-time payments from most recent)
  for (const payment of sortedPayments) {
    const paymentDate = new Date(payment.date);
    const onTime = isPaymentOnTime(paymentDate, payment.month, dueDay, gracePeriodDays);
    
    if (onTime && !streakBroken) {
      currentStreakCount++;
    } else {
      streakBroken = true;
      break;
    }
  }
  
  // Calculate year-to-date totals
  const thisYearPayments = successfulPayments.filter(p => 
    p.month.startsWith(currentYear.toString())
  );
  
  const totalPaidThisYear = thisYearPayments.reduce(
    (sum, p) => sum + Number(p.rentAmount || 0),
    0
  );
  
  const totalFeesThisYear = thisYearPayments.reduce(
    (sum, p) => sum + Number(p.processingFee || 0),
    0
  );
  
  const onTimeRate = successfulPayments.length > 0 
    ? (onTimeCount / successfulPayments.length) * 100 
    : 0;
  
  return {
    onTimeRate,
    currentStreak: currentStreakCount,
    totalPaidThisYear,
    totalFeesThisYear,
    totalPayments: successfulPayments.length,
    latePayments: lateCount,
    onTimePayments: onTimeCount,
  };
}

/**
 * Calculate year-to-date financial summary
 */
export function calculateYearToDateSummary(payments: Payment[]): YearToDateSummary {
  const currentYear = new Date().getFullYear();
  
  const thisYearPayments = payments.filter(
    p => p.status === 'SUCCEEDED' && p.month.startsWith(currentYear.toString())
  );
  
  const totalRent = thisYearPayments.reduce(
    (sum, p) => sum + Number(p.rentAmount || 0),
    0
  );
  
  const totalFees = thisYearPayments.reduce(
    (sum, p) => sum + Number(p.processingFee || 0),
    0
  );
  
  const totalAmount = thisYearPayments.reduce(
    (sum, p) => sum + Number(p.totalAmount || 0),
    0
  );
  
  const monthlyAverage = thisYearPayments.length > 0 
    ? totalAmount / thisYearPayments.length 
    : 0;
  
  return {
    totalRent,
    totalFees,
    totalAmount,
    monthlyAverage,
    paymentsCount: thisYearPayments.length,
  };
}

/**
 * Generate payment timeline - always shows 6 months total
 * For new tenants: shows (past months since move-in) + (future months) = 6 total
 * For established tenants: shows last 6 months only
 */
export function generatePaymentTimeline(
  payments: Payment[],
  dueDay: number,
  gracePeriodDays: number,
  moveInDate?: Date | string
): PaymentTimelineItem[] {
  const timeline: PaymentTimelineItem[] = [];
  const today = new Date();
  const moveIn = moveInDate ? new Date(moveInDate) : null;
  
  // Calculate months since move-in
  let monthsSinceMoveIn = 6; // default to 6 if no move-in date
  if (moveIn) {
    const moveInMonthStart = new Date(moveIn.getFullYear(), moveIn.getMonth(), 1);
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthsSinceMoveIn = 
      (currentMonthStart.getFullYear() - moveInMonthStart.getFullYear()) * 12 +
      (currentMonthStart.getMonth() - moveInMonthStart.getMonth()) + 1; // +1 to include current month
  }
  
  // Determine how many past and future months to show
  const monthsToShow = 6;
  let startOffset: number;
  let endOffset: number;
  
  if (monthsSinceMoveIn < monthsToShow) {
    // New tenant: show all months since move-in + future months to make 6 total
    startOffset = monthsSinceMoveIn - 1; // past months (0-indexed)
    endOffset = -(monthsToShow - monthsSinceMoveIn); // future months (negative means future)
  } else {
    // Established tenant: show last 6 months
    startOffset = 5;
    endOffset = 0;
  }
  
  // Generate timeline from past to future
  for (let i = startOffset; i >= endOffset; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // Skip if before move-in date
    if (moveIn) {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const moveInMonthStart = new Date(moveIn.getFullYear(), moveIn.getMonth(), 1);
      if (monthStart < moveInMonthStart) {
        continue;
      }
    }
    
    const payment = payments.find(p => p.month === monthString && p.status === 'SUCCEEDED');
    
    if (payment) {
      const paymentDate = new Date(payment.date);
      const onTime = isPaymentOnTime(paymentDate, payment.month, dueDay, gracePeriodDays);
      const daysLate = calculateDaysLate(paymentDate, payment.month, dueDay);
      
      timeline.push({
        month: monthString,
        status: onTime ? 'on-time' : 'late',
        amount: Number(payment.totalAmount || 0),
        date: paymentDate,
        daysLate: daysLate,
      });
    } else {
      // Check if this month is in the past, current, or future
      const dueDate = new Date(date.getFullYear(), date.getMonth(), dueDay);
      const isPast = dueDate < today;
      const isFuture = date > today;
      
      // Check for pending/failed payment
      const pendingPayment = payments.find(p => p.month === monthString && p.status === 'PENDING');
      const failedPayment = payments.find(p => p.month === monthString && p.status === 'FAILED');
      
      if (failedPayment) {
        timeline.push({
          month: monthString,
          status: 'failed',
          amount: Number(failedPayment.totalAmount || 0),
          date: new Date(failedPayment.date),
        });
      } else if (pendingPayment) {
        timeline.push({
          month: monthString,
          status: 'pending',
          amount: Number(pendingPayment.totalAmount || 0),
          date: new Date(pendingPayment.date),
        });
      } else {
        // No payment found - show as pending (gray)
        timeline.push({
          month: monthString,
          status: 'pending',
          amount: 0,
        });
      }
    }
  }
  
  return timeline;
}

