import { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

function PaymentSuccessContent() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Payment Successful!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your class booking has been confirmed. You will receive a confirmation email shortly.
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            What's next?
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">✓</span>
              Check your email for booking confirmation and class details
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">✓</span>
              View your upcoming classes in your dashboard
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">✓</span>
              Arrive 10 minutes early to your first class
            </li>
          </ul>
        </div>

        <div className="flex flex-col space-y-3">
          <Link
            href="/dashboard"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/classes"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Browse More Classes
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
