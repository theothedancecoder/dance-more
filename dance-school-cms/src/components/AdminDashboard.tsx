'use client';

import { useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  UserGroupIcon, 
  CreditCardIcon, 
  CalendarIcon,
  DocumentChartBarIcon,
  AcademicCapIcon,
  CogIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface AdminStats {
  totalUsers: number;
  activeClasses: number;
  activeSubscriptions: number;
  thisWeeksClasses: number;
  monthlyRevenue: number;
  systemStatus: string;
}

interface AdminDashboardProps {
  stats: AdminStats;
  user: {
    fullName?: string;
    firstName?: string;
  };
}

const tabs = [
  { id: 'overview', name: 'Overview', icon: HomeIcon },
  { id: 'users', name: 'Users', icon: UserGroupIcon },
  { id: 'classes', name: 'Classes', icon: AcademicCapIcon },
  { id: 'passes', name: 'Passes', icon: CreditCardIcon },
  { id: 'schedule', name: 'Schedule', icon: CalendarIcon },
  { id: 'reports', name: 'Reports', icon: DocumentChartBarIcon },
  { id: 'settings', name: 'Settings', icon: CogIcon },
];

export default function AdminDashboard({ stats, user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const params = useParams();
  const tenantSlug = typeof params?.slug === 'string' ? params.slug : null;

  // Helper function to create tenant-aware URLs
  const getTenantUrl = (path: string) => {
    if (tenantSlug) {
      return `/${tenantSlug}${path}`;
    }
    return path;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <AcademicCapIcon className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Classes</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeClasses}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CreditCardIcon className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeSubscriptions}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CalendarIcon className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">This Week's Classes</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.thisWeeksClasses}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DocumentChartBarIcon className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.monthlyRevenue.toFixed(2)} kr</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CogIcon className="h-8 w-8 text-gray-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">System Status</p>
                  <p className={`text-2xl font-semibold ${stats.systemStatus === 'Healthy' ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.systemStatus}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'users':
        return (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Link href={getTenantUrl("/admin/users")} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">User Management</h3>
              <p className="mt-2 text-gray-600">Manage user roles and promote users to admin</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">Manage Users →</span>
            </Link>
            <Link href={getTenantUrl("/promote-admin")} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Promote Admin</h3>
              <p className="mt-2 text-gray-600">Promote users to admin role</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">Promote Users →</span>
            </Link>
          </div>
        );
      case 'classes':
        return (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Link href={getTenantUrl("/admin/classes/new")} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Create Class</h3>
              <p className="mt-2 text-gray-600">Add new dance classes to the schedule</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">Create Class →</span>
            </Link>
            <Link href={getTenantUrl("/admin/schedule")} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Schedule Management</h3>
              <p className="mt-2 text-gray-600">Manage recurring classes and generate instances</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">Manage Schedule →</span>
            </Link>
          </div>
        );
      case 'passes':
        return (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Link href={getTenantUrl("/admin/passes")} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Passes & Clipcards</h3>
              <p className="mt-2 text-gray-600">Create and manage subscription passes and clipcards</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">Manage Passes →</span>
            </Link>
            <Link href={getTenantUrl("/admin/payments")} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Payments & Bookings</h3>
              <p className="mt-2 text-gray-600">View payment transactions and class bookings</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">View Payments →</span>
            </Link>
          </div>
        );
      case 'schedule':
        return (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Link href={getTenantUrl("/admin/schedule")} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Schedule Management</h3>
              <p className="mt-2 text-gray-600">Manage recurring classes and generate instances</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">Manage Schedule →</span>
            </Link>
            <Link href={getTenantUrl("/calendar")} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Class Calendar</h3>
              <p className="mt-2 text-gray-600">View the full class calendar</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">View Calendar →</span>
            </Link>
          </div>
        );
      case 'reports':
        return (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Link href={getTenantUrl("/admin/reports")} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Reports & Analytics</h3>
              <p className="mt-2 text-gray-600">View business insights and performance metrics</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">View Reports →</span>
            </Link>
            <Link href={getTenantUrl("/admin/payments")} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Financial Reports</h3>
              <p className="mt-2 text-gray-600">View payment and revenue reports</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">View Financials →</span>
            </Link>
          </div>
        );
      case 'settings':
        return (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Link href={getTenantUrl("/studio")} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Content Studio</h3>
              <p className="mt-2 text-gray-600">Access Sanity Studio to manage content</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">Open Studio →</span>
            </Link>
            <Link href={tenantSlug ? `/${tenantSlug}` : "/dashboard"} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900">Main Dashboard</h3>
              <p className="mt-2 text-gray-600">Return to the main dashboard</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">Go to Dashboard →</span>
            </Link>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Admin Dashboard
              </h1>
              <Link 
                href={tenantSlug ? `/${tenantSlug}` : "/dashboard"} 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ← Back to Main Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.fullName || user.firstName} (Admin)
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {tabs.find(tab => tab.id === activeTab)?.name}
          </h2>
          <p className="text-gray-600 mt-1">
            {activeTab === 'overview' && 'Get an overview of your dance school performance'}
            {activeTab === 'users' && 'Manage users and their roles'}
            {activeTab === 'classes' && 'Create and manage dance classes'}
            {activeTab === 'passes' && 'Manage subscription passes and payments'}
            {activeTab === 'schedule' && 'Manage class schedules and calendar'}
            {activeTab === 'reports' && 'View analytics and business reports'}
            {activeTab === 'settings' && 'System settings and configuration'}
          </p>
        </div>
        
        {renderTabContent()}
      </div>
    </div>
  );
}
