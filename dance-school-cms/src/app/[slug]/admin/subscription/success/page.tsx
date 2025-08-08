'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function SubscriptionSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.slug as string;
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      // You could verify the session and get subscription details here
      // For now, we'll just show a success message
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-6">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Subscription Activated!
          </h1>
          
          <p className="text-gray-600 mb-8">
            Thank you for subscribing to our platform. Your subscription has been activated and you now have access to all the features included in your plan.
          </p>
          
          <div className="space-y-4">
            <Link
              href={`/${tenantSlug}/admin/subscription`}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              View Subscription Details
            </Link>
            
            <div className="text-center">
              <Link
                href={`/${tenantSlug}/admin`}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">What's Next?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Set up your Stripe Connect account to receive payments</li>
              <li>• Create your first classes and passes</li>
              <li>• Customize your school's branding</li>
              <li>• Invite students to join your platform</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
