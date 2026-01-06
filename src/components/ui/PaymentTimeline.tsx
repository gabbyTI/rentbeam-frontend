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
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {timeline.map((item, index) => (
          <div key={item.month} className="flex flex-col items-center gap-2 min-w-[60px] sm:min-w-[80px]">
            <div className="relative group">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${getStatusColor(
                  item.status
                )} flex items-center justify-center text-white font-bold text-sm sm:text-base transition-transform hover:scale-110`}
              >
                {getStatusIcon(item.status)}
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
                  <div className="font-medium">{formatMonth(item.month)}</div>
                  <div>{getStatusLabel(item.status)}</div>
                  {item.daysLate !== undefined && item.daysLate > 0 && (
                    <div className="text-yellow-300">{item.daysLate} days late</div>
                  )}
                  {item.date && (
                    <div className="text-gray-300 mt-1">
                      {item.date.toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
            
            {/* Month label */}
            <span className="text-xs text-gray-600 text-center">
              {formatMonth(item.month)}
            </span>
            
            {/* Connecting line */}
            {index < timeline.length - 1 && (
              <div className="absolute top-5 sm:top-6 left-[calc(50%+30px)] sm:left-[calc(50%+40px)] w-[40px] sm:w-[60px] h-0.5 bg-gray-300" />
            )}
          </div>
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
