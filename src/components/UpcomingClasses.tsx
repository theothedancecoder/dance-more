import { db } from '@/lib/database';
import { User, UserRole } from '@/types';
import { format } from 'date-fns';
import { SanityClass } from '@/types/sanity';

interface UpcomingClassesProps {
  user: User;
  sanityClasses: SanityClass[];
}

export default function UpcomingClasses({ user, sanityClasses }: UpcomingClassesProps) {
  const now = new Date();
  
  // Get user's booked classes (still using local DB for bookings)
  const userBookings = db.getUserBookings(user.id);
  const bookedClassIds = userBookings
    .filter(b => b.status === 'confirmed')
    .map(b => b.classId);
  
  const bookedClasses = bookedClassIds
    .map(id => db.getClass(id))
    .filter(c => c && c.startTime > now)
    .sort((a, b) => a!.startTime.getTime() - b!.startTime.getTime())
    .slice(0, 3);

  // Get all upcoming classes from Sanity
  const allUpcomingClasses = sanityClasses
    .filter(c => new Date(c.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  // Get instructor's classes from Sanity
  const instructorClasses = user.role === UserRole.INSTRUCTOR
    ? sanityClasses
        .filter(c => c.instructor?._id === user.id && new Date(c.startTime) > now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 3)
    : [];

  return (
    <div className="space-y-6">
      {/* User's Booked Classes */}
      {bookedClasses.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Upcoming Classes</h3>
          <div className="space-y-3">
            {bookedClasses.map((classItem) => {
              if (!classItem) return null;
              const instructor = db.getUser(classItem.instructorId);
              return (
                <div key={classItem.id} className="flex items-center justify-between border-l-4 border-blue-500 bg-blue-50 p-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{classItem.title}</h4>
                    <p className="text-sm text-gray-600">
                      {format(classItem.startTime, 'MMM dd, yyyy • h:mm a')} - {format(classItem.endTime, 'h:mm a')}
                    </p>
                    <p className="text-sm text-gray-500">
                      Instructor: {instructor?.name} • {classItem.location}
                    </p>
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                    Booked
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructor's Classes */}
      {user.role === UserRole.INSTRUCTOR && instructorClasses.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Teaching Schedule</h3>
          <div className="space-y-3">
            {instructorClasses.map((classItem) => {
              return (
                <div key={classItem._id} className="flex items-center justify-between border-l-4 border-purple-500 bg-purple-50 p-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{classItem.title}</h4>
                    <p className="text-sm text-gray-600">
                      {format(new Date(classItem.startTime), 'MMM dd, yyyy • h:mm a')} - {format(new Date(classItem.endTime), 'h:mm a')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {classItem.location} • 0/{classItem.capacity} students
                    </p>
                  </div>
                  <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                    Teaching
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Classes to Book */}
      {(user.role === UserRole.STUDENT || user.role === UserRole.ADMIN) && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Classes</h3>
          <div className="space-y-3">
            {allUpcomingClasses.slice(0, 3).map((classItem) => {
              // For Sanity classes, we don't have booking data yet, so we'll show basic info
              return (
                <div key={classItem._id} className="flex items-center justify-between border-l-4 border-gray-300 bg-gray-50 p-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{classItem.title}</h4>
                    <p className="text-sm text-gray-600">
                      {format(new Date(classItem.startTime), 'MMM dd, yyyy • h:mm a')} - {format(new Date(classItem.endTime), 'h:mm a')}
                    </p>
                    <p className="text-sm text-gray-500">
                      Instructor: {classItem.instructor?.name || 'TBA'} • {classItem.location} • {classItem.price} kr
                    </p>
                    <p className="text-sm text-gray-500">
                      0/{classItem.capacity} spots filled
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <button className="rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600">
                      Book Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {allUpcomingClasses.length > 3 && (
            <div className="mt-4 text-center">
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All Classes →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
