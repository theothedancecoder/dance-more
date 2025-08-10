'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { ClockIcon, UserGroupIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface ClassInstance {
  _id: string;
  title: string;
  instructor: string;
  startTime: string;
  endTime: string;
  date: string;
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
    return new Date(d.setDate(diff));
  }

  // Get week end (Sunday)
  function getWeekEnd(weekStart: Date): Date {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  }

  // Format date for display
  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Get day name
  function getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  useEffect(() => {
    const fetchClassInstances = async () => {
      if (!tenantSlug) return;
      
      setLoading(true);
      try {
        const weekEnd = getWeekEnd(currentWeekStart);
        const apiUrl = `/api/classes/instances/public?startDate=${currentWeekStart.toISOString()}&endDate=${weekEnd.toISOString()}&tenantSlug=${tenantSlug}`;
        
        console.log('🔍 WeeklySchedule fetching:', apiUrl);
        console.log('📅 Week range:', currentWeekStart.toISOString(), 'to', weekEnd.toISOString());
        
        const response = await fetch(apiUrl);

        if (response.ok) {
          const data = await response.json();
          console.log('📊 API returned instances:', data.instances?.length || 0);
          
          if (data.instances && data.instances.length > 0) {
            console.log('📝 First few instances:');
            data.instances.slice(0, 5).forEach((instance: any) => {
              const date = new Date(instance.date);
              const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              const dayName = dayNames[date.getUTCDay()];
              console.log(`   ${instance.title}: ${instance.date} -> ${dayName}`);
            });
          }
          
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
  }, [tenantSlug, currentWeekStart]);

  // Group classes by day
  const classesByDay = () => {
    console.log('🔄 Grouping classes by day, total instances:', classInstances.length);
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const grouped: { [key: string]: ClassInstance[] } = {};
    
    days.forEach(day => {
      grouped[day] = [];
    });

    classInstances.forEach(instance => {
      // Parse the date correctly to avoid timezone issues
      const instanceDate = new Date(instance.date);
      
      // Use getUTCDay() to get the correct day without timezone conversion
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[instanceDate.getUTCDay()];
      
      console.log(`   ${instance.title}: ${instance.date} -> ${dayName} (UTC day: ${instanceDate.getUTCDay()})`);
      
      if (grouped[dayName]) {
        grouped[dayName].push(instance);
      } else {
        console.log(`   ⚠️ Day "${dayName}" not found in grouped object!`);
      }
    });

    // Sort classes by start time within each day
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    console.log('📊 Final grouping result:');
    Object.keys(grouped).forEach(day => {
      console.log(`   ${day}: ${grouped[day].length} classes`);
    });

    return grouped;
  };

  const weekDays = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ];

  const groupedClasses = classesByDay();

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
                {formatDate(currentWeekStart)} - {formatDate(getWeekEnd(currentWeekStart))}
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
              If you're an admin, you can add classes through the admin panel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header with week navigation */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Weekly Schedule
            </h2>
            <p className="text-sm text-gray-600">
              {formatDate(currentWeekStart)} - {formatDate(getWeekEnd(currentWeekStart))}
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

      {/* Weekly schedule table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {weekDays.map((day, index) => {
                const dayDate = new Date(currentWeekStart);
                dayDate.setDate(currentWeekStart.getDate() + index);
                const isToday = dayDate.toDateString() === new Date().toDateString();
                
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
              {weekDays.map((day, index) => {
                const dayClasses = groupedClasses[day] || [];
                const dayDate = new Date(currentWeekStart);
                dayDate.setDate(currentWeekStart.getDate() + index);
                const isToday = dayDate.toDateString() === new Date().toDateString();
                
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
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                                classInstance.level === 'beginner' 
                                  ? 'bg-green-100 text-green-800'
                                  : classInstance.level === 'improvers'
                                  ? 'bg-blue-100 text-blue-800'
                                  : classInstance.level === 'intermediate'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {classInstance.level}
                              </span>
                            </div>

                            {/* Time and instructor */}
                            <div className="space-y-1 text-xs text-gray-600 mb-2">
                              <div className="flex items-center">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                <span>{classInstance.startTime} - {classInstance.endTime}</span>
                              </div>
                              <div className="flex items-center">
                                <UserGroupIcon className="h-3 w-3 mr-1" />
                                <span>{classInstance.booked}/{classInstance.capacity}</span>
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
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Total classes this week: {classInstances.length}
          </span>
          <span>
            Available spots: {classInstances.reduce((sum, cls) => sum + cls.remainingCapacity, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
