import React from 'react';
import { SubscriptionHistoryEvent } from '../../types';
import { format } from 'date-fns';
import { 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Circle
} from 'lucide-react';

interface BillingHistoryProps {
  events: SubscriptionHistoryEvent[];
}

export const BillingHistory: React.FC<BillingHistoryProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h3>
        <div className="text-center py-8">
          <Circle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No billing history yet</p>
        </div>
      </div>
    );
  }

  // Sort events by date (newest first)
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Billing History</h3>
      
      <div className="space-y-4">
        {sortedEvents.map((event, index) => (
          <TimelineEvent 
            key={event.id} 
            event={event} 
            isLast={index === sortedEvents.length - 1} 
          />
        ))}
      </div>
    </div>
  );
};

interface TimelineEventProps {
  event: SubscriptionHistoryEvent;
  isLast: boolean;
}

const TimelineEvent: React.FC<TimelineEventProps> = ({ event, isLast }) => {
  const { icon: Icon, color, bgColor, label } = getEventDisplay(event);
  const date = format(new Date(event.createdAt), 'MMM d, yyyy h:mm a');

  return (
    <div className="flex gap-4">
      {/* Timeline Icon */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {!isLast && (
          <div className="w-0.5 h-full bg-gray-200 mt-2" />
        )}
      </div>
      
      {/* Event Details */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-gray-900">{label}</p>
            {event.fromPlan && event.toPlan && (
              <p className="text-sm text-gray-600 mt-1">
                {formatPlanName(event.fromPlan)} → {formatPlanName(event.toPlan)}
              </p>
            )}
            {event.metadata && renderMetadata(event.metadata)}
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap ml-4">{date}</span>
        </div>
      </div>
    </div>
  );
};

// Helper to get icon and colors based on event type
function getEventDisplay(event: SubscriptionHistoryEvent) {
  const type = event.eventType.toLowerCase();
  
  if (type.includes('created')) {
    return {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      label: 'Subscription Created'
    };
  }
  
  if (type.includes('upgrade')) {
    return {
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      label: 'Plan Upgraded'
    };
  }
  
  if (type.includes('downgrade')) {
    return {
      icon: TrendingDown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      label: event.metadata?.scheduled ? 'Downgrade Scheduled' : 'Plan Downgraded'
    };
  }
  
  if (type.includes('cancel')) {
    return {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      label: 'Subscription Canceled'
    };
  }
  
  if (type.includes('reactivat')) {
    return {
      icon: RefreshCw,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      label: 'Subscription Reactivated'
    };
  }
  
  if (type.includes('payment_failed')) {
    return {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      label: 'Payment Failed'
    };
  }
  
  if (type.includes('payment_success')) {
    return {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      label: 'Payment Successful'
    };
  }
  
  // Default for unknown event types
  return {
    icon: Circle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: formatEventType(type)
  };
}

// Helper to render metadata if present
function renderMetadata(metadata: Record<string, any>) {
  const keys = Object.keys(metadata);
  if (keys.length === 0) return null;
  
  return (
    <div className="mt-2 text-xs text-gray-500">
      {metadata.reason && <p>Reason: {metadata.reason}</p>}
      {metadata.amount && <p>Amount: ${(metadata.amount / 100).toFixed(2)}</p>}
      {metadata.error && (
        <p className="text-red-600">Error: {metadata.error}</p>
      )}
    </div>
  );
}

// Helper to format plan names
function formatPlanName(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// Helper to format event type for display
function formatEventType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
