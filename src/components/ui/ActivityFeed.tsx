import React from 'react';
import { Card, CardHeader, CardContent } from './Card';
import { Badge } from './Badge';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { RecentActivityItem } from '../../types';

interface ActivityFeedProps {
  activities: RecentActivityItem[];
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  maxItems = 10,
  showViewAll = false,
  onViewAll
}) => {
  const displayedActivities = activities.slice(0, maxItems);

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          {showViewAll && onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all →
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl sm:text-2xl">👤</span>
                  <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
                    {activity.tenantName}
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">
                  {formatCurrency(activity.amount)} • {formatDate(activity.date)}
                </p>
              </div>
              <div className="ml-2 sm:ml-3 flex-shrink-0">
                <Badge variant={activity.status === 'paid' ? 'accepted' : 'pending'}>
                  {activity.status === 'paid' ? '✓ Paid' : '⚠️ Late'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
