'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface ClassInstance {
  _id: string;
  title: string;
  instructor: string;
  startTime: string;
  endTime: string;
  date: string;
  dayOfWeek?: string;
  capacity: number;
  booked: number;
  price: number;
  level: string;
  location?: string;
  isCancelled: boolean;
  remainingCapacity: number;
}

interface WeeklyScheduleProps {
  tenantSlug: string;
  onBookClass?: (classInstanceId: string) => Promise<void>;
  bookingLoading?: string | null;
}

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function WeeklySchedule({ tenantSlug, onBookClass, bookingLoading }: WeeklyScheduleProps) {
  const { tenant } = useTenant();
  const [classInstances, setClassInstances] = useState<ClassInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));

  // Get the start of the week (Monday)
  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Get week end (Sunday)
  function getWeekEnd(weekStart: Date): Date {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  // Format date for display
  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Navigate weeks
  const goToPreviousWeek = useCallback(() => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  }, [currentWeekStart]);

  const goToNextWeek = useCallback(() => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  }, [currentWeekStart]);

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeekStart(getWeekStart(new Date()));
  }, []);

  const currentWeekEnd = useMemo(() => getWeekEnd(currentWeekStart), [currentWeekStart]);

  useEffect(() => {
    const fetchClassInstances = async () => {
      if (!tenantSlug) return;
      
      setLoading(true);
      try {
        const response = await fetch(
          `/api/classes/instances/public?startDate=${currentWeekStart.toISOString()}&endDate=${currentWeekEnd.toISOString()}&tenantSlug=${tenantSlug}`
        );

        if (response.ok) {
          const data = await response.json();
          setClassInstances(data.instances || []);
        } else {
          console.error('Failed to fetch class instances:', response.statusText);
          setClassInstances([]);
        }
      } catch (err) {
        console.error('Error fetching class instances:', err);
        setClassInstances([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClassInstances();
  }, [tenantSlug, currentWeekStart, currentWeekEnd]);

  const weekDayMeta = useMemo(() => {
    return WEEK_DAYS.map((day, index) => {
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(currentWeekStart.getDate() + index);
      const isToday = dayDate.toDateString() === new Date().toDateString();
      return { day, dayDate, isToday };
    });
  }, [currentWeekStart]);

  const groupedClasses = useMemo(() => {
    const grouped: { [key: string]: ClassInstance[] } = {};

    WEEK_DAYS.forEach(day => {
      grouped[day] = [];
    });

    classInstances.forEach(instance => {
      const dayName = instance.dayOfWeek?.toLowerCase();

      if (dayName && grouped[dayName]) {
        grouped[dayName].push(instance);
      }
    });

    // Sort classes by start time within each day
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [classInstances]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading class schedule...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no classes are available at all
  if (classInstances.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Weekly Schedule
              </h2>
              <p className="text-sm text-gray-600">
                {formatDate(currentWeekStart)} - {formatDate(currentWeekEnd)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousWeek}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={goToCurrentWeek}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                This Week
              </button>
              <button
                onClick={goToNextWeek}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No classes scheduled</h3>
            <p className="text-gray-500 mb-4">
              There are no classes scheduled for this week. Try selecting a different week or check back later.
            </p>
            <p className="text-sm text-gray-400">
              If you&apos;re an admin, you can add classes through the admin panel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getLevelBadgeClasses = (level: string) => {
    const normalizedLevel = level.toLowerCase();
    if (normalizedLevel === 'beginner') return 'bg-green-100 text-green-800';
    if (normalizedLevel === 'improvers') return 'bg-blue-100 text-blue-800';
    if (normalizedLevel === 'intermediate') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header with week navigation */}
      <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Weekly Schedule
            </h2>
            <p className="text-sm text-gray-600">
              {formatDate(currentWeekStart)} - {formatDate(currentWeekEnd)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
            <button
              onClick={goToPreviousWeek}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              <span className="hidden sm:inline">← Previous</span>
              <span className="sm:hidden">← Prev</span>
            </button>
            <button
              onClick={goToCurrentWeek}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              This Week
            </button>
            <button
              onClick={goToNextWeek}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              <span className="hidden sm:inline">Next →</span>
              <span className="sm:hidden">Next →</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile schedule cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {weekDayMeta.map(({ day, dayDate, isToday }) => {
          const dayClasses = groupedClasses[day] || [];

          return (
            <section key={day} className={`px-4 py-4 ${isToday ? 'bg-blue-50/40' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900 capitalize">{day}</h3>
                <span className={`text-xs ${isToday ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>
                  {formatDate(dayDate)}
                </span>
              </div>

              {dayClasses.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No classes</p>
              ) : (
                <div className="space-y-3">
                  {dayClasses.map((classInstance) => (
                    <div
                      key={classInstance._id}
                      className={`rounded-xl border p-3 ${
                        classInstance.isCancelled
                          ? 'bg-red-50 border-red-200'
                          : classInstance.remainingCapacity === 0
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-white border-gray-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-gray-900 leading-tight">{classInstance.title}</h4>
                        <span className={`inline-block px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap ${getLevelBadgeClasses(classInstance.level)}`}>
                          {classInstance.level}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-gray-600 mb-3">
                        <div className="flex items-center">
                          <ClockIcon className="h-3.5 w-3.5 mr-1.5" />
                          <span>{classInstance.startTime} - {classInstance.endTime}</span>
                        </div>
                        {classInstance.location && (
                          <div className="flex items-center">
                            <MapPinIcon className="h-3.5 w-3.5 mr-1.5" />
                            <span>{classInstance.location}</span>
                          </div>
                        )}
                        <p className="font-medium text-gray-700">Instructor: {classInstance.instructor}</p>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold" style={{ color: tenant?.branding?.primaryColor || '#3B82F6' }}>
                            {classInstance.price} kr
                          </p>
                          {!classInstance.isCancelled && classInstance.remainingCapacity > 0 && (
                            <p className="text-[11px] text-gray-500">{classInstance.remainingCapacity} spots left</p>
                          )}
                        </div>

                        {classInstance.isCancelled ? (
                          <span className="text-xs text-red-600 font-medium">Cancelled</span>
                        ) : classInstance.remainingCapacity === 0 ? (
                          <span className="text-xs text-yellow-700 font-medium">Full</span>
                        ) : (
                          <>
                            <SignedOut>
                              <SignInButton mode="modal">
                                <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500">
                                  Sign In
                                </button>
                              </SignInButton>
                            </SignedOut>
                            <SignedIn>
                              {onBookClass && (
                                <button
                                  onClick={() => onBookClass(classInstance._id)}
                                  disabled={bookingLoading === classInstance._id}
                                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                                >
                                  {bookingLoading === classInstance._id ? 'Booking...' : 'Book'}
                                </button>
                              )}
                            </SignedIn>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Weekly schedule table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {weekDayMeta.map(({ day, dayDate, isToday }) => {
                
                return (
                  <th
                    key={day}
                    className={`px-4 py-3 text-left text-sm font-medium text-gray-900 border-r border-gray-200 last:border-r-0 ${
                      isToday ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="capitalize font-semibold">{day}</span>
                      <span className={`text-xs ${isToday ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                        {formatDate(dayDate)}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr>
              {weekDayMeta.map(({ day, isToday }) => {
                const dayClasses = groupedClasses[day] || [];
                
                return (
                  <td
                    key={day}
                    className={`px-4 py-4 align-top border-r border-gray-200 last:border-r-0 min-h-[300px] ${
                      isToday ? 'bg-blue-50/30' : ''
                    }`}
                    style={{ width: '14.28%' }}
                  >
                    <div className="space-y-2">
                      {dayClasses.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm py-8">
                          No classes
                        </div>
                      ) : (
                        dayClasses.map((classInstance) => (
                          <div
                            key={classInstance._id}
                            className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                              classInstance.isCancelled
                                ? 'bg-red-50 border-red-200'
                                : classInstance.remainingCapacity === 0
                                ? 'bg-yellow-50 border-yellow-200'
                                : 'bg-white border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            {/* Class title and level */}
                            <div className="mb-2">
                              <h4 className="font-medium text-sm text-gray-900 leading-tight">
                                {classInstance.title}
                              </h4>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getLevelBadgeClasses(classInstance.level)}`}>
                                {classInstance.level}
                              </span>
                            </div>

                            {/* Time and instructor */}
                            <div className="space-y-1 text-xs text-gray-600 mb-2">
                              <div className="flex items-center">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                <span>{classInstance.startTime} - {classInstance.endTime}</span>
                              </div>
                              {classInstance.location && (
                                <div className="flex items-center">
                                  <MapPinIcon className="h-3 w-3 mr-1" />
                                  <span>{classInstance.location}</span>
                                </div>
                              )}
                              <div className="font-medium">
                                {classInstance.instructor}
                              </div>
                            </div>

                            {/* Price and booking button */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold" style={{ color: tenant?.branding?.primaryColor || '#3B82F6' }}>
                                {classInstance.price} kr
                              </span>
                              
                              {classInstance.isCancelled ? (
                                <span className="text-xs text-red-600 font-medium">Cancelled</span>
                              ) : classInstance.remainingCapacity === 0 ? (
                                <span className="text-xs text-yellow-600 font-medium">Full</span>
                              ) : (
                                <>
                                  <SignedOut>
                                    <SignInButton mode="modal">
                                      <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                                        Sign In
                                      </button>
                                    </SignInButton>
                                  </SignedOut>
                                  <SignedIn>
                                    {onBookClass && (
                                      <button
                                        onClick={() => onBookClass(classInstance._id)}
                                        disabled={bookingLoading === classInstance._id}
                                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {bookingLoading === classInstance._id ? 'Booking...' : 'Book'}
                                      </button>
                                    )}
                                  </SignedIn>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Total classes this week: {classInstances.length}
          </span>
        </div>
      </div>
    </div>
  );
}
