import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { SubscriptionPlan, CurrentSubscription } from '../../types';

interface CancelConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  subscription: CurrentSubscription;
  isLoading?: boolean;
}

export const CancelConfirmationModal: React.FC<CancelConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  subscription,
  isLoading = false
}) => {
  const endDate = subscription.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : 'the end of your billing period';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel Subscription">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Are you sure you want to cancel?
            </h3>
            <p className="text-gray-600">
              Your subscription will remain active until {endDate}. After that, you'll be moved to the Free plan.
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h4 className="font-medium text-yellow-900 mb-2">What you'll lose:</h4>
          <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
            <li>Access to {subscription.unitLimit} units (will be limited to 3)</li>
            <li>Online rent collection</li>
            <li>Automated payment reminders</li>
            <li>Advanced reporting features</li>
          </ul>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Keep Subscription
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Canceling...' : 'Yes, Cancel Subscription'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface DowngradeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan: SubscriptionPlan;
  targetPlan: SubscriptionPlan;
  currentUnitCount: number;
  targetUnitLimit: number;
  isLoading?: boolean;
}

export const DowngradeConfirmationModal: React.FC<DowngradeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  targetPlan,
  currentUnitCount,
  targetUnitLimit,
  isLoading = false
}) => {
  const willExceedLimit = currentUnitCount > targetUnitLimit;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Downgrade">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Downgrade to {formatPlanName(targetPlan)}?
            </h3>
            <p className="text-gray-600">
              Your plan will be downgraded at the end of your current billing period.
              You won't be charged for the new plan until then.
            </p>
          </div>
        </div>

        {willExceedLimit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Unit Limit Warning
            </h4>
            <p className="text-sm text-red-800">
              You currently have <strong>{currentUnitCount} units</strong>, but the {formatPlanName(targetPlan)} plan 
              only allows <strong>{targetUnitLimit} units</strong>. You'll need to remove{' '}
              <strong>{currentUnitCount - targetUnitLimit} unit{currentUnitCount - targetUnitLimit > 1 ? 's' : ''}</strong>{' '}
              before the downgrade takes effect.
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="font-medium text-blue-900 mb-2">Plan Changes:</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Unit limit: {targetUnitLimit} (currently {currentUnitCount} used)</p>
            <p>• Features will be limited to {formatPlanName(targetPlan)} tier</p>
            <p>• Change takes effect at end of billing period</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Confirm Downgrade'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface ReactivateConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  subscription: CurrentSubscription;
  isLoading?: boolean;
}

export const ReactivateConfirmationModal: React.FC<ReactivateConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  subscription,
  isLoading = false
}) => {
  const renewalDate = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : 'your next billing date';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reactivate Subscription">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Reactivate your subscription?
            </h3>
            <p className="text-gray-600">
              Your {subscription.planName} subscription will continue and automatically renew on {renewalDate}.
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <h4 className="font-medium text-green-900 mb-2">What you'll keep:</h4>
          <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
            <li>Access to {subscription.unitLimit} units</li>
            <li>Online rent collection</li>
            <li>Automated payment reminders</li>
            <li>All premium features</li>
          </ul>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Reactivating...' : 'Yes, Keep My Subscription'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Helper function
function formatPlanName(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}
