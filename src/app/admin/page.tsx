
import { UserButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { UserRole } from '@/types';
import Link from 'next/link';

export default async function AdminDashboard() {
  const user = await getServerUser();
  
  if (!user) {
    redirect('/sign-in?redirect_url=/admin');
  }
  
  if (user.role !== UserRole.ADMIN) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Admin Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.name} (Admin)
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/admin/users" className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <p className="mt-2 text-gray-600">Manage user roles and promote users to admin</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">Manage Users →</span>
            </Link>
            <Link href="/admin/payments" className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900">Payments & Bookings</h2>
              <p className="mt-2 text-gray-600">View payment transactions and class bookings</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">View Payments →</span>
            </Link>
            <Link href="/admin/classes/new" className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900">Create Class</h2>
              <p className="mt-2 text-gray-600">Add new dance classes to the schedule</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">Create Class →</span>
            </Link>
            <Link href="/admin/passes" className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900">Pass Management</h2>
              <p className="mt-2 text-gray-600">Enable/disable passes and manage availability</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">Manage Passes →</span>
            </Link>
            <Link href="/admin/reports" className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900">Reports & Analytics</h2>
              <p className="mt-2 text-gray-600">View business insights and performance metrics</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">View Reports →</span>
            </Link>
            <Link href="/studio" className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900">Content Studio</h2>
              <p className="mt-2 text-gray-600">Access Sanity Studio to manage content</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">Open Studio →</span>
            </Link>
            <Link href="/dashboard" className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
              <p className="mt-2 text-gray-600">View analytics and performance metrics</p>
              <span className="mt-4 inline-block text-blue-600 font-medium">View Stats →</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
