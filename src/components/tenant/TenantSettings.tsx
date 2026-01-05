import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import { getCurrentUser } from '../../services/api';
import { Modal } from '../ui/Modal';
import api from '../../services/api';

export const TenantSettings: React.FC = () => {
  const { showToast } = useToast();
  const { logout } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Account Information
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

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
      } catch (err: any) {
        showToast(err.message || 'Failed to load user data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [showToast]);

  const handleSaveAccount = async () => {
    setSaving(true);
    try {
      // TODO: Connect to backend API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      showToast('Account information updated', 'success');
    } catch (err: any) {
      showToast('Failed to update account', 'error');
    } finally {
      setSaving(false);
    }
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
    // TODO: Implement Cognito password change flow
    showToast('Password change coming soon', 'info');
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
    } finally {
      setDeleting(false);
    }
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
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (Optional)
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSaveAccount}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
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
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(true)}
                className="w-full mt-3 text-red-600 border-red-300 hover:bg-red-50"
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => !deleting && setShowDeleteModal(false)}
          title="Delete Account"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-red-50">
              <p className="font-semibold text-red-900">
                Warning: This action cannot be undone
              </p>
              <p className="mt-2 text-sm text-red-700">
                Deleting your account will permanently remove:
              </p>
              <ul className="mt-2 ml-4 text-sm text-red-700 list-disc">
                <li>All your tenant memberships and rental agreements</li>
                <li>All payment history and records</li>
                <li>Your saved payment methods</li>
                <li>All account data and settings</li>
              </ul>
            </div>
            
            <p className="text-sm text-gray-600">
              Are you absolutely sure you want to delete your account?
            </p>
            
            <div className="flex gap-3 pt-4">
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
                {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
};
