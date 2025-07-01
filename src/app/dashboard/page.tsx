import { UserButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerUser } from '@/lib/auth';
import { initializeSampleData } from '@/lib/database';
import DashboardStats from '@/components/DashboardStats';
import UpcomingClasses from '@/components/UpcomingClasses';
import QuickActions from '@/components/QuickActions';
import { sanityClient } from '@/lib/sanity';
import { upcomingClassesQuery } from '@/lib/sanity-queries';

export default async function DashboardPage() {
  const user = await getServerUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  // Initialize sample data if needed (in production, this would be handled differently)
  try {
    initializeSampleData();
  } catch (error) {
    // Sample data already exists
  }

  // Fetch classes from Sanity
  let sanityClasses = [];
  try {
    sanityClasses = await sanityClient.fetch(upcomingClassesQuery);
  } catch (error) {
    console.error('Error fetching classes:', error);
  }

  // Create a serializable user object (remove Clerk data)
  const serializableUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Dance School CMS
              </h1>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
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
              Here's what's happening in your dance school today.
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
              <UpcomingClasses user={serializableUser} sanityClasses={sanityClasses} />
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
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="rounded-lg bg-blue-500 p-6 text-white hover:bg-blue-600 transition-colors"
                >
                  <h2 className="text-xl font-semibold">Admin Panel</h2>
                  <p className="mt-2">Manage classes, users, and bookings</p>
                </Link>
              )}
              
              {(user.role === 'student' || user.role === 'admin') && (
                <Link
                  href="/student"
                  className="rounded-lg bg-green-500 p-6 text-white hover:bg-green-600 transition-colors"
                >
                  <h2 className="text-xl font-semibold">Student Portal</h2>
                  <p className="mt-2">View and book classes</p>
                </Link>
              )}
              
              {(user.role === 'instructor' || user.role === 'admin') && (
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
