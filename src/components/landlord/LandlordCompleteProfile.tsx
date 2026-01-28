import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { updateProfile, getStripeConnectStatus } from '../../services/api';
import { authService } from '../../services/auth';
import { useToast } from '../../context/ToastContext';

export const LandlordCompleteProfile: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(true);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        country: 'CA',
        businessName: '',
        phone: '',
    });

    // Check if profile is already complete and redirect
    useEffect(() => {
        const checkProfileStatus = async () => {
            const isComplete = authService.getProfileComplete();
            if (isComplete) {
                // Profile already complete, redirect to appropriate page
                try {
                    const stripeStatus = await getStripeConnectStatus();
                    if (stripeStatus.onboarded) {
                        navigate('/landlord/dashboard');
                    } else {
                        navigate('/landlord/complete-setup');
                    }
                } catch {
                    navigate('/landlord/complete-setup');
                }
            } else {
                setCheckingProfile(false);
            }
        };
        checkProfileStatus();
    }, [navigate]);

    if (checkingProfile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.firstName || !formData.lastName || !formData.country) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        setLoading(true);

        try {
            await updateProfile({
                firstName: formData.firstName,
                lastName: formData.lastName,
                country: formData.country,
                businessName: formData.businessName || null,
                phone: formData.phone || null,
            });

            // Mark profile as complete
            authService.setProfileComplete(true);

            showToast('Profile completed successfully!');
            navigate('/landlord/complete-setup');
        } catch (error: any) {
            showToast(error.message || 'Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-primary-600 mb-2">
                        RentBeam
                    </h1>
                    <p className="text-gray-600">Complete your profile</p>
                </div>

                <Card>
                    <CardContent className="py-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="First Name"
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, firstName: e.target.value })
                                    }
                                    placeholder="John"
                                    required
                                />

                                <Input
                                    label="Last Name"
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, lastName: e.target.value })
                                    }
                                    placeholder="Doe"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Country <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.country}
                                    onChange={(e) =>
                                        setFormData({ ...formData, country: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                >
                                    <option value="CA">Canada</option>
                                    <option value="US">United States</option>
                                </select>
                            </div>

                            <Input
                                label="Business Name"
                                type="text"
                                value={formData.businessName}
                                onChange={(e) =>
                                    setFormData({ ...formData, businessName: e.target.value })
                                }
                                placeholder="ABC Property Management (optional)"
                            />

                            <Input
                                label="Phone Number"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                }
                                placeholder="+1 (555) 123-4567 (optional)"
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Continue'}
                            </Button>

                            <p className="text-xs text-gray-500 text-center">
                                This information helps us set up your account and is required for payment processing.
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
