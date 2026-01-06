import React from 'react';
import { PaymentTimelineItem } from '../../utils/tenantAnalytics';

interface PaymentTimelineProps {
  timeline: PaymentTimelineItem[];
}

export const PaymentTimeline: React.FC<PaymentTimelineProps> = ({ timeline }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-time':
        return 'bg-green-500';
      case 'late':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      case 'pending':
        return 'bg-gray-300';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on-time':
        return 'On Time';
      case 'late':
        return 'Late';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-time':
        return '✓';
      case 'late':
        return '⚠';
      case 'failed':
        return '✕';
      case 'pending':
        return '○';
      default:
        return '○';
    }
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="relative flex items-center justify-between gap-2 overflow-x-auto pb-2 pt-24 -mt-20">
        {timeline.map((item, index) => (
          <React.Fragment key={item.month}>
            <div className="flex flex-col items-center gap-2 min-w-[60px] sm:min-w-[80px] relative z-10">
              <div className="relative group">
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${getStatusColor(
                    item.status
                  )} flex items-center justify-center text-white font-bold text-sm sm:text-base transition-transform hover:scale-110 cursor-pointer`}
                >
                  {getStatusIcon(item.status)}
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl">
                    <div className="font-semibold text-sm">{formatMonth(item.month)} {item.month.split('-')[0]}</div>
                    <div className="mt-1">
                      <span className="font-medium">{getStatusLabel(item.status)}</span>
                    </div>
                    {item.amount > 0 && (
                      <div className="text-green-300 font-medium mt-1">
                        ${item.amount.toFixed(2)}
                      </div>
                    )}
                    {item.daysLate !== undefined && item.daysLate > 0 && (
                      <div className="text-yellow-300 mt-1">Late by {item.daysLate} days</div>
                    )}
                    {item.date && (
                      <div className="text-gray-400 mt-1 text-[10px]">
                        {item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                  {/* Tooltip arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
              
              {/* Month label */}
              <span className="text-xs text-gray-600 text-center">
                {formatMonth(item.month)}
              </span>
            </div>
            
            {/* Connecting line between circles */}
            {index < timeline.length - 1 && (
              <div className="flex-1 h-0.5 bg-gray-300 max-w-[80px] sm:max-w-[120px]" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2 border-t text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600">On Time</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-gray-600">Late</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-600">Failed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
          <span className="text-gray-600">Pending</span>
        </div>
      </div>
    </div>
  );
};
