'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { 
  ChartBarIcon, 
  DocumentChartBarIcon, 
  UsersIcon,
  CreditCardIcon,
  CalendarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

interface ReportData {
  totalRevenue: number;
  totalUsers: number;
  totalClasses: number;
  totalBookings: number;
  monthlyGrowth: number;
  popularClasses: Array<{
    name: string;
    bookings: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
}

export default function ReportsPage() {
  const params = useParams();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantSlug = params.slug as string;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;

    const fetchReports = async () => {
      try {
        // Fetch data from multiple stats endpoints
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
        const classesData = classesResponse.ok ? await classesResponse.json() : { totalClasses: 0, popularClasses: [] };
        const bookingsData = bookingsResponse.ok ? await bookingsResponse.json() : { totalBookings: 0, totalRevenue: 0 };

        setReportData({
          totalRevenue: bookingsData.totalRevenue || 0,
          totalUsers: usersData.totalUsers || 0,
          totalClasses: classesData.totalClasses || 0,
          totalBookings: bookingsData.totalBookings || 0,
          monthlyGrowth: 12.5, // This would need to be calculated from historical data
          popularClasses: classesData.popularClasses || [],
          revenueByMonth: bookingsData.revenueByMonth || []
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
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
          <p className="text-gray-600">Please sign in to access reports.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link 
            href={`/${tenantSlug}/admin`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h1>
          <p className="text-gray-600">Report data is not available at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-sm text-gray-500">View business insights and performance metrics</p>
            </div>
            <div className="flex space-x-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Export Report
              </button>
              <Link
                href={`/${tenantSlug}/admin`}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCardIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">{reportData.totalRevenue.toLocaleString()} kr</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{reportData.totalUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Classes</dt>
                    <dd className="text-lg font-medium text-gray-900">{reportData.totalClasses}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Monthly Growth</dt>
                    <dd className="text-lg font-medium text-gray-900">+{reportData.monthlyGrowth}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Month</h3>
            <div className="space-y-4">
              {reportData.revenueByMonth.map((item, index) => (
                <div key={item.month} className="flex items-center">
                  <div className="w-12 text-sm text-gray-500">{item.month}</div>
                  <div className="flex-1 mx-4">
                    <div className="bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(item.revenue / Math.max(...reportData.revenueByMonth.map(r => r.revenue))) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-20 text-sm text-gray-900 text-right">
                    {item.revenue.toLocaleString()} kr
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Classes */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Classes</h3>
            <div className="space-y-4">
              {reportData.popularClasses.map((classItem, index) => (
                <div key={classItem.name} className="flex items-center">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{classItem.name}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 text-sm text-gray-500 text-right">{classItem.bookings}</div>
                    <div className="w-20">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(classItem.bookings / Math.max(...reportData.popularClasses.map(c => c.bookings))) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Metrics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{reportData.totalBookings}</div>
              <div className="text-sm text-gray-500">Total Bookings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(reportData.totalRevenue / reportData.totalUsers)} kr
              </div>
              <div className="text-sm text-gray-500">Avg. Revenue per User</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(reportData.totalBookings / reportData.totalClasses)}
              </div>
              <div className="text-sm text-gray-500">Avg. Bookings per Class</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round((reportData.totalBookings / (reportData.totalClasses * 4)) * 100)}%
              </div>
              <div className="text-sm text-gray-500">Class Fill Rate</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/${tenantSlug}/admin/payments`}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow p-5 block"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCardIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Payment Details
                  </dt>
                  <dd className="text-sm text-gray-900">
                    View detailed payment transactions
                  </dd>
                </dl>
              </div>
            </div>
          </Link>

          <Link
            href={`/${tenantSlug}/admin/users`}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow p-5 block"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    User Analytics
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Analyze user behavior and engagement
                  </dd>
                </dl>
              </div>
            </div>
          </Link>

          <Link
            href={`/${tenantSlug}/admin/schedule`}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow p-5 block"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Class Performance
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Analyze class attendance and popularity
                  </dd>
                </dl>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
