'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

interface AdminStats {
  totalUsers: number;
  activeClasses: number;
  activeSubscriptions: number;
  thisWeeksClasses: number;
  monthlyRevenue: number;
}

interface TenantData {
  _id: string;
  schoolName: string;
  slug: string;
  stats: AdminStats;
}

interface UserData {
  _id: string;
  role: string;
  tenant: {
    _id: string;
    schoolName: string;
    slug: string;
  };
}

export default function SimpleAdminPage() {
  const params = useParams();
  const tenantSlug = params.slug as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user data
        const userResponse = await fetch('/api/auth/user');
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data');
        }
        const user = await userResponse.json();
        setUserData(user);

        // Verify user belongs to this tenant and has admin role
        if (user.tenant?.slug !== tenantSlug) {
          throw new Error('Access denied: You do not belong to this tenant');
        }
        
        if (user.role !== 'admin') {
          throw new Error('Access denied: Admin role required');
        }

        // Fetch tenant data
        const tenantResponse = await fetch(`/api/tenants/${tenantSlug}`);
        if (!tenantResponse.ok) {
          throw new Error('Failed to fetch tenant data');
        }
        const tenant = await tenantResponse.json();
        setTenantData(tenant);

      } catch (err) {
        console.error('Admin page error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Admin Dashboard - {tenantData?.schoolName}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Admin User
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          <p className="text-gray-600 mt-1">
            Multi-tenant system is working! You have access to {tenantData?.schoolName}
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{tenantData?.stats?.totalUsers || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Classes</p>
                <p className="text-2xl font-semibold text-gray-900">{tenantData?.stats?.activeClasses || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
                <p className="text-2xl font-semibold text-gray-900">{tenantData?.stats?.activeSubscriptions || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-2">
            <p><strong>Tenant:</strong> {tenantData?.schoolName} ({tenantData?.slug})</p>
            <p><strong>User Role:</strong> {userData?.role}</p>
            <p><strong>User Tenant:</strong> {userData?.tenant?.slug}</p>
            <p><strong>Access Status:</strong> <span className="text-green-600 font-semibold">✓ Authorized</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
