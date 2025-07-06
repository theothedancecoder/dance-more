import { db } from '@/lib/database';
import { User, UserRole } from '@/types';
import { format } from 'date-fns';

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
  user: User;
  sanityClasses: ClassInstance[];
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

  // Get all upcoming classes from Sanity (now using class instances)
  const allUpcomingClasses = sanityClasses
    .filter(c => new Date(c.start) > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  // Get instructor's classes from Sanity
  const instructorClasses = user.role === UserRole.INSTRUCTOR
    ? sanityClasses
        .filter(c => c.extendedProps?.instructor === user.name && new Date(c.start) > now)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
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
                      Instructor: {instructor?.name || 'TBA'} • {classItem.location}
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
                <div key={classItem.id} className="flex items-center justify-between border-l-4 border-purple-500 bg-purple-50 p-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{classItem.title}</h4>
                    <p className="text-sm text-gray-600">
                      {format(new Date(classItem.start), 'MMM dd, yyyy • h:mm a')} - {format(new Date(classItem.end), 'h:mm a')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {classItem.extendedProps?.location} • {classItem.extendedProps?.bookingCount || 0}/{classItem.extendedProps?.capacity} students
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
              const isAvailable = classItem.extendedProps?.isBookable;
              const isFull = classItem.extendedProps?.remainingCapacity === 0;
              const isCancelled = classItem.extendedProps?.isCancelled;
              
              return (
                <div key={classItem.id} className={`flex items-center justify-between border-l-4 p-3 ${
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
                      Instructor: {classItem.extendedProps?.instructor || 'TBA'} • {classItem.extendedProps?.location} • {classItem.extendedProps?.price} kr
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
                      <button className="rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600">
                        Book Now
                      </button>
                    )}
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
