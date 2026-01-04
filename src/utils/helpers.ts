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
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentDay = now.getDate();
  
  // Determine the next due date (same logic as getCurrentRentMonth)
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
  
  // If payment window is not yet open, show as paid (nothing due yet)
  if (now < paymentWindowOpenDate) {
    return 'paid';
  }
  
  // Payment window is open - check for payment for this rent month
  const rentMonthString = `${rentYear}-${String(rentMonth + 1).padStart(2, '0')}`;
  const hasPayment = payments.some(
    (p) => p.tenantMembershipId === tenant.id && p.month === rentMonthString
  );
  
  if (hasPayment) {
    return 'paid';
  }
  
  // Payment window is open but not paid yet
  if (now < dueDate) {
    return 'pending';
  }
  
  // Past due date, check grace period
  const gracePeriod = unit?.gracePeriodDays ?? 0;
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
  const paymentDay = paymentDate.getDate();
  const lateDay = dueDay + gracePeriodDays;
  
  return paymentDay > lateDay;
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
