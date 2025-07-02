
'use client';

import { useState, useEffect } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  CreditCardIcon, 
  BookOpenIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

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
  parentClass: {
    title: string;
    instructor: { name: string };
    danceStyle: string;
    location: string;
  };
}

export default function StudentDashboard() {
  const { user, isLoaded } = useUser();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user]);

  const fetchData = async () => {
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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
          <p className="text-gray-600">You need to be signed in to access the student dashboard.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcomingBookings = bookings.filter(booking => new Date(booking.date) > now).slice(0, 3);
  const activeSubscription = subscriptions.find(sub => 
    sub.isActive && new Date(sub.endDate) > now
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Student Dashboard
              </h1>
              <Link 
                href="/dashboard" 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ← Back to Main Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.fullName || user.firstName}
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to your dance journey!
          </h2>
          <p className="text-gray-600">
            Manage your classes, subscriptions, and dance progress all in one place.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming Classes</p>
                <p className="text-2xl font-semibold text-gray-900">{upcomingBookings.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCardIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Subscription</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {activeSubscription ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-2xl font-semibold text-gray-900">{bookings.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-orange-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Classes Left</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {activeSubscription?.remainingClips ?? 'Unlimited'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Upcoming Classes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Classes</h3>
              </div>
              <div className="p-6">
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming classes</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Book your first class to get started!
                    </p>
                    <div className="mt-6">
                      <Link
                        href="/calendar"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Browse Classes
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <div key={booking._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">{booking.parentClass.title}</h4>
                            <p className="text-sm text-gray-600">
                              {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
                            </p>
                            <p className="text-sm text-gray-600">
                              {format(new Date(booking.date), 'h:mm a')}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Instructor: {booking.parentClass.instructor.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              Location: {booking.parentClass.location}
                            </p>
                          </div>
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                            Booked
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-4">
                      <Link
                        href="/my-classes"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View All My Classes →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions & Subscription Status */}
          <div className="space-y-6">
            {/* Subscription Status */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Subscription Status</h3>
              </div>
              <div className="p-6">
                {activeSubscription ? (
                  <div>
                    <div className="flex items-center mb-4">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-green-800 font-medium">Active Subscription</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Type: {activeSubscription.passName || activeSubscription.type}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Classes remaining: {activeSubscription.remainingClips ?? 'Unlimited'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Expires: {format(new Date(activeSubscription.endDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center mb-4">
                      <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 mr-2" />
                      <span className="text-orange-800 font-medium">No Active Subscription</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Purchase a subscription to start booking classes.
                    </p>
                    <Link
                      href="/subscriptions"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Buy Subscription
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-4">
                <Link
                  href="/calendar"
                  className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <CalendarIcon className="h-6 w-6 text-blue-500 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Browse Classes</p>
                    <p className="text-sm text-gray-500">Find and book classes</p>
                  </div>
                </Link>

                <Link
                  href="/my-classes"
                  className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <BookOpenIcon className="h-6 w-6 text-green-500 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">My Classes</p>
                    <p className="text-sm text-gray-500">View booked classes</p>
                  </div>
                </Link>

                <Link
                  href="/subscriptions"
                  className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <CreditCardIcon className="h-6 w-6 text-purple-500 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Subscriptions</p>
                    <p className="text-sm text-gray-500">Manage subscriptions</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
