import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent } from './ui/Card';
import { resendVerification, confirmEmail } from '../services/api';
import { useToast } from '../context/ToastContext';

export const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');

  const email = (location.state as any)?.email || '';

  const handleResend = async () => {
    if (!email) {
      showToast('Email not found', 'error');
      return;
    }

    setResending(true);

    try {
      await resendVerification(email);
      showToast('Verification code sent!');
    } catch (error: any) {
      showToast(error.message || 'Failed to resend code', 'error');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || !email) {
      showToast('Please enter the verification code', 'error');
      return;
    }

    setVerifying(true);

    try {
      await confirmEmail(email, code);
      showToast('Email verified successfully!');
      navigate('/login');
    } catch (error: any) {
      showToast(error.message || 'Invalid verification code', 'error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">
            RentTrack Lite
          </h1>
        </div>

        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <svg
                  className="h-8 w-8 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900">
                Verify Your Email
              </h2>

              <div className="space-y-2">
                <p className="text-gray-600">
                  We sent a verification code to:
                </p>
                <p className="font-medium text-gray-900">
                  {email || 'your email address'}
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4 pt-4">
                <Input
                  type="text"
                  placeholder="Enter verification code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />

                <Button
                  type="submit"
                  disabled={verifying || !code || !email}
                  className="w-full"
                >
                  {verifying ? 'Verifying...' : 'Verify Email'}
                </Button>
              </form>

              <div className="pt-2 space-y-3">
                <Button
                  variant="secondary"
                  onClick={handleResend}
                  disabled={resending || !email}
                  className="w-full"
                >
                  {resending ? 'Sending...' : "Didn't receive it? Resend Code"}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
