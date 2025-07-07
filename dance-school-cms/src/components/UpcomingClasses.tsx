'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { format } from 'date-fns';
import Link from 'next/link';

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

interface ClassInstance {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    classId: string;
    danceStyle: string;
    level: string;
    instructor: string;
    location: string;
    capacity: number;
    remainingCapacity: number;
    bookingCount: number;
    price: number;
    isCancelled: boolean;
    isBookable: boolean;
  };
}

interface UpcomingClassesProps {
  sanityClasses: ClassInstance[];
  tenantSlug: string;
}

export default function UpcomingClasses({ sanityClasses, tenantSlug }: UpcomingClassesProps) {
  const { user, isLoaded } = useUser();
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user && tenantSlug) {
      fetchUserBookings();
    }
  }, [isLoaded, user, tenantSlug]);

  const fetchUserBookings = async () => {
    try {
      const response = await fetch('/api/bookings', {
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching user bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const now = new Date();
  
  // Get user's upcoming booked classes
  const upcomingBookings = userBookings
    .filter(booking => new Date(booking.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Get all upcoming classes from Sanity
  const allUpcomingClasses = sanityClasses
    .filter(c => new Date(c.start) > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* User's Booked Classes */}
      {upcomingBookings.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Upcoming Classes</h3>
          <div className="space-y-3">
            {upcomingBookings.map((booking) => {
              const classDate = new Date(booking.date);
              const isToday = classDate.toDateString() === now.toDateString();
              const isTomorrow = classDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
              
              return (
                <div key={booking._id} className="flex items-center justify-between border-l-4 border-blue-500 bg-blue-50 p-3 rounded-r-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{booking.parentClass.title}</h4>
                    <p className="text-sm text-gray-600">
                      {format(classDate, 'MMM dd, yyyy • h:mm a')}
                    </p>
                    <p className="text-sm text-gray-500">
                      Instructor: {booking.parentClass.instructor.name} • {booking.parentClass.location}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    {isToday ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                        Today
                      </span>
                    ) : isTomorrow ? (
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                        Tomorrow
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        Booked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Link
              href={`/${tenantSlug}/my-classes`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View all my classes →
            </Link>
          </div>
        </div>
      )}

      {/* Available Classes to Book */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Classes</h3>
        {allUpcomingClasses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No upcoming classes available</p>
            <Link
              href={`/${tenantSlug}/classes`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Browse all classes →
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {allUpcomingClasses.slice(0, 3).map((classItem) => {
                const isAvailable = classItem.extendedProps?.isBookable;
                const isFull = classItem.extendedProps?.remainingCapacity === 0;
                const isCancelled = classItem.extendedProps?.isCancelled;
                
                return (
                  <div key={classItem.id} className={`flex items-center justify-between border-l-4 p-3 rounded-r-lg ${
                    isCancelled ? 'border-red-500 bg-red-50' :
                    isFull ? 'border-yellow-500 bg-yellow-50' :
                    'border-green-500 bg-green-50'
                  }`}>
                    <div>
                      <h4 className="font-medium text-gray-900">{classItem.title}</h4>
                      <p className="text-sm text-gray-600">
                        {format(new Date(classItem.start), 'MMM dd, yyyy • h:mm a')} - {format(new Date(classItem.end), 'h:mm a')}
                      </p>
                      <p className="text-sm text-gray-500">
                        Instructor: {classItem.extendedProps?.instructor || 'TBA'} • {classItem.extendedProps?.location}
                      </p>
                      <p className="text-sm text-gray-500">
                        {classItem.extendedProps?.bookingCount || 0}/{classItem.extendedProps?.capacity} spots filled
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {isCancelled ? (
                        <span className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                          Cancelled
                        </span>
                      ) : isFull ? (
                        <span className="rounded bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                          Full
                        </span>
                      ) : (
                        <Link
                          href={`/${tenantSlug}/calendar`}
                          className="rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
                        >
                          Book Now
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {allUpcomingClasses.length > 3 && (
              <div className="mt-4 text-center">
                <Link
                  href={`/${tenantSlug}/calendar`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View all classes →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
