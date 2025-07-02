'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import ClassCalendar from '@/components/ClassCalendar';

interface Class {
  _id: string;
  title: string;
  danceStyle: string;
  level: string;
  isRecurring: boolean;
  isActive: boolean;
  instructor: {
    name: string;
  };
  recurringSchedule?: {
    startDate: string;
    endDate: string;
    weeklySchedule: Array<{
      dayOfWeek: string;
      startTime: string;
      endTime: string;
    }>;
  };
}

export default function AdminSchedulePage() {
  const { user } = useUser();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/admin/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInstances = async (classId: string) => {
    setGenerating(classId);
    try {
      const response = await fetch('/api/admin/classes/generate-instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully generated ${data.instancesCreated} class instances!`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate instances');
      }
    } catch (error) {
      console.error('Error generating instances:', error);
      alert('Failed to generate instances');
    } finally {
      setGenerating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const recurringClasses = classes.filter(cls => cls.isRecurring && cls.isActive);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Schedule Management</h1>
              <p className="text-gray-600 mt-2">
                Manage class schedules, generate instances, and handle cancellations
              </p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Recurring Classes Management */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Recurring Classes</h2>
          
          {recurringClasses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No recurring classes found.</p>
              <p className="text-sm text-gray-400">
                Create recurring classes in the Sanity Studio to generate class instances.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recurringClasses.map((classItem) => (
                <div key={classItem._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{classItem.title}</h3>
                      <p className="text-gray-600">
                        {classItem.danceStyle} • {classItem.level} • {classItem.instructor.name}
                      </p>
                      
                      {classItem.recurringSchedule && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            Period: {new Date(classItem.recurringSchedule.startDate).toLocaleDateString()} - {new Date(classItem.recurringSchedule.endDate).toLocaleDateString()}
                          </p>
                          <div className="mt-1">
                            <p className="text-sm text-gray-500">Schedule:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {classItem.recurringSchedule.weeklySchedule.map((schedule, index) => (
                                <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                  {schedule.dayOfWeek} {schedule.startTime}-{schedule.endTime}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      <button
                        onClick={() => generateInstances(classItem._id)}
                        disabled={generating === classItem._id}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generating === classItem._id ? 'Generating...' : 'Generate Instances'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar View */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Class Calendar</h2>
            <div className="text-sm text-gray-500">
              Admin view - Click classes to cancel or manage
            </div>
          </div>
          
          <ClassCalendar isAdmin={true} />
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Create recurring classes in the Sanity Studio with schedules</li>
            <li>• Use "Generate Instances" to create bookable class instances from recurring classes</li>
            <li>• Click on calendar events to cancel individual classes or entire series</li>
            <li>• Green classes are available, yellow are full, red are cancelled</li>
            <li>• Students can book classes through the calendar or classes page</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
