import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import { getCurrentUser, getStripeConnectStatus } from '../../services/api';
import api, { changePassword } from '../../services/api';

export const LandlordSettings: React.FC = () => {
  const { showToast } = useToast();
  const { logout } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Separate loading states for each section
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Account Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('CA');
  const [email, setEmail] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [useBusinessName, setUseBusinessName] = useState(false);
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');

  // Payment Account Status
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState('');

  // Payment Settings
  const [gracePeriodDays, setGracePeriodDays] = useState('5');
  const [defaultDueDay, setDefaultDueDay] = useState('1');

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [paymentReceived, setPaymentReceived] = useState(true);
  const [paymentFailed, setPaymentFailed] = useState(true);
  const [newTenant, setNewTenant] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const profile = await getCurrentUser();
        setFirstName(profile.user.firstName || '');
        setLastName(profile.user.lastName || '');
        setCountry(profile.user.country || 'CA');
        setEmail(profile.user.email);
        setNotificationEmail(profile.user.notificationEmail || '');
        setPhone(profile.user.phone || '');
        setBusinessName(profile.user.businessName || '');
        setTaxId(profile.user.taxId || '');

        // Load landlord preferences if available
        if (profile.memberships?.landlord) {
          setDefaultDueDay(profile.memberships.landlord.defaultDueDay?.toString() || '1');
          setGracePeriodDays(profile.memberships.landlord.defaultGracePeriodDays?.toString() || '5');
          setUseBusinessName(profile.memberships.landlord.useBusinessName || false);
        }

        // Load Stripe status
        try {
          const stripeStatus = await getStripeConnectStatus();
          setStripeConnected(stripeStatus.connected);
          setStripeAccountId(stripeStatus.accountId || '');
        } catch (err) {
          // Stripe not connected
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
    setSavingAccount(true);
    try {
      // Save profile info
      await api.patch('/api/auth/profile', {
        firstName,
        lastName,
        country,
        notificationEmail: notificationEmail || null,
        phone: phone || null,
        businessName: businessName || null,
        taxId: taxId || null,
      });

      // Save useBusinessName preference
      await api.patch('/api/landlord/preferences', {
        useBusinessName,
      });

      showToast('Account information updated', 'success');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update account';
      showToast(errorMsg, 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSavePaymentSettings = async () => {
    setSavingPayment(true);
    try {
      await api.patch('/api/landlord/preferences', {
        defaultDueDay: parseInt(defaultDueDay),
        defaultGracePeriodDays: parseInt(gracePeriodDays),
      });
      showToast('Payment settings saved', 'success');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to save settings';
      showToast(errorMsg, 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      // TODO: Connect to backend API
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast('Notification preferences saved', 'success');
    } catch (err: any) {
      showToast('Failed to save preferences', 'error');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleConnectStripe = () => {
    navigate('/landlord/complete-setup');
  };

  const handleManageStripe = async () => {
    try {
      const response = await api.post('/api/stripe/connect/dashboard');
      window.open(response.data.url, '_blank');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to open Stripe dashboard';
      showToast(errorMsg, 'error');
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/api/auth/account');
      showToast('Account deleted successfully', 'success');
      logout();
      navigate('/login');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to delete account';
      showToast(errorMsg, 'error');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Settings">
        <div className="py-12 text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/landlord/dashboard')}
        >
          <span className="hidden sm:inline">← Back to Dashboard</span>
          <span className="sm:hidden">← Back</span>
        </Button>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-semibold">Account Information</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-xs sm:text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-xs sm:text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-xs sm:text-sm font-medium text-gray-700">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="CA">Canada</option>
                  <option value="US">United States</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-xs sm:text-sm font-medium text-gray-700">
                    Business Name (Optional)
                  </label>
                  <Input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="ABC Property Management"
                  />
                </div>

                <div className="flex items-center h-full pt-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useBusinessName}
                      onChange={(e) => setUseBusinessName(e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-xs sm:text-sm text-gray-700">
                      Show business name to tenants
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-xs sm:text-sm font-medium text-gray-700">
                  Login Email
                </label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This is your login email and cannot be changed.
                </p>
              </div>

              <div>
                <label className="block mb-1 text-xs sm:text-sm font-medium text-gray-700">
                  Notification Email (Optional)
                </label>
                <Input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="notifications@example.com"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Receive payment notifications and updates at a different email address.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-xs sm:text-sm font-medium text-gray-700">
                    Phone Number (Optional)
                  </label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-xs sm:text-sm font-medium text-gray-700">
                    Tax ID (Optional)
                  </label>
                  <Input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="XX-XXXXXXX"
                  />
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <Button onClick={handleSaveAccount} disabled={savingAccount}>
                  <span className="hidden sm:inline">{savingAccount ? 'Saving...' : 'Save Changes'}</span>
                  <span className="sm:hidden">{savingAccount ? 'Saving...' : 'Save'}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Account */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-semibold">Payment Processing</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm sm:text-base font-medium">Payment Account</p>
                    {stripeConnected ? (
                      <Badge variant="accepted">Connected</Badge>
                    ) : (
                      <Badge variant="pending">Not Connected</Badge>
                    )}
                  </div>
                  {stripeConnected ? (
                    <div>
                      <p className="mb-1 text-xs sm:text-sm text-gray-600">
                        Your bank account is connected and ready to receive payments.
                      </p>
                      <p className="text-xs text-gray-500 break-all">
                        Account ID: {stripeAccountId}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-600">
                      Connect your bank account to accept tenant payments and receive payouts.
                    </p>
                  )}
                </div>
                {stripeConnected ? (
                  <Button variant="secondary" size="sm" onClick={handleManageStripe}>
                    <span className="hidden sm:inline">Banking & Payouts</span>
                    <span className="sm:hidden">Manage</span>
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleConnectStripe}>
                    Connect
                  </Button>
                )}
              </div>

              {stripeConnected && (
                <>
                  <hr />
                  <div className="p-3 sm:p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <h4 className="mb-2 text-sm sm:text-base font-medium text-blue-900">Payment Information</h4>
                    <ul className="space-y-1 text-xs sm:text-sm text-blue-800">
                      <li>• Processing Fees: Vary by payment method (passed to tenant)</li>
                      <li>• Payout Schedule: Daily automatic</li>
                      <li>• Standard payout timing: 2 business days</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-semibold">Default Payment Settings</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm text-gray-600">
                These defaults will be applied when creating new properties and units.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Default Due Day
                  </label>
                  <select
                    value={defaultDueDay}
                    onChange={(e) => setDefaultDueDay(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        Day {day} of each month
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Default Grace Period
                  </label>
                  <select
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="0">No grace period</option>
                    <option value="3">3 days</option>
                    <option value="5">5 days</option>
                    <option value="7">7 days</option>
                    <option value="10">10 days</option>
                  </select>
                </div>
              </div>

              <div className="p-3 sm:p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-xs sm:text-sm text-gray-700">
                  <strong>Note:</strong> These settings can be customized for individual units when creating or editing them.
                </p>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <Button onClick={handleSavePaymentSettings} disabled={savingPayment}>
                  <span className="hidden sm:inline">{savingPayment ? 'Saving...' : 'Save Settings'}</span>
                  <span className="sm:hidden">{savingPayment ? 'Saving...' : 'Save'}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-semibold">Notifications</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium">Email Notifications</p>
                  <p className="text-xs sm:text-sm text-gray-500">Receive all notifications via email</p>
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

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium">Payment Received</p>
                  <p className="text-xs sm:text-sm text-gray-500">Notify when tenants make payments</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={paymentReceived}
                    onChange={(e) => setPaymentReceived(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <hr />

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium">Payment Failed</p>
                  <p className="text-xs sm:text-sm text-gray-500">Alert when autopay fails</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={paymentFailed}
                    onChange={(e) => setPaymentFailed(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <hr />

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium">New Tenant</p>
                  <p className="text-xs sm:text-sm text-gray-500">Notify when new tenant accepts invite</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={newTenant}
                    onChange={(e) => setNewTenant(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <hr />

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium">Monthly Reports</p>
                  <p className="text-xs sm:text-sm text-gray-500">Receive monthly payment summaries</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={monthlyReports}
                    onChange={(e) => setMonthlyReports(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-4">
                <Button onClick={handleSaveNotifications} disabled={savingNotifications}>
                  <span className="hidden sm:inline">{savingNotifications ? 'Saving...' : 'Save Preferences'}</span>
                  <span className="sm:hidden">{savingNotifications ? 'Saving...' : 'Save'}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-semibold">Security</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 sm:justify-between">
                <div>
                  <p className="text-sm sm:text-base font-medium">Password</p>
                  <p className="text-xs sm:text-sm text-gray-500">••••••••</p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleChangePassword}>
                  <span className="hidden sm:inline">Change Password</span>
                  <span className="sm:hidden">Change</span>
                </Button>
              </div>

              <hr />

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 sm:justify-between">
                <div>
                  <p className="text-sm sm:text-base font-medium">Two-Factor Authentication</p>
                  <p className="text-xs sm:text-sm text-gray-500">Add an extra layer of security</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => showToast('Coming soon', 'info')}>
                  Enable
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-semibold">Help & Support</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              <button className="flex items-center justify-between w-full px-3 sm:px-4 py-2 sm:py-3 text-left transition-colors rounded-lg hover:bg-gray-50">
                <span className="text-sm sm:text-base font-medium">Help Center</span>
                <span className="text-gray-400">→</span>
              </button>
              <button className="flex items-center justify-between w-full px-3 sm:px-4 py-2 sm:py-3 text-left transition-colors rounded-lg hover:bg-gray-50">
                <span className="text-sm sm:text-base font-medium">Contact Support</span>
                <span className="text-gray-400">→</span>
              </button>
              <button className="flex items-center justify-between w-full px-3 sm:px-4 py-2 sm:py-3 text-left transition-colors rounded-lg hover:bg-gray-50">
                <span className="text-sm sm:text-base font-medium">Terms of Service</span>
                <span className="text-gray-400">→</span>
              </button>
              <button className="flex items-center justify-between w-full px-3 sm:px-4 py-2 sm:py-3 text-left transition-colors rounded-lg hover:bg-gray-50">
                <span className="text-sm sm:text-base font-medium">Privacy Policy</span>
                <span className="text-gray-400">→</span>
              </button>
            </div>

            <div className="pt-4 sm:pt-6 mt-4 sm:mt-6 border-t">
              <p className="mb-3 sm:mb-4 text-xs sm:text-sm text-center text-gray-500">
                RentBeam v1.0.0
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                className="w-full text-red-600 border-red-300 hover:bg-red-50"
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-semibold text-red-600">Danger Zone</h2>
          </CardHeader>
          <CardContent>
            <div className="p-3 sm:p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 sm:justify-between">
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium text-red-900">Delete Account</p>
                  <p className="mt-1 text-xs sm:text-sm text-red-700">
                    Permanently delete your account and all associated data including properties, units, tenants, and payment history. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-600 border-red-300 hover:bg-red-100 w-full sm:w-auto"
                >
                  <span className="hidden sm:inline">Delete Account</span>
                  <span className="sm:hidden">Delete</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md p-4 sm:p-6 bg-white rounded-lg shadow-xl">
            <h3 className="text-base sm:text-lg font-semibold text-red-600">Delete Account?</h3>
            <p className="mt-2 text-xs sm:text-sm text-gray-600">
              Are you absolutely sure? This will permanently delete:
            </p>
            <ul className="mt-3 ml-5 space-y-1 text-xs sm:text-sm text-gray-700 list-disc">
              <li>Your account and profile</li>
              <li>All properties and units</li>
              <li>All tenant memberships and invites</li>
              <li>All payment history</li>
              <li>Your payment account (payouts will be paused)</li>
            </ul>
            <p className="mt-3 text-xs sm:text-sm font-medium text-red-600">
              This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h2 className="text-lg sm:text-xl font-semibold">Change Password</h2>
              <button
                onClick={() => !changingPassword && setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={changingPassword}
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block mb-1 text-xs sm:text-sm font-medium text-gray-700">
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
                <label className="block mb-1 text-xs sm:text-sm font-medium text-gray-700">
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
                <label className="block mb-1 text-xs sm:text-sm font-medium text-gray-700">
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

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
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
    </AppShell>
  );
};
