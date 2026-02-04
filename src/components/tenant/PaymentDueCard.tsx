import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PaymentStatus } from '../../types';
import { FeeBreakdown } from '../ui/FeeBreakdown';

interface PaymentDueCardProps {
    paymentStatus: PaymentStatus;
    rentAmount: number;
    dueDay: number;
    gracePeriodDays: number;
    propertyName: string;
    unitName: string;
    daysUntilDue: number;
    daysGraceRemaining: number;
    daysOverdue: number;
    hasPaymentMethod: boolean;
    paymentMethodLabel?: string | null;
    paymentMethodType?: string | null;
    autopayEnabled: boolean;
    onPayNow: () => void;
    onSetupPayment: () => void;
    onEnableAutopay: () => void;
}

export const PaymentDueCard: React.FC<PaymentDueCardProps> = ({
    paymentStatus,
    rentAmount,
    dueDay,
    gracePeriodDays,
    propertyName,
    unitName,
    daysUntilDue,
    daysGraceRemaining,
    daysOverdue,
    hasPaymentMethod,
    paymentMethodLabel,
    paymentMethodType,
    autopayEnabled,
    onPayNow,
    onSetupPayment,
    onEnableAutopay,
}) => {
    // Don't render if already paid
    if (paymentStatus === 'paid') {
        return null;
    }

    // Determine the month name for rent
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // If we're past the due day, we're paying for current month, else next month if window opened early
    const rentMonthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

    const getCardStyle = () => {
        switch (paymentStatus) {
            case 'late':
                return 'border-2 border-red-400 bg-red-50';
            case 'due':
                return 'border-2 border-amber-400 bg-amber-50';
            case 'pending':
            default:
                return 'border-2 border-blue-400 bg-blue-50';
        }
    };

    const getHeaderStyle = () => {
        switch (paymentStatus) {
            case 'late':
                return 'bg-red-100';
            case 'due':
                return 'bg-amber-100';
            case 'pending':
            default:
                return 'bg-blue-100';
        }
    };

    const getStatusBadge = () => {
        switch (paymentStatus) {
            case 'late':
                return (
                    <Badge variant="past">
                        🚨 Overdue by {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'}
                    </Badge>
                );
            case 'due':
                if (daysGraceRemaining > 0) {
                    return (
                        <Badge variant="pending">
                            ⚠️ {gracePeriodDays - daysGraceRemaining} {gracePeriodDays - daysGraceRemaining === 1 ? 'day' : 'days'} past due · {daysGraceRemaining} grace left
                        </Badge>
                    );
                }
                return (
                    <Badge variant="pending">
                        ⚠️ Due Today · {gracePeriodDays} days grace
                    </Badge>
                );
            case 'pending':
            default:
                return (
                    <Badge variant="current">
                        Due in {daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'}
                    </Badge>
                );
        }
    };

    const getTitle = () => {
        switch (paymentStatus) {
            case 'late':
                return `🚨 ${rentMonthName.toUpperCase()} RENT OVERDUE`;
            case 'due':
                return `⚠️ ${rentMonthName.toUpperCase()} RENT IS DUE`;
            case 'pending':
            default:
                return `💳 ${rentMonthName.toUpperCase()} RENT IS READY`;
        }
    };

    const getButtonStyle = () => {
        switch (paymentStatus) {
            case 'late':
                return 'bg-red-600 hover:bg-red-700';
            case 'due':
                return 'bg-amber-600 hover:bg-amber-700';
            case 'pending':
            default:
                return '';
        }
    };

    const getButtonText = () => {
        switch (paymentStatus) {
            case 'late':
                return '🚨 Pay Immediately';
            case 'due':
                return '⚠️ Pay Now';
            case 'pending':
            default:
                return '💳 Pay Now';
        }
    };

    return (
        <Card className={getCardStyle()}>
            <CardHeader className={getHeaderStyle()}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold">{getTitle()}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {propertyName} - {unitName}
                        </p>
                    </div>
                    <div>
                        {getStatusBadge()}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {autopayEnabled ? (
                    <div className="text-center py-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-lg font-semibold text-green-700">Autopay Enabled</span>
                        </div>
                        <p className="text-sm text-gray-600">
                            Your payment will be automatically charged on day {dueDay}.
                        </p>
                        {paymentMethodLabel && (
                            <p className="text-xs text-gray-500 mt-1">Using {paymentMethodLabel}</p>
                        )}
                    </div>
                ) : hasPaymentMethod ? (
                    <div className="space-y-4">
                        <FeeBreakdown rentAmount={rentAmount} paymentMethodType={paymentMethodType || undefined} />

                        <Button
                            onClick={onPayNow}
                            className={`w-full text-lg py-3 ${getButtonStyle()}`}
                            size="lg"
                        >
                            {getButtonText()}
                        </Button>

                        {paymentMethodLabel && (
                            <p className="text-xs text-center text-gray-500">Using {paymentMethodLabel}</p>
                        )}

                        <div className="border-t pt-4">
                            <button
                                onClick={onEnableAutopay}
                                className="w-full text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center gap-2"
                            >
                                <span>✨</span>
                                <span>Enable Autopay for future payments</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 space-y-4">
                        <p className="text-gray-600">
                            Set up a payment method to pay your rent online.
                        </p>
                        <Button onClick={onSetupPayment} className="w-full">
                            Add Payment Method
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
