'use client';

import { useState, useEffect } from 'react';
import { User, UserRole } from '@/types';

interface StatsProps {
  user: User;
}

interface Subscription {
  _id: string;
  type: string;
  isActive: boolean;
  remainingClips?: number;
  endDate: string;
  passName?: string;
}

interface Booking {
  _id: string;
  date: string;
  status: string;
  parentClass: {
    title: string;
    instructor: {
      _id: string;
      name: string;
    };
  };
}

interface AdminStats {
  totalUsers: number;
  totalClasses: number;
  totalBookings: number;
}

export default function DashboardStats({ user }: StatsProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [user.id]);

  const fetchUserData = async () => {
    try {
      // Fetch subscriptions
      const subscriptionsResponse = await fetch('/api/subscriptions');
      if (subscriptionsResponse.ok) {
        const subscriptionsData = await subscriptionsResponse.json();
        setSubscriptions(subscriptionsData.subscriptions || []);
      }

      // Fetch bookings
      const bookingsResponse = await fetch('/api/bookings');
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        setBookings(bookingsData.bookings || []);
      }

      // Fetch admin stats if user is admin
      if (user.role === UserRole.ADMIN) {
        try {
          // Fetch real admin stats from Sanity
          const [usersResponse, classesResponse, allBookingsResponse] = await Promise.all([
            fetch('/api/admin/stats/users'),
            fetch('/api/admin/stats/classes'),
            fetch('/api/admin/stats/bookings')
          ]);

          let totalUsers = 0;
          let totalClasses = 0;
          let totalBookings = 0;

          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            totalUsers = usersData.count || 0;
          }

          if (classesResponse.ok) {
            const classesData = await classesResponse.json();
            totalClasses = classesData.count || 0;
          }

          if (allBookingsResponse.ok) {
            const bookingsData = await allBookingsResponse.json();
            totalBookings = bookingsData.count || 0;
          }

          setAdminStats({
            totalUsers,
            totalClasses,
            totalBookings
          });
        } catch (error) {
          console.error('Error fetching admin stats:', error);
          setAdminStats({
            totalUsers: 0,
            totalClasses: 0,
            totalBookings: 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg bg-white p-6 shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  // Calculate stats from fetched data
  const now = new Date();
  const activeBookings = bookings.filter(booking => new Date(booking.date) > now);
  const activeSubscription = subscriptions.find(sub => 
    sub.isActive && new Date(sub.endDate) > now
  );

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
            {activeSubscription.remainingClips !== undefined && activeSubscription.remainingClips !== null
              ? `${activeSubscription.remainingClips} classes left`
              : 'Unlimited'}
          </p>
        )}
      </div>

      {/* Admin Stats */}
      {user.role === UserRole.ADMIN && adminStats && (
        <>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{adminStats.totalUsers}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Classes</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{adminStats.totalClasses}</p>
          </div>
        </>
      )}

      {/* Instructor Stats - Simplified for now */}
      {user.role === UserRole.INSTRUCTOR && (
        <>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">My Classes</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {bookings.filter(b => b.parentClass?.instructor?._id === user.id).length}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Next Class</h3>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              Coming Soon
            </p>
          </div>
        </>
      )}
    </div>
  );
}
