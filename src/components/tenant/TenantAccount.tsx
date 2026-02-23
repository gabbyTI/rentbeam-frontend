import React, { useState, useEffect } from 'react';
import { AppShell } from '../ui/AppShell';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { getTenantMembership, TenantMembershipDetails } from '../../services/api';
import { TenantDocuments } from '../landlord/TenantDocuments';
import { formatCurrency } from '../../utils/helpers';

export const TenantAccount: React.FC = () => {
    const { showToast } = useToast();
    const { currentUser } = useApp();
    const navigate = useNavigate();

    const [tenantData, setTenantData] = useState<TenantMembershipDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                if (!currentUser || currentUser.role !== 'tenant') {
                    navigate('/login');
                    return;
                }
                const membership = await getTenantMembership(currentUser.id);
                setTenantData(membership);
            } catch (err: any) {
                showToast(err.message || 'Failed to load tenancy data', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser, navigate, showToast]);

    if (loading) {
        return (
            <AppShell title="My Tenancy">
                <div className="text-center py-12">
                    <p className="text-gray-500">Loading...</p>
                </div>
            </AppShell>
        );
    }

    if (!tenantData) {
        return (
            <AppShell title="My Tenancy">
                <div className="text-center py-12">
                    <p className="text-gray-500">Could not load tenancy data.</p>
                </div>
            </AppShell>
        );
    }

    const m = tenantData as any; // membership has the new fields added server-side

    const hasLeaseDetails = m.leaseType || m.leaseStartDate || m.leaseEndDate || m.rentDeposit != null;
    const hasProfileDetails = !!m.emergencyContactName;

    return (
        <AppShell title="My Tenancy">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Unit summary */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">{tenantData.unit.property.name}</h2>
                    <p className="text-sm text-gray-500">
                        Unit {tenantData.unit.name}
                        {tenantData.unit.property.address ? ` · ${tenantData.unit.property.address}` : ''}
                    </p>
                </div>

                {/* Lease Details */}
                <Card>
                    <CardHeader>
                        <h3 className="text-base font-semibold">Lease Details</h3>
                    </CardHeader>
                    <CardContent>
                        <dl className="space-y-3">
                            {/* Move-in always shown */}
                            <div className="flex justify-between text-sm">
                                <dt className="text-gray-500">Move-in Date</dt>
                                <dd className="font-medium text-gray-900">{new Date(tenantData.moveInDate).toLocaleDateString()}</dd>
                            </div>

                            {m.leaseType && (
                                <div className="flex justify-between text-sm">
                                    <dt className="text-gray-500">Lease Type</dt>
                                    <dd className="font-medium text-gray-900">
                                        {m.leaseType === 'FIXED_TERM' ? 'Fixed Term' : 'Month-to-Month'}
                                    </dd>
                                </div>
                            )}

                            {m.leaseStartDate && (
                                <div className="flex justify-between text-sm">
                                    <dt className="text-gray-500">Lease Start</dt>
                                    <dd className="font-medium text-gray-900">{new Date(m.leaseStartDate).toLocaleDateString()}</dd>
                                </div>
                            )}

                            {m.leaseEndDate && (
                                <div className="flex justify-between text-sm">
                                    <dt className="text-gray-500">Lease End</dt>
                                    <dd className="font-medium text-gray-900">{new Date(m.leaseEndDate).toLocaleDateString()}</dd>
                                </div>
                            )}

                            {m.rentDeposit != null && (
                                <div className="flex justify-between text-sm">
                                    <dt className="text-gray-500">Security Deposit</dt>
                                    <dd className="font-medium text-gray-900">{formatCurrency(m.rentDeposit)}</dd>
                                </div>
                            )}

                            {!hasLeaseDetails && (
                                <p className="text-sm text-gray-400">No lease details on file.</p>
                            )}
                        </dl>
                    </CardContent>
                </Card>

                {/* Emergency Contact & Notes (only if set) */}
                {hasProfileDetails && (
                    <Card>
                        <CardHeader>
                            <h3 className="text-base font-semibold">Additional Info</h3>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-3">
                                {m.emergencyContactName && (
                                    <div className="text-sm">
                                        <dt className="text-gray-500 mb-0.5">Emergency Contact</dt>
                                        <dd className="font-medium text-gray-900">{m.emergencyContactName}</dd>
                                        {m.emergencyContactPhone && (
                                            <dd className="text-gray-600">{m.emergencyContactPhone}</dd>
                                        )}
                                    </div>
                                )}
                            </dl>
                        </CardContent>
                    </Card>
                )}

                {/* Documents */}
                <Card>
                    <CardHeader>
                        <h3 className="text-base font-semibold">Documents</h3>
                    </CardHeader>
                    <CardContent>
                        <TenantDocuments
                            tenantMembershipId={tenantData.id}
                            isLandlord={false}
                        />
                    </CardContent>
                </Card>

            </div>
        </AppShell>
    );
};
