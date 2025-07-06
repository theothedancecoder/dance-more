'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import AdminDashboard from '@/components/AdminDashboard';

interface TenantData {
  _id: string;
  schoolName: string;
  slug: { current: string };
  status: string;
  contactEmail: string;
  contactPhone?: string;
  description?: string;
}

interface UserData {
  _id: string;
  role: string;
  tenant: {
    _id: string;
    slug: { current: string };
  };
}

export default function TenantAdminPage() {
  const params = useParams();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeClasses: 0,
    activeSubscriptions: 0,
    thisWeeksClasses: 0,
    monthlyRevenue: 0,
    systemStatus: 'Healthy'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantSlug = params.slug as string;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;

    const fetchTenantAndUser = async () => {
      try {
        // Fetch tenant data
        const tenantResponse = await fetch(`/api/tenants/${tenantSlug}`);
        if (!tenantResponse.ok) {
          throw new Error('Tenant not found');
        }
        const tenantData = await tenantResponse.json();
        setTenant(tenantData);

        // Fetch user data to verify admin access
        const userResponse = await fetch('/api/auth/user');
        if (!userResponse.ok) {
          throw new Error('User not found');
        }
        const userData = await userResponse.json();
        
        // Verify user belongs to this tenant and has admin role
        if (userData.tenant?.slug !== tenantSlug) {
          throw new Error('Access denied: You do not belong to this tenant');
        }
        
        if (userData.role !== 'admin') {
          throw new Error('Access denied: Admin role required');
        }
        
        setUser(userData);

        // Fetch stats data
        const [usersResponse, classesResponse, bookingsResponse] = await Promise.all([
          fetch('/api/admin/stats/users', {
            headers: { 'x-tenant-slug': tenantSlug },
          }),
          fetch('/api/admin/stats/classes', {
            headers: { 'x-tenant-slug': tenantSlug },
          }),
          fetch('/api/admin/stats/bookings', {
            headers: { 'x-tenant-slug': tenantSlug },
          }),
        ]);

        const usersData = usersResponse.ok ? await usersResponse.json() : { totalUsers: 0 };
        const classesData = classesResponse.ok ? await classesResponse.json() : { totalClasses: 0 };
        const bookingsData = bookingsResponse.ok ? await bookingsResponse.json() : { totalBookings: 0, totalRevenue: 0 };

        setStats({
          totalUsers: usersData.totalUsers || 0,
          activeClasses: classesData.totalClasses || 0,
          activeSubscriptions: 0, // This would need a separate API
          thisWeeksClasses: bookingsData.totalBookings || 0,
          monthlyRevenue: bookingsData.totalRevenue || 0,
          systemStatus: 'Healthy'
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTenantAndUser();
  }, [isLoaded, isSignedIn, userId, tenantSlug]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please sign in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a 
            href="/register-school" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Register a new school
          </a>
        </div>
      </div>
    );
  }

  if (!tenant || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tenant Not Found</h1>
          <p className="text-gray-600">The requested dance school could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tenant.schoolName}</h1>
              <p className="text-sm text-gray-500">Admin Dashboard</p>
            </div>
            <div className="text-sm text-gray-500">
              /{tenantSlug}/admin
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboard 
          stats={stats}
          user={{
            fullName: user.firstName || 'Admin User',
            firstName: user.firstName || 'Admin'
          }}
        />
      </div>
    </div>
  );
}
