'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import DashboardStats from '@/components/DashboardStats';
import UpcomingClasses from '@/components/UpcomingClasses';
import QuickActions from '@/components/QuickActions';
import { User, UserRole } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [sanityClasses, setSanityClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/status');
        if (!response.ok) {
          router.push('/sign-in');
          return;
        }

        const data = await response.json();
        if (!data.authenticated) {
          router.push('/sign-in');
          return;
        }

        setUser(data.user);
        setTenant(data.tenant);
        fetchClasses();
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/sign-in');
      }
    };

    checkAuth();
  }, [router]);

  // Refresh classes when URL has success parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'class-created') {
      fetchClasses();
      // Remove the success parameter from URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  const fetchClasses = async () => {
    try {
      // Get date range for next 30 days
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Fetch class instances for the next 30 days
      const response = await fetch(
        `/api/classes/instances?startDate=${startDate}&endDate=${endDate}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSanityClasses(data.instances || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {tenant?.schoolName || 'Dance School CMS'}
              </h1>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.name}
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back, {user.name}!
            </h2>
            <p className="mt-2 text-gray-600">
              Here's what's happening at {tenant?.schoolName || 'your dance school'} today.
            </p>
          </div>

          {/* Stats Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
            <DashboardStats user={user} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column - Upcoming Classes */}
            <div className="lg:col-span-2">
              <UpcomingClasses user={user} sanityClasses={sanityClasses} />
            </div>

            {/* Right Column - Quick Actions */}
            <div className="lg:col-span-1">
              <QuickActions user={user} />
            </div>
          </div>

          {/* Role-specific Portal Links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Access Portals</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {user.role === UserRole.ADMIN && (
                <Link
                  href="/admin"
                  className="rounded-lg bg-blue-500 p-6 text-white hover:bg-blue-600 transition-colors"
                >
                  <h2 className="text-xl font-semibold">Admin Panel</h2>
                  <p className="mt-2">Manage classes, users, and bookings</p>
                </Link>
              )}
              
              {(user.role === UserRole.STUDENT || user.role === UserRole.ADMIN) && (
                <Link
                  href="/student"
                  className="rounded-lg bg-green-500 p-6 text-white hover:bg-green-600 transition-colors"
                >
                  <h2 className="text-xl font-semibold">Student Portal</h2>
                  <p className="mt-2">View and book classes</p>
                </Link>
              )}
              
              {(user.role === UserRole.INSTRUCTOR || user.role === UserRole.ADMIN) && (
                <Link
                  href="/instructor"
                  className="rounded-lg bg-purple-500 p-6 text-white hover:bg-purple-600 transition-colors"
                >
                  <h2 className="text-xl font-semibold">Instructor Portal</h2>
                  <p className="mt-2">Manage your classes</p>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
