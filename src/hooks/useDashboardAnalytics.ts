import { useState, useEffect } from 'react';
import { DashboardAnalytics } from '../types';
import api from '../services/api';

export const useDashboardAnalytics = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/api/landlord/dashboard/analytics');
        setAnalytics(response.data);
      } catch (err: any) {
        console.error('Failed to fetch dashboard analytics:', err);
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return { analytics, loading, error };
};
