import { PaymentStatus, TenantMembership, Payment, Unit } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format a date string without timezone shift (UTC-safe)
 * Use this for dates that were stored as date-only (e.g., move-in dates)
 */
export const formatDateUTC = (dateString: string): string => {
  // Extract date portion and parse as local time
  const [datePart] = dateString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getCurrentRentMonth = (unit?: Unit): string => {
  const dueDay = unit?.dueDay ?? 1;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentDay = now.getDate();

  // Determine the next due date
  let rentYear = currentYear;
  let rentMonth = currentMonth;

  // If we're past the due day this month, next due date is next month
  if (currentDay > dueDay) {
    rentMonth = currentMonth + 1;
    if (rentMonth > 11) {
      rentMonth = 0;
      rentYear = currentYear + 1;
    }
  }

  // Calculate the due date and payment window open date
  const dueDate = new Date(rentYear, rentMonth, dueDay);
  const paymentWindowOpenDate = new Date(dueDate);
  paymentWindowOpenDate.setDate(dueDate.getDate() - 5);

  // If payment window is not yet open, return previous month
  if (now < paymentWindowOpenDate) {
    const prevMonth = rentMonth === 0 ? 11 : rentMonth - 1;
    const prevYear = rentMonth === 0 ? rentYear - 1 : rentYear;
    return `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
  }

  // Payment window is open for the upcoming rent month
  return `${rentYear}-${String(rentMonth + 1).padStart(2, '0')}`;
};

export const formatRentMonth = (monthString: string): string => {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long' });
};

export const getPaymentStatus = (
  tenant: TenantMembership,
  payments: Payment[],
  unit?: Unit
): PaymentStatus => {
  const dueDay = unit?.dueDay ?? 1;
  const gracePeriod = unit?.gracePeriodDays ?? 0;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // The current billing month is the month we're in
  // (rent for February is due on Feb 1st, not March 1st)
  const currentRentMonthString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  // Check if tenant's first payment cycle
  const moveInDate = new Date(tenant.moveInDate);
  const moveInYear = moveInDate.getFullYear();
  const moveInMonth = moveInDate.getMonth();

  // If tenant moved in this month, they already paid initial rent
  // Check if current month has a PROCESSING payment
  const hasProcessingPayment = payments.some(
    (p) => p.tenantMembershipId === tenant.id &&
      p.month === currentRentMonthString &&
      p.status === 'PROCESSING'
  );

  if (hasProcessingPayment) {
    return 'processing';
  }

  // Check if current month has a payment
  const hasCurrentMonthPayment = payments.some(
    (p) => p.tenantMembershipId === tenant.id &&
      p.month === currentRentMonthString &&
      (p.status === 'SUCCEEDED' || p.status === 'PENDING')
  );

  // If current month is paid, check if we're in the window for NEXT month
  if (hasCurrentMonthPayment) {
    // Calculate next month
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear = currentYear + 1;
    }

    const nextDueDate = new Date(nextYear, nextMonth, dueDay);
    const nextWindowOpenDate = new Date(nextDueDate);
    nextWindowOpenDate.setDate(nextDueDate.getDate() - 5);

    // If next month's payment window is open, check for that payment
    if (now >= nextWindowOpenDate) {
      const nextRentMonthString = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}`;

      // Check for PROCESSING payment for next month
      const hasNextMonthProcessing = payments.some(
        (p) => p.tenantMembershipId === tenant.id &&
          p.month === nextRentMonthString &&
          p.status === 'PROCESSING'
      );

      if (hasNextMonthProcessing) {
        return 'processing';
      }

      const hasNextMonthPayment = payments.some(
        (p) => p.tenantMembershipId === tenant.id &&
          p.month === nextRentMonthString &&
          (p.status === 'SUCCEEDED' || p.status === 'PENDING')
      );

      if (!hasNextMonthPayment) {
        if (now < nextDueDate) return 'pending';
        const lateDate = new Date(nextDueDate);
        lateDate.setDate(nextDueDate.getDate() + gracePeriod);
        if (now <= lateDate) return 'due';
        return 'late';
      }
    }

    return 'paid';
  }

  // Current month is NOT paid
  // Check if tenant just moved in this month (initial payment already created)
  if (moveInYear === currentYear && moveInMonth === currentMonth) {
    // They should have an initial payment - if not, that's a bug but show as paid
    // because initial payment is created on tenant creation
    return 'paid';
  }

  // Current month is not paid and tenant didn't just move in
  // Determine status based on where we are in the billing cycle
  const dueDate = new Date(currentYear, currentMonth, dueDay);
  const paymentWindowOpenDate = new Date(dueDate);
  paymentWindowOpenDate.setDate(dueDate.getDate() - 5);

  // If payment window hasn't opened yet (we're very early in previous month)
  // This shouldn't normally happen but handle it
  if (now < paymentWindowOpenDate) {
    return 'paid'; // Too early, no payment expected yet
  }

  // Payment window is open
  if (now < dueDate) {
    return 'pending'; // Window open, before due date
  }

  // Past due date, check grace period
  const lateDate = new Date(dueDate);
  lateDate.setDate(dueDate.getDate() + gracePeriod);

  if (now <= lateDate) {
    return 'due'; // Past due but within grace period
  }

  return 'late'; // Past grace period
};

export const getNextChargeDate = (dueDay: number): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentDay = now.getDate();

  // If we're past the due day, next charge is next month
  let targetMonth = month;
  let targetYear = year;

  if (currentDay >= dueDay) {
    targetMonth = month + 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear = year + 1;
    }
  }

  const nextDate = new Date(targetYear, targetMonth, dueDay);
  return formatDate(nextDate.toISOString());
};

export const wasPaymentLate = (
  payment: Payment,
  dueDay: number,
  gracePeriodDays: number
): boolean => {
  const paymentDate = new Date(payment.date);

  // Parse the payment's billing month (e.g., "2026-02")
  const [year, month] = payment.month.split('-').map(Number);

  // Calculate the due date for this billing month
  const dueDate = new Date(year, month - 1, dueDay); // month is 1-indexed

  // Calculate the grace period deadline
  const graceDeadline = new Date(dueDate);
  graceDeadline.setDate(dueDate.getDate() + gracePeriodDays);

  // Payment is late only if it was made AFTER the grace period deadline
  return paymentDate > graceDeadline;
};

export const isPaymentWindowOpen = (unit?: Unit): boolean => {
  const dueDay = unit?.dueDay ?? 1;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentDay = now.getDate();

  // Determine the next due date
  let rentYear = currentYear;
  let rentMonth = currentMonth;

  // If we're past the due day this month, next due date is next month
  if (currentDay > dueDay) {
    rentMonth = currentMonth + 1;
    if (rentMonth > 11) {
      rentMonth = 0;
      rentYear = currentYear + 1;
    }
  }

  // Calculate the due date and payment window open date
  const dueDate = new Date(rentYear, rentMonth, dueDay);
  const paymentWindowOpenDate = new Date(dueDate);
  paymentWindowOpenDate.setDate(dueDate.getDate() - 5);

  // Check if payment window is open
  return now >= paymentWindowOpenDate;
};

export const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateToken = (): string => {
  return Math.random().toString(36).substr(2, 16);
};
