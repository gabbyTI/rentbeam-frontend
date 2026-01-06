import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { FeeBreakdown } from '../ui/FeeBreakdown';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import api, { getCurrentUser, changePassword, initiateNotificationEmailChange, confirmNotificationEmailChange, getTenantMembership, TenantMembershipDetails } from '../../services/api';
import { calculateProcessingFee, formatCurrency } from '../../utils/stripe';

export const TenantSettings: React.FC = () => {
  const { showToast } = useToast();
  const { logout } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Autopay modals
  const [showRemoveCardModal, setShowRemoveCardModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Tenant membership data for autopay
  const [tenantData, setTenantData] = useState<TenantMembershipDetails | null>(null);

  // Notification email verification flow
  const [verificationStep, setVerificationStep] = useState<'initial' | 'code-sent' | 'verifying'>('initial');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingNotificationEmail, setPendingNotificationEmail] = useState('');

  // Account Information
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [autopayConfirmations, setAutopayConfirmations] = useState(true);
  const [receiptEmails, setReceiptEmails] = useState(true);
  const [latePaymentWarnings, setLatePaymentWarnings] = useState(true);
  const [reminderDays, setReminderDays] = useState('3');

  // Display Preferences
  const [theme, setTheme] = useState('light');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const profile = await getCurrentUser();
        setName(profile.user.name);
        setEmail(profile.user.email);
        setPhone(profile.user.phone || '');
        setNotificationEmail(profile.user.notificationEmail || '');

        // Load tenant membership data for autopay section
        if (profile.memberships.tenants && profile.memberships.tenants.length > 0) {
          const membershipId = profile.memberships.tenants[0].id;
          const membership = await getTenantMembership(membershipId);
          setTenantData(membership);
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load user data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [showToast]);

  const handleSaveAccount = async () => {
    const trimmedEmail = notificationEmail.trim();

    // If clearing notification email (empty), update directly without verification
    if (!trimmedEmail) {
      setSavingAccount(true);
      try {
        await api.patch('/api/auth/profile', {
          notificationEmail: null,
        });
        showToast('Notification email cleared. Notifications will be sent to your login email.', 'success');
        setNotificationEmail('');
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message || 'Failed to clear notification email';
        showToast(errorMsg, 'error');
      } finally {
        setSavingAccount(false);
      }
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showToast('Invalid notification email format', 'error');
      return;
    }

    // Setting/changing to new email requires verification
    setSavingAccount(true);
    try {
      await initiateNotificationEmailChange(trimmedEmail);
      setPendingNotificationEmail(trimmedEmail);
      setVerificationStep('code-sent');
      showToast('Verification code sent to your notification email', 'success');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to send verification code';
      showToast(errorMsg, 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleConfirmVerification = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showToast('Please enter a valid 6-digit code', 'error');
      return;
    }

    setVerificationStep('verifying');
    try {
      await confirmNotificationEmailChange(verificationCode);
      showToast('Notification email verified and updated successfully', 'success');
      setVerificationStep('initial');
      setVerificationCode('');
      setPendingNotificationEmail('');
      
      // Reload user data to get updated notification email
      const profile = await getCurrentUser();
      setNotificationEmail(profile.user.notificationEmail || '');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to verify code';
      showToast(errorMsg, 'error');
      setVerificationStep('code-sent');
    }
  };

  const handleCancelVerification = () => {
    setVerificationStep('initial');
    setVerificationCode('');
    setPendingNotificationEmail('');
    // Reset to the original value loaded from server
    const resetEmail = async () => {
      try {
        const profile = await getCurrentUser();
        setNotificationEmail(profile.user.notificationEmail || '');
      } catch (err) {
        // If fetch fails, just clear it
        setNotificationEmail('');
      }
    };
    resetEmail();
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      // TODO: Connect to backend API
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast('Notification preferences saved', 'success');
    } catch (err: any) {
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDisplay = async () => {
    setSaving(true);
    try {
      // TODO: Connect to backend API
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast('Display preferences saved', 'success');
    } catch (err: any) {
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    if (oldPassword === newPassword) {
      showToast('New password must be different from old password', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      showToast('Password changed successfully! Please login again.', 'success');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Log out for security - invalidates all sessions
      logout();
      navigate('/login');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to change password';
      showToast(errorMsg, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEnableAutopay = async () => {
    if (!consentChecked) {
      showToast('Please agree to the autopay terms', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await api.patch(`/api/tenants/${tenantData!.id}/autopay`, {
        autopayEnabled: true,
      });

      showToast('Autopay enabled successfully!', 'success');
      
      const membershipId = tenantData!.id;
      const membership = await getTenantMembership(membershipId);
      setTenantData(membership);
      setConsentChecked(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to enable autopay', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableAutopay = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/api/tenants/${tenantData!.id}/autopay`, {
        autopayEnabled: false,
      });

      showToast('Autopay disabled', 'success');
      setShowDisableModal(false);
      
      const membershipId = tenantData!.id;
      const membership = await getTenantMembership(membershipId);
      setTenantData(membership);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to disable autopay', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveCard = async () => {
    setActionLoading(true);
    try {
      await api.delete('/api/stripe/payment-method');

      showToast('Payment method removed successfully', 'success');
      setShowRemoveCardModal(false);
      
      const membershipId = tenantData!.id;
      const membership = await getTenantMembership(membershipId);
      setTenantData(membership);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to remove payment method', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getNextChargeDate = () => {
    if (!tenantData) return '';
    const today = new Date();
    const dueDay = tenantData.unit.dueDay;
    let nextCharge = new Date(today.getFullYear(), today.getMonth(), dueDay);
    
    if (today.getDate() >= dueDay) {
      nextCharge = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    }
    
    return nextCharge.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <AppShell title="Settings">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/tenant/dashboard')}
        >
          ← Back to Dashboard
        </Button>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Account Information</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={name}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Login Email
                </label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is your login email and cannot be changed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={phone}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Note:</span> Your name and phone number are managed by your landlord. Please contact them to update this information.
                </p>
              </div>

              <hr className="my-4" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Email (Optional)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="notifications@example.com"
                    disabled={savingAccount || verificationStep !== 'initial'}
                    className="flex-1"
                  />
                  {notificationEmail && verificationStep === 'initial' && (
                    <Button
                      variant="secondary"
                      onClick={() => setNotificationEmail('')}
                      disabled={savingAccount}
                      className="px-4"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {notificationEmail
                    ? 'Receive payment notifications at this email address.'
                    : 'Leave empty to use your login email for all notifications.'}
                </p>
              </div>

              {verificationStep === 'code-sent' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-3">
                    📧 Verification code sent to {pendingNotificationEmail}
                  </p>
                  <Input
                    label="Verification Code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Check your email for the verification code. It expires in 15 minutes.
                  </p>
                </div>
              )}

              {verificationStep === 'initial' ? (
                <Button
                  onClick={handleSaveAccount}
                  disabled={savingAccount}
                  className="w-full"
                >
                  {savingAccount
                    ? (notificationEmail.trim() ? 'Sending Code...' : 'Clearing...')
                    : (notificationEmail.trim() ? 'Save Notification Email' : 'Clear Notification Email')}
                </Button>
              ) : (
                <div className="flex space-x-3">
                  <Button
                    variant="secondary"
                    onClick={handleCancelVerification}
                    disabled={verificationStep === 'verifying'}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmVerification}
                    disabled={verificationStep === 'verifying' || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    {verificationStep === 'verifying' ? 'Verifying...' : 'Verify Code'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Notifications</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive all notifications via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <hr />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payment Reminders</p>
                  <p className="text-sm text-gray-500">Reminder before rent is due</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentReminders}
                    onChange={(e) => setPaymentReminders(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {paymentReminders && (
                <div className="ml-4 flex items-center gap-2">
                  <label className="text-sm text-gray-600">Remind me</label>
                  <select
                    value={reminderDays}
                    onChange={(e) => setReminderDays(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="1">1 day</option>
                    <option value="2">2 days</option>
                    <option value="3">3 days</option>
                    <option value="5">5 days</option>
                    <option value="7">7 days</option>
                  </select>
                  <label className="text-sm text-gray-600">before due date</label>
                </div>
              )}

              <hr />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Autopay Confirmations</p>
                  <p className="text-sm text-gray-500">Confirmation when autopay processes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autopayConfirmations}
                    onChange={(e) => setAutopayConfirmations(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <hr />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payment Receipts</p>
                  <p className="text-sm text-gray-500">Receive email receipts for payments</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiptEmails}
                    onChange={(e) => setReceiptEmails(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <hr />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Late Payment Warnings</p>
                  <p className="text-sm text-gray-500">Alerts when payment is overdue</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={latePaymentWarnings}
                    onChange={(e) => setLatePaymentWarnings(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveNotifications} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display Preferences */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Display Preferences</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg transition-colors ${
                      theme === 'light'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">☀️</span>
                      <span className="font-medium">Light</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">🌙</span>
                      <span className="font-medium">Dark</span>
                    </div>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Dark mode coming soon
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Format
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY (01/05/2026)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (05/01/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-01-05)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveDisplay} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method & Autopay */}
        {tenantData && tenantData.unit.property.acceptOnlinePayments !== false && (
          <>
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Payment Method</h2>
              </CardHeader>
              <CardContent>
                {tenantData.defaultPaymentMethodId ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">💳</span>
                          <div>
                            <p className="font-medium">{tenantData.paymentMethodLabel}</p>
                            <p className="text-sm text-gray-500">Default payment method</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => navigate('/tenant/payment-method')}
                        className="flex-1"
                      >
                        Update Card
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setShowRemoveCardModal(true)}
                        className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Remove Card
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-600 mb-4">
                      No payment method on file. Add a card to enable autopay.
                    </p>
                    <Button onClick={() => navigate('/tenant/payment-method')}>
                      Add Payment Method
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {tenantData.defaultPaymentMethodId && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Autopay Settings</h2>
                </CardHeader>
                <CardContent>
                  {tenantData.autopayEnabled ? (
                    <div className="space-y-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium text-green-900">Autopay Active</span>
                        </div>
                        <p className="text-sm text-green-800">
                          Your rent will be automatically charged on the {tenantData.unit.dueDay}
                          {tenantData.unit.dueDay === 1 ? 'st' : tenantData.unit.dueDay === 2 ? 'nd' : tenantData.unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-medium mb-3">Next Scheduled Charge</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-sm text-gray-600">Date</span>
                            <span className="font-medium">{getNextChargeDate()}</span>
                          </div>
                          <FeeBreakdown rentAmount={Number(tenantData.unit.rentAmount)} />
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        onClick={() => setShowDisableModal(true)}
                        className="w-full"
                      >
                        Disable Autopay
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="font-medium text-gray-900">Autopay Inactive</span>
                        </div>
                        <p className="text-sm text-gray-700">
                          Enable autopay to automatically charge your card on the {tenantData.unit.dueDay}
                          {tenantData.unit.dueDay === 1 ? 'st' : tenantData.unit.dueDay === 2 ? 'nd' : tenantData.unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-medium mb-3">Your Monthly Charge</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <FeeBreakdown rentAmount={Number(tenantData.unit.rentAmount)} />
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={consentChecked}
                            onChange={(e) => setConsentChecked(e.target.checked)}
                            className="mt-1"
                          />
                          <span className="text-sm text-gray-700">
                            I authorize RentTrack to automatically charge my payment method for 
                            {' '}{formatCurrency(calculateProcessingFee(Number(tenantData.unit.rentAmount)).totalAmount)} on the {tenantData.unit.dueDay}
                            {tenantData.unit.dueDay === 1 ? 'st' : tenantData.unit.dueDay === 2 ? 'nd' : tenantData.unit.dueDay === 3 ? 'rd' : 'th'} of each month.
                            I understand I can disable autopay at any time.
                          </span>
                        </label>
                      </div>

                      <Button
                        onClick={handleEnableAutopay}
                        disabled={!consentChecked || actionLoading}
                        className="w-full"
                      >
                        {actionLoading ? 'Enabling...' : 'Enable Autopay'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Security */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Security</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Password</p>
                  <p className="text-sm text-gray-500">••••••••</p>
                </div>
                <Button variant="secondary" onClick={handleChangePassword}>
                  Change Password
                </Button>
              </div>

              <hr />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-500">Add an extra layer of security</p>
                </div>
                <Button variant="secondary" onClick={() => showToast('Coming soon', 'info')}>
                  Enable 2FA
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Help & Support</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-medium">Help Center</span>
                <span className="text-gray-400">→</span>
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-medium">Contact Support</span>
                <span className="text-gray-400">→</span>
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-medium">Terms of Service</span>
                <span className="text-gray-400">→</span>
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between">
                <span className="font-medium">Privacy Policy</span>
                <span className="text-gray-400">→</span>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500 text-center mb-4">
                RentTrack Lite v1.0.0
              </p>
              <Button
                variant="secondary"
                onClick={handleLogout}
                className="w-full text-red-600 border-red-300 hover:bg-red-50"
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>


      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Change Password</h2>
              <button
                onClick={() => !changingPassword && setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={changingPassword}
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={changingPassword}
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  New Password
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={changingPassword}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters
                </p>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={changingPassword}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={changingPassword}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePasswordSubmit}
                  disabled={changingPassword}
                  className="flex-1"
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Card Modal */}
      <Modal
        isOpen={showRemoveCardModal}
        onClose={() => setShowRemoveCardModal(false)}
        title="Remove Payment Method"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to remove your payment method? This will also disable autopay.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-900">
              You'll need to add a new payment method to pay rent online or enable autopay again.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowRemoveCardModal(false)}
              disabled={actionLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveCard}
              disabled={actionLoading}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? 'Removing...' : 'Remove Card'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Disable Autopay Modal */}
      <Modal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        title="Disable Autopay"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to disable autopay? You'll need to manually pay your rent each month.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              Your payment method will remain saved for one-time payments.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDisableModal(false)}
              disabled={actionLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisableAutopay}
              disabled={actionLoading}
              className="flex-1"
            >
              {actionLoading ? 'Disabling...' : 'Disable Autopay'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
};
