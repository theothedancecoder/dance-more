'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { CalendarIcon, PlusIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ClassData {
  _id: string;
  title: string;
  description: string;
  instructor: {
    _id: string;
    name: string;
    email?: string;
  };
  duration: number;
  capacity: number;
  price: number;
  location: string;
  level: string;
  danceStyle: string;
  isRecurring: boolean;
  singleClassDate?: string;
  recurringSchedule?: {
    startDate: string;
    endDate: string;
    weeklySchedule: Array<{
      dayOfWeek: string;
      startTime: string;
      endTime?: string;
    }>;
  };
  isActive?: boolean;
  _createdAt?: string;
  _updatedAt?: string;
}

interface RepairPreviewResultItem {
  classId: string;
  className: string;
  previewInstancesToCreate?: number;
  previewInstancesToDelete?: number;
  bookedMismatchesRetained?: number;
  bookedDuplicatesRetained?: number;
  message: string;
}

interface RepairPreviewData {
  totalPreviewInstancesToCreate: number;
  totalPreviewInstancesToDelete: number;
  classesProcessed: number;
  message: string;
  results: RepairPreviewResultItem[];
}

export default function ScheduleManagementPage() {
  const params = useParams();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewingRepair, setPreviewingRepair] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [generatingClass, setGeneratingClass] = useState<string | null>(null);
  const [inactiveClasses, setInactiveClasses] = useState<ClassData[]>([]);
  const [repairPreview, setRepairPreview] = useState<RepairPreviewData | null>(null);

  const tenantSlug = params.slug as string;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;

    const fetchClasses = async () => {
      try {
        const response = await fetch('/api/admin/classes', {
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch classes');
        }

        const data = await response.json();
        const allClasses = data.classes || [];
        setClasses(allClasses.filter((cls: ClassData) => cls.isActive !== false));
        setInactiveClasses(allClasses.filter((cls: ClassData) => cls.isActive === false));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [isLoaded, isSignedIn, userId, tenantSlug]);

  const generateInstances = async (classId: string) => {
    setGeneratingClass(classId);
    try {
      const response = await fetch('/api/admin/classes/generate-instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({
          classId,
        }),
      });

      if (!response.ok) {
        if (response.status === 504) {
          throw new Error('Request timed out. The operation may still be processing in the background.');
        }
        throw new Error('Failed to generate instances');
      }

      const result = await response.json();
      alert(`Success! Generated ${result.instancesCreated} instances for this class.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert('Error generating instances: ' + errorMessage);
    } finally {
      setGeneratingClass(null);
    }
  };

  const generateAllInstances = async () => {
    setGenerating(true);
    setRepairPreview(null);
    try {
      const response = await fetch('/api/admin/generate-instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
      });

      if (!response.ok) {
        if (response.status === 504) {
          throw new Error('Request timed out. The operation may still be processing in the background. Please check your calendar to see if instances were created.');
        }
        throw new Error('Failed to generate instances');
      }

      const result = await response.json();
      alert(`Success! Generated ${result.totalInstancesCreated} instances for ${result.classesProcessed} classes.\n\n${result.message || ''}`);

      // Refresh the page to show updated data
      window.location.reload();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert('Error generating instances: ' + errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const repairFutureSchedule = async () => {
    if (!confirm('Repair future schedule? This will create missing future instances and delete unexpected unbooked future instances for recurring classes. Booked mismatches will be kept for safety.')) {
      return;
    }

    setRepairing(true);
    setRepairPreview(null);
    try {
      const response = await fetch('/api/admin/generate-instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({
          repairSchedule: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to repair schedule');
      }

      const result = await response.json();
      alert(
        `Repair complete.\nCreated: ${result.totalInstancesCreated}\nDeleted: ${result.totalInstancesDeleted}\n\n${result.message || ''}`
      );
      window.location.reload();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert('Error repairing schedule: ' + errorMessage);
    } finally {
      setRepairing(false);
    }
  };

  const previewRepairFutureSchedule = async () => {
    setPreviewingRepair(true);
    try {
      const response = await fetch('/api/admin/generate-instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({
          repairSchedule: true,
          dryRun: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to preview schedule repair');
      }

      const result: RepairPreviewData = await response.json();
      setRepairPreview(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert('Error previewing schedule repair: ' + errorMessage);
    } finally {
      setPreviewingRepair(false);
    }
  };

  const hardDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${className}" and all its instances? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/classes/${classId}/hard-delete`, {
        method: 'DELETE',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });

      if (response.ok) {
        alert(`Successfully deleted "${className}" and all its instances.`);
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete class');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Failed to delete class');
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please sign in to access schedule management.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link 
            href={`/${tenantSlug}/admin`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const impactedPreviewResults = repairPreview?.results.filter((item) =>
    (item.previewInstancesToCreate || 0) > 0 ||
    (item.previewInstancesToDelete || 0) > 0 ||
    (item.bookedMismatchesRetained || 0) > 0 ||
    (item.bookedDuplicatesRetained || 0) > 0
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4 sm:py-6 lg:flex-row lg:justify-between lg:items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Schedule Management</h1>
              <p className="text-sm text-gray-500">Manage recurring classes and generate instances</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={generateAllInstances}
                disabled={generating || repairing || previewingRepair}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg flex items-center justify-center space-x-2 ${
                  generating || repairing || previewingRepair
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <CalendarIcon className="h-5 w-5" />
                    <span>Generate All Instances</span>
                  </>
                )}
              </button>
              <button
                onClick={previewRepairFutureSchedule}
                disabled={generating || repairing || previewingRepair}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg flex items-center justify-center space-x-2 ${
                  generating || repairing || previewingRepair
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600'
                } text-white`}
              >
                {previewingRepair ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Previewing...</span>
                  </>
                ) : (
                  <>
                    <CalendarIcon className="h-5 w-5" />
                    <span>Preview Repair</span>
                  </>
                )}
              </button>
              <button
                onClick={repairFutureSchedule}
                disabled={generating || repairing || previewingRepair}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg flex items-center justify-center space-x-2 ${
                  generating || repairing || previewingRepair
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700'
                } text-white`}
              >
                {repairing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Repairing...</span>
                  </>
                ) : (
                  <>
                    <ClockIcon className="h-5 w-5" />
                    <span>Repair Future Schedule</span>
                  </>
                )}
              </button>
              <Link
                href={`/${tenantSlug}/admin/classes/new`}
                className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Create New Class</span>
              </Link>
              <Link
                href={`/${tenantSlug}/admin`}
                className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-center"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {repairPreview && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-amber-200 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-amber-900">Repair Preview</h2>
                <p className="mt-1 text-sm text-amber-800">{repairPreview.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setRepairPreview(null)}
                className="rounded-md px-2 py-1 text-sm text-amber-700 hover:bg-amber-100"
              >
                Dismiss
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-3 sm:px-6">
              <div className="rounded-md bg-white px-4 py-3 shadow-sm">
                <p className="text-sm text-gray-500">Would create</p>
                <p className="mt-1 text-2xl font-semibold text-green-700">{repairPreview.totalPreviewInstancesToCreate}</p>
              </div>
              <div className="rounded-md bg-white px-4 py-3 shadow-sm">
                <p className="text-sm text-gray-500">Would delete</p>
                <p className="mt-1 text-2xl font-semibold text-red-700">{repairPreview.totalPreviewInstancesToDelete}</p>
              </div>
              <div className="rounded-md bg-white px-4 py-3 shadow-sm">
                <p className="text-sm text-gray-500">Classes checked</p>
                <p className="mt-1 text-2xl font-semibold text-blue-700">{repairPreview.classesProcessed}</p>
              </div>
            </div>

            <div className="px-4 pb-4 sm:px-6">
              {impactedPreviewResults.length === 0 ? (
                <div className="rounded-md bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                  No recurring classes need schedule repair.
                </div>
              ) : (
                <div className="overflow-hidden rounded-md bg-white shadow-sm">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <h3 className="text-sm font-medium text-gray-900">Impacted Classes</h3>
                  </div>
                  <ul className="divide-y divide-gray-200">
                    {impactedPreviewResults.map((item) => (
                      <li key={item.classId} className="px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{item.className}</p>
                            <p className="text-sm text-gray-500">{item.message}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {(item.previewInstancesToCreate || 0) > 0 && (
                              <span className="rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-800">
                                Create {item.previewInstancesToCreate}
                              </span>
                            )}
                            {(item.previewInstancesToDelete || 0) > 0 && (
                              <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-800">
                                Delete {item.previewInstancesToDelete}
                              </span>
                            )}
                            {(item.bookedMismatchesRetained || 0) > 0 && (
                              <span className="rounded-full bg-yellow-100 px-2.5 py-1 font-medium text-yellow-800">
                                Keep booked mismatches {item.bookedMismatchesRetained}
                              </span>
                            )}
                            {(item.bookedDuplicatesRetained || 0) > 0 && (
                              <span className="rounded-full bg-yellow-100 px-2.5 py-1 font-medium text-yellow-800">
                                Keep booked duplicates {item.bookedDuplicatesRetained}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {classes.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first class.
            </p>
            <div className="mt-6">
              <Link
                href={`/${tenantSlug}/admin/classes/new`}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Create Class
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {classes.map((classItem) => (
                <li key={classItem._id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <CalendarIcon className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="ml-3 sm:ml-4 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base sm:text-lg font-medium text-blue-600 break-words">
                              {classItem.title}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (classItem.isActive !== false)
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {(classItem.isActive !== false) ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="mt-2 flex items-start text-sm text-gray-500">
                            <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400 mt-0.5" />
                            <p className="break-words leading-relaxed">
                              {classItem.isRecurring ? (
                                classItem.recurringSchedule?.weeklySchedule?.length ? (
                                  classItem.recurringSchedule.weeklySchedule.map((schedule, index) => (
                                    <span key={index} className="capitalize">
                                      {schedule.dayOfWeek}s at {schedule.startTime}
                                      {schedule.endTime && ` - ${schedule.endTime}`}
                                      {index < (classItem.recurringSchedule?.weeklySchedule?.length || 0) - 1 ? ', ' : ''}
                                    </span>
                                  ))
                                ) : (
                                  'Recurring class - no schedule set'
                                )
                              ) : (
                                classItem.singleClassDate ?
                                  `Single class on ${new Date(classItem.singleClassDate).toLocaleDateString()} at ${new Date(classItem.singleClassDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` :
                                  'No schedule set'
                              )} • {classItem.duration} min •
                              Capacity: {classItem.capacity} •
                              Level: {classItem.level} •
                              Style: {classItem.danceStyle} •
                              Instructor: {classItem.instructor?.name || 'No instructor assigned'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => generateInstances(classItem._id)}
                          disabled={generatingClass === classItem._id}
                          className={`w-full px-3 py-2 rounded text-sm flex items-center justify-center space-x-1 ${
                            generatingClass === classItem._id
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700'
                          } text-white`}
                        >
                          {generatingClass === classItem._id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              <span>Generating...</span>
                            </>
                          ) : (
                            <span>Generate Instances</span>
                          )}
                        </button>
                        <Link
                          href={`/${tenantSlug}/admin/classes/${classItem._id}/edit`}
                          className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 text-center"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => hardDeleteClass(classItem._id, classItem.title)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Hard Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Inactive Classes Section */}
        {inactiveClasses.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Inactive Classes (Deleted)</h2>
            <p className="text-sm text-gray-600 mb-4">
              These classes have been deactivated but their instances may still appear in the calendar.
              Use &quot;Hard Delete&quot; to permanently remove them and all their instances.
            </p>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {inactiveClasses.map((classItem) => (
                  <li key={classItem._id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <CalendarIcon className="h-8 w-8 text-red-500" />
                          </div>
                          <div className="ml-3 sm:ml-4 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base sm:text-lg font-medium text-red-600 break-words">
                                {classItem.title}
                              </p>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Inactive - Deleted
                              </span>
                            </div>
                            <div className="mt-2 flex items-start text-sm text-gray-500">
                              <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400 mt-0.5" />
                              <p className="break-words leading-relaxed">
                                {classItem.isRecurring ? (
                                  classItem.recurringSchedule?.weeklySchedule?.length ? (
                                    classItem.recurringSchedule.weeklySchedule.map((schedule, index) => (
                                      <span key={index} className="capitalize">
                                        {schedule.dayOfWeek}s at {schedule.startTime}
                                        {schedule.endTime && ` - ${schedule.endTime}`}
                                        {index < (classItem.recurringSchedule?.weeklySchedule?.length || 0) - 1 ? ', ' : ''}
                                      </span>
                                    ))
                                  ) : (
                                    'Recurring class - no schedule set'
                                  )
                                ) : (
                                  classItem.singleClassDate ?
                                    `Single class on ${new Date(classItem.singleClassDate).toLocaleDateString()} at ${new Date(classItem.singleClassDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` :
                                    'No schedule set'
                                )} • {classItem.duration} min •
                                Capacity: {classItem.capacity} •
                                Level: {classItem.level} •
                                Style: {classItem.danceStyle} •
                                Instructor: {classItem.instructor?.name || 'No instructor assigned'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => hardDeleteClass(classItem._id, classItem.title)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Hard Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/${tenantSlug}/calendar`}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      View Calendar
                    </dt>
                    <dd className="text-sm text-gray-900">
                      See all scheduled class instances
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href={`/${tenantSlug}/admin/classes/new`}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PlusIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Create Class
                    </dt>
                    <dd className="text-sm text-gray-900">
                      Add a new recurring class
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href={`/${tenantSlug}/admin/reports`}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      View Reports
                    </dt>
                    <dd className="text-sm text-gray-900">
                      Class attendance and analytics
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
