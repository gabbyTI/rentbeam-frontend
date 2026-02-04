import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { PaymentStatus } from '../../types';
import { formatCurrency, formatDateUTC } from '../../utils/helpers';

interface RentStatusCardProps {
    paymentStatus: PaymentStatus;
    rentAmount: number;
    dueDay: number;
    gracePeriodDays: number;
    propertyName: string;
    unitName: string;
    propertyAddress: string;
    landlordName: string;
    moveInDate: string;
    paidMonthName?: string;
    daysUntilDue?: number;
    daysGraceRemaining?: number;
    daysOverdue?: number;
    autopayEnabled: boolean;
}

export const RentStatusCard: React.FC<RentStatusCardProps> = ({
    paymentStatus,
    rentAmount,
    dueDay,
    gracePeriodDays,
    propertyName,
    unitName,
    propertyAddress,
    landlordName,
    moveInDate,
    paidMonthName,
    daysUntilDue = 0,
    daysGraceRemaining = 0,
    daysOverdue = 0,
    autopayEnabled,
}) => {
    const getStatusBadge = () => {
        switch (paymentStatus) {
            case 'paid':
                return (
                    <Badge variant="accepted">
                        ✓ Paid for {paidMonthName || 'this month'}
                    </Badge>
                );
            case 'processing':
                return (
                    <Badge variant="pending">
                        ⏳ Payment Processing
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge variant="current">
                        Due in {daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'}
                    </Badge>
                );
            case 'due':
                return (
                    <Badge variant="pending">
                        ⚠️ Due ({daysGraceRemaining} {daysGraceRemaining === 1 ? 'day' : 'days'} grace left)
                    </Badge>
                );
            case 'late':
                return (
                    <Badge variant="past">
                        🚨 Overdue by {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'}
                    </Badge>
                );
            default:
                return <Badge variant="current">Current</Badge>;
        }
    };

    const getStatusMessage = () => {
        if (paymentStatus === 'paid') {
            return autopayEnabled ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <span className="text-green-600 text-lg">🎉</span>
                        <div>
                            <p className="text-sm font-medium text-green-800">You're all caught up!</p>
                            <p className="text-xs text-green-700">
                                Next payment will be automatically charged on day {dueDay}.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <span className="text-green-600 text-lg">✓</span>
                        <p className="text-sm text-green-800">Payment received for {paidMonthName || 'this month'}.</p>
                    </div>
                </div>
            );
        }

        if (paymentStatus === 'processing') {
            return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <span className="text-yellow-600 text-lg">⏳</span>
                        <div>
                            <p className="text-sm font-medium text-yellow-800">Payment is being processed</p>
                            <p className="text-xs text-yellow-700">
                                Bank transfers typically take 2-5 business days to complete. You'll receive a confirmation email once processed.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        // For non-paid statuses, PaymentDueCard handles the messaging
        return null;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold">Current Rent</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            {propertyName} - {unitName}
                        </p>
                    </div>
                    <div>
                        {getStatusBadge()}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div>
                        <label className="text-xs sm:text-sm text-gray-500">Monthly Rent</label>
                        <p className="text-xl sm:text-2xl font-semibold">
                            {formatCurrency(rentAmount)}
                        </p>
                    </div>
                    <div>
                        <label className="text-xs sm:text-sm text-gray-500">Due Date</label>
                        <p className="text-xl sm:text-2xl font-semibold">Day {dueDay}</p>
                    </div>
                </div>

                {/* Status message (only for paid status) */}
                {getStatusMessage()}

                {/* Property details */}
                <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t mt-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
                        <span className="text-gray-500">Property Address</span>
                        <span className="font-medium text-right sm:text-left">{propertyAddress}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
                        <span className="text-gray-500">Landlord</span>
                        <span className="font-medium text-right sm:text-left">{landlordName}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
                        <span className="text-gray-500">Move-in Date</span>
                        <span className="font-medium text-right sm:text-left">
                            {formatDateUTC(moveInDate)}
                        </span>
                    </div>
                    {gracePeriodDays > 0 && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
                            <span className="text-gray-500">Grace Period</span>
                            <span className="font-medium text-right sm:text-left">{gracePeriodDays} days</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
