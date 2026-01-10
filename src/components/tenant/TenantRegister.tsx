import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { useToast } from '../../context/ToastContext';
import { acceptInvite, fetchInviteDetails, InviteDetails } from '../../services/api';

export const TenantRegister: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [inviteData, setInviteData] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        showToast('Invalid invite link', 'error');
        navigate('/login');
        return;
      }

      try {
        const data = await fetchInviteDetails(token);
        setInviteData(data);
      } catch (err: any) {
        showToast(err.message || 'Failed to load invite details', 'error');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token, navigate, showToast]);

  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    const passwordError = validatePassword(formData.password);
    const confirmError = formData.password !== formData.confirmPassword
      ? 'Passwords do not match'
      : '';

    setErrors({
      password: passwordError,
      confirmPassword: confirmError,
    });

    if (passwordError || confirmError) {
      return;
    }

    if (!token) {
      showToast('Invalid invite token', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const result = await acceptInvite(token, {
        password: formData.password,
      });

      if (result.tokens) {
        // User was created and logged in automatically
        showToast('Account created and invite accepted! Welcome!');
        // Store tokens and redirect
        // Note: You may want to handle token storage here
        window.location.href = '/';
      } else {
        // Existing user case
        showToast('Registration complete! Please login with your credentials.');
        navigate('/login');
      }
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inviteData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">RentBeam</h1>
          <p className="mt-2 text-gray-600">Complete your profile</p>
        </div>

        <Card>
          <CardContent className="py-6">
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-600">
                Welcome, <span className="font-semibold">{inviteData.name}</span>
              </p>
              <p className="text-xs text-gray-500">{inviteData.email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) {
                    setErrors({ ...errors, password: validatePassword(e.target.value) });
                  }
                }}
                placeholder="Enter your password"
                required
                error={errors.password}
              />

              <Input
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  if (errors.confirmPassword) {
                    setErrors({
                      ...errors,
                      confirmPassword: formData.password !== e.target.value
                        ? 'Passwords do not match'
                        : ''
                    });
                  }
                }}
                placeholder="Confirm your password"
                required
                error={errors.confirmPassword}
              />

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creating Account...' : 'Complete Registration'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
