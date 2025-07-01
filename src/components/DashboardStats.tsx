import { db } from '@/lib/database';
import { User, UserRole } from '@/types';

interface StatsProps {
  user: User;
}

export default function DashboardStats({ user }: StatsProps) {
  // Get user-specific stats
  const userBookings = db.getUserBookings(user.id);
  const activeBookings = userBookings.filter(b => b.status === 'confirmed');
  const userSubscriptions = db.getUserSubscriptions(user.id);
  const activeSubscription = userSubscriptions.find(s => s.status === 'active');
  
  // Get admin stats
  const totalUsers = user.role === UserRole.ADMIN ? db.listUsers().length : null;
  const totalClasses = user.role === UserRole.ADMIN ? db.listClasses().length : null;
  const totalBookings = user.role === UserRole.ADMIN ? db.listBookings().length : null;

  // Get instructor stats
  const instructorClasses = user.role === UserRole.INSTRUCTOR 
    ? db.listClasses().filter(c => c.instructorId === user.id)
    : null;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Common Stats */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">Active Bookings</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">{activeBookings.length}</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">Subscription Status</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">
          {activeSubscription ? 'Active' : 'None'}
        </p>
        {activeSubscription && (
          <p className="mt-1 text-sm text-gray-500">
            {activeSubscription.remainingClasses !== null 
              ? `${activeSubscription.remainingClasses} classes left`
              : 'Unlimited'}
          </p>
        )}
      </div>

      {/* Admin Stats */}
      {user.role === UserRole.ADMIN && (
        <>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{totalUsers}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Classes</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{totalClasses}</p>
          </div>
        </>
      )}

      {/* Instructor Stats */}
      {user.role === UserRole.INSTRUCTOR && instructorClasses && (
        <>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">My Classes</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{instructorClasses.length}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Next Class</h3>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {instructorClasses
                .filter(c => c.startTime > new Date())
                .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0]?.title || 'No upcoming classes'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
