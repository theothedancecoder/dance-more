'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';

interface TenantData {
  _id: string;
  schoolName: string;
  slug: string;
  description?: string;
  logo?: {
    asset?: {
      url: string;
    };
  };
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
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

export default function AdminLandingPage() {
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
        console.error('Admin landing page error:', err);
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

  const primaryColor = tenantData?.branding?.primaryColor || '#3B82F6';
  const secondaryColor = tenantData?.branding?.secondaryColor || primaryColor;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              {tenantData?.logo && (
                <Image
                  src={tenantData.logo.asset?.url || '/placeholder-logo.png'}
                  alt={`${tenantData.schoolName} logo`}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              )}
              <h1 className="text-xl font-semibold text-gray-900">
                {tenantData?.schoolName} - Admin Portal
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

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* School Logo */}
          {tenantData?.logo && (
            <div className="mb-8">
              <Image
                src={tenantData.logo.asset?.url || '/placeholder-logo.png'}
                alt={`${tenantData.schoolName} logo`}
                width={120}
                height={120}
                className="mx-auto rounded-2xl shadow-lg"
              />
            </div>
          )}

          {/* School Name */}
          <h1 
            className="text-4xl sm:text-5xl font-bold mb-6"
            style={{ color: primaryColor }}
          >
            {tenantData?.schoolName}
          </h1>

          {/* Description */}
          {tenantData?.description && (
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
              {tenantData.description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Visit School Portal Button */}
            <Link
              href={`/${tenantSlug}`}
              className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              style={{ borderTop: `4px solid ${primaryColor}` }}
            >
              <div 
                className="flex items-center justify-center w-16 h-16 rounded-xl mb-4 mx-auto"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <svg 
                  className="w-8 h-8" 
                  style={{ color: primaryColor }} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 
                className="text-xl font-semibold mb-3 group-hover:scale-105 transition-transform"
                style={{ color: primaryColor }}
              >
                Visit School Portal
              </h3>
              <p className="text-gray-600">
                Access the student portal to view classes, calendar, and subscriptions
              </p>
            </Link>

            {/* Admin Dashboard Button */}
            <Link
              href={`/${tenantSlug}/admin/simple`}
              className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              style={{ borderTop: `4px solid ${secondaryColor}` }}
            >
              <div 
                className="flex items-center justify-center w-16 h-16 rounded-xl mb-4 mx-auto"
                style={{ backgroundColor: `${secondaryColor}20` }}
              >
                <svg 
                  className="w-8 h-8" 
                  style={{ color: secondaryColor }} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 
                className="text-xl font-semibold mb-3 group-hover:scale-105 transition-transform"
                style={{ color: secondaryColor }}
              >
                Admin Dashboard
              </h3>
              <p className="text-gray-600">
                Manage your school's classes, users, and view analytics
              </p>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-12 bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Access</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <strong>School:</strong> {tenantData?.schoolName}
              </div>
              <div>
                <strong>Slug:</strong> {tenantData?.slug}
              </div>
              <div>
                <strong>Role:</strong> {userData?.role}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
