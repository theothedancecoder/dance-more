'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

interface WeeklySchedule {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

interface ClassFormData {
  title: string;
  description: string;
  instructorId?: string;
  instructorName: string;
  capacity: number;
  price: number;
  location: string;
  duration: number;
  level: string;
  category: string;
  isRecurring: boolean;
  isActive: boolean;
  // For single classes
  singleClassDate: string;
  // For recurring classes
  recurringSchedule: {
    startDate: string;
    endDate: string;
    weeklySchedule: WeeklySchedule[];
  };
}

export default function EditClassPage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.slug as string;
  const classId = params.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ClassFormData>({
    title: '',
    description: '',
    instructorName: '',
    capacity: 20,
    price: 25,
    location: '',
    duration: 60,
    level: 'beginner',
    category: 'ballet',
    isRecurring: false,
    isActive: true,
    singleClassDate: '',
    recurringSchedule: {
      startDate: '',
      endDate: '',
      weeklySchedule: []
    }
  });

  // Check authentication and admin role
  if (!isLoaded) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!userId) {
    router.push('/sign-in');
    return null;
  }

  // Fetch class data
  useEffect(() => {
    const fetchClass = async () => {
      try {
        const response = await fetch(`/api/admin/classes/${classId}`, {
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch class');
        }

        const data = await response.json();
        const classData = data.class;

        // Convert the class data to form format
        const singleClassDate = classData.singleClassDate 
          ? new Date(classData.singleClassDate).toISOString().slice(0, 16)
          : '';

        const recurringSchedule = classData.recurringSchedule || {
          startDate: '',
          endDate: '',
          weeklySchedule: []
        };

        // Format dates for form inputs
        if (recurringSchedule.startDate) {
          recurringSchedule.startDate = new Date(recurringSchedule.startDate).toISOString().split('T')[0];
        }
        if (recurringSchedule.endDate) {
          recurringSchedule.endDate = new Date(recurringSchedule.endDate).toISOString().split('T')[0];
        }

        setFormData({
          title: classData.title || '',
          description: classData.description || '',
          instructorId: classData.instructor?._id,
          instructorName: classData.instructor?.name || '',
          capacity: classData.capacity || 20,
          price: classData.price || 25,
          location: classData.location || '',
          duration: classData.duration || 60,
          level: classData.level || 'beginner',
          category: classData.danceStyle || 'ballet',
          isRecurring: classData.isRecurring || false,
          isActive: classData.isActive !== false,
          singleClassDate,
          recurringSchedule
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load class');
      } finally {
        setIsLoading(false);
      }
    };

    if (classId && tenantSlug) {
      fetchClass();
    }
  }, [classId, tenantSlug]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'isRecurring' || name === 'isActive') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
      return;
    }

    if (name.startsWith('recurring.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        recurringSchedule: {
          ...prev.recurringSchedule,
          [field]: value
        }
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const addWeeklySchedule = () => {
    setFormData(prev => ({
      ...prev,
      recurringSchedule: {
        ...prev.recurringSchedule,
        weeklySchedule: [
          ...prev.recurringSchedule.weeklySchedule,
          { dayOfWeek: 'monday', startTime: '09:00', endTime: '10:00' }
        ]
      }
    }));
  };

  const updateWeeklySchedule = (index: number, field: keyof WeeklySchedule, value: string) => {
    setFormData(prev => {
      const newSchedule = [...prev.recurringSchedule.weeklySchedule];
      newSchedule[index] = { ...newSchedule[index], [field]: value };
      return {
        ...prev,
        recurringSchedule: {
          ...prev.recurringSchedule,
          weeklySchedule: newSchedule
        }
      };
    });
  };

  const removeWeeklySchedule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recurringSchedule: {
        ...prev.recurringSchedule,
        weeklySchedule: prev.recurringSchedule.weeklySchedule.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update class');
      }

      const result = await response.json();
      // Redirect to schedule page
      router.push(`/${tenantSlug}/admin/schedule?success=class-updated`);
      router.refresh(); // Force refresh to update data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Edit Class</h1>
            <p className="mt-1 text-sm text-gray-600">
              Update the class details for {tenantSlug}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Class Title *
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                  placeholder="e.g., Beginner Ballet"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  name="description"
                  id="description"
                  required
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                  placeholder="Describe the class, what students will learn, and any prerequisites..."
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category *
                </label>
                <select
                  name="category"
                  id="category"
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                >
                  <option value="ballet">Ballet</option>
                  <option value="jazz">Jazz</option>
                  <option value="hip-hop">Hip Hop</option>
                  <option value="contemporary">Contemporary</option>
                  <option value="tap">Tap</option>
                  <option value="ballroom">Ballroom</option>
                  <option value="latin">Latin</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="level" className="block text-sm font-medium text-gray-700">
                  Level *
                </label>
                <select
                  name="level"
                  id="level"
                  required
                  value={formData.level}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                >
                  <option value="beginner">Beginner</option>
                  <option value="improvers">Improvers</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="all-levels">All Levels</option>
                </select>
              </div>

              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                  Capacity *
                </label>
                <input
                  type="number"
                  name="capacity"
                  id="capacity"
                  required
                  min="1"
                  max="100"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price (kr) *
                </label>
                <input
                  type="number"
                  name="price"
                  id="price"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  name="duration"
                  id="duration"
                  required
                  min="15"
                  max="180"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  required
                  value={formData.location}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                  placeholder="e.g., Studio A, Main Hall"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="instructorName" className="block text-sm font-medium text-gray-700">
                  Instructor Name *
                </label>
                <input
                  type="text"
                  name="instructorName"
                  id="instructorName"
                  required
                  value={formData.instructorName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                  placeholder="Enter instructor name"
                />
              </div>

              <div className="sm:col-span-2 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="isRecurring"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                    Recurring Class
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              {!formData.isRecurring ? (
                <div className="sm:col-span-2">
                  <label htmlFor="singleClassDate" className="block text-sm font-medium text-gray-700">
                    Class Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="singleClassDate"
                    id="singleClassDate"
                    required={!formData.isRecurring}
                    value={formData.singleClassDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                  />
                </div>
              ) : (
                <div className="sm:col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="recurring.startDate" className="block text-sm font-medium text-gray-700">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        name="recurring.startDate"
                        id="recurring.startDate"
                        required={formData.isRecurring}
                        value={formData.recurringSchedule.startDate}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="recurring.endDate" className="block text-sm font-medium text-gray-700">
                        End Date *
                      </label>
                      <input
                        type="date"
                        name="recurring.endDate"
                        id="recurring.endDate"
                        required={formData.isRecurring}
                        value={formData.recurringSchedule.endDate}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Weekly Schedule *
                      </label>
                      <button
                        type="button"
                        onClick={addWeeklySchedule}
                        className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-md hover:bg-blue-100"
                      >
                        Add Time Slot
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {formData.recurringSchedule.weeklySchedule.map((schedule, index) => (
                        <div key={index} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md">
                          <select
                            value={schedule.dayOfWeek}
                            onChange={(e) => updateWeeklySchedule(index, 'dayOfWeek', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                          >
                            <option value="monday">Monday</option>
                            <option value="tuesday">Tuesday</option>
                            <option value="wednesday">Wednesday</option>
                            <option value="thursday">Thursday</option>
                            <option value="friday">Friday</option>
                            <option value="saturday">Saturday</option>
                            <option value="sunday">Sunday</option>
                          </select>
                          
                          <input
                            type="time"
                            value={schedule.startTime}
                            onChange={(e) => updateWeeklySchedule(index, 'startTime', e.target.value)}
                            className="block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                          />
                          
                          <input
                            type="time"
                            value={schedule.endTime}
                            onChange={(e) => updateWeeklySchedule(index, 'endTime', e.target.value)}
                            className="block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                          />
                          
                          <button
                            type="button"
                            onClick={() => removeWeeklySchedule(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      
                      {formData.isRecurring && formData.recurringSchedule.weeklySchedule.length === 0 && (
                        <p className="text-sm text-gray-500 italic">
                          Add at least one weekly time slot
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push(`/${tenantSlug}/admin/schedule`)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Updating...' : 'Update Class'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
