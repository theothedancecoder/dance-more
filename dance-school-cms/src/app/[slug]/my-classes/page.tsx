'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import Link from 'next/link';
import { format } from 'date-fns';

interface Booking {
  _id: string;
  date: string;
  parentClass: {
    title: string;
    instructor: { name: string };
    danceStyle: string;
    location: string;
  };
  userBooking: {
    bookingType: string;
    bookingTime: string;
  };
}

export default function MyClassesPage() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const { tenant, isLoading, error } = useTenant();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const tenantSlug = params.slug as string;

  useEffect(() => {
    if (isLoaded && user && tenantSlug) {
      fetchBookings();
    }
  }, [isLoaded, user, tenantSlug]);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings', {
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">School Not Found</h1>
          <p className="text-gray-600 mb-6">
            The dance school "{params.slug}" could not be found or is not available.
          </p>
          <Link
            href="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
          <p className="text-gray-600">You need to be signed in to view your classes.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcomingBookings = bookings.filter(booking => new Date(booking.date) > now);
  const pastBookings = bookings.filter(booking => new Date(booking.date) <= now);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link href={`/${tenantSlug}`} className="text-2xl font-bold" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                {tenant.schoolName}
              </Link>
            </div>
            <nav className="flex space-x-8">
              <Link href={`/${tenantSlug}`} className="text-gray-500 hover:text-gray-900">Home</Link>
              <Link href={`/${tenantSlug}/classes`} className="text-gray-500 hover:text-gray-900">Classes</Link>
              <Link href={`/${tenantSlug}/calendar`} className="text-gray-500 hover:text-gray-900">Calendar</Link>
              <Link href={`/${tenantSlug}/subscriptions`} className="text-gray-500 hover:text-gray-900">Passes</Link>
              <Link href={`/${tenantSlug}/my-classes`} className="text-gray-900 font-medium">My Classes</Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
              <p className="text-gray-600 mt-2">View all your booked classes at {tenant.schoolName}</p>
            </div>
            <Link 
              href={`/${tenantSlug}`} 
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow hover:bg-gray-50 transition-colors text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>

        {/* Upcoming Classes */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Upcoming Classes</h2>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No upcoming classes booked</p>
              <Link
                href={`/${tenantSlug}/calendar`}
                className="inline-block px-6 py-3 rounded-lg text-white font-medium transition-colors"
                style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
              >
                Book a Class
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={booking._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{booking.parentClass.title}</h3>
                      <p className="text-gray-700">
                        {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-gray-700">
                        {format(new Date(booking.date), 'h:mm a')}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Instructor: {booking.parentClass.instructor.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Location: {booking.parentClass.location}
                      </p>
                    </div>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                      Upcoming
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Classes */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Past Classes</h2>
          {pastBookings.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No past classes</p>
          ) : (
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <div key={booking._id} className="border border-gray-200 rounded-lg p-4 opacity-75">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{booking.parentClass.title}</h3>
                      <p className="text-gray-700">
                        {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-gray-700">
                        {format(new Date(booking.date), 'h:mm a')}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Instructor: {booking.parentClass.instructor.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Location: {booking.parentClass.location}
                      </p>
                    </div>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                      Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
