
import { UserButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { UserRole } from '@/types';

export default async function StudentDashboard() {
  const user = await getServerUser();
  
  if (!user) {
    redirect('/sign-in?redirect_url=/student');
  }
  
  if (user.role !== UserRole.STUDENT && user.role !== UserRole.ADMIN) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Student Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.name} ({user.role})
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-xl font-semibold text-gray-900">My Classes</h2>
              <p className="mt-2 text-gray-600">View your enrolled classes</p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-xl font-semibold text-gray-900">Book Classes</h2>
              <p className="mt-2 text-gray-600">Browse and book available classes</p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-xl font-semibold text-gray-900">My Profile</h2>
              <p className="mt-2 text-gray-600">Update your profile information</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
