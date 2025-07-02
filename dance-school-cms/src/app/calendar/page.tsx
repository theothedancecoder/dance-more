import ClassCalendar from '@/components/ClassCalendar';
import Link from 'next/link';

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Class Schedule</h1>
              <p className="text-gray-600 mt-2">
                Browse and book available dance classes. Classes can be booked with an active subscription or clipcard.
              </p>
            </div>
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow hover:bg-gray-50 transition-colors text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <ClassCalendar />
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Class Booking Guide</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Green classes are available for booking</li>
            <li>• Yellow classes are fully booked</li>
            <li>• Red classes have been cancelled</li>
            <li>• You need an active subscription or clipcard to book classes</li>
            <li>• Monthly subscriptions allow unlimited bookings</li>
            <li>• Clipcards provide 10 classes valid for 2 months</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
