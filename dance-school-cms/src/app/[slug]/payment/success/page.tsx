'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useTenant } from '@/contexts/TenantContext';

function PaymentSuccessContent() {
  const params = useParams();
  const tenantSlug = params.slug as string;
  const { tenant } = useTenant();
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    // Extract payment details from URL parameters if available
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const passId = urlParams.get('pass_id');
    
    if (sessionId || passId) {
      setPaymentDetails({
        sessionId,
        passId,
        timestamp: new Date().toISOString()
      });

      // Trigger subscription sync after successful payment
      if (sessionId && tenant) {
        console.log('🔄 Triggering subscription sync after successful payment...');
        fetch('/api/user/sync-subscriptions', {
          method: 'POST',
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        }).then(response => {
          if (response.ok) {
            console.log('✅ Subscription sync completed after payment');
          } else {
            console.error('❌ Failed to sync subscriptions after payment');
          }
        }).catch(error => {
          console.error('❌ Error syncing subscriptions after payment:', error);
        });
      }
    }
  }, [tenantSlug, tenant]);

  const primaryColor = tenant?.branding?.primaryColor || '#3B82F6';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Payment Successful!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your pass purchase has been confirmed. You can now book classes at {tenant?.schoolName || 'the dance school'}.
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            What's next?
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">✓</span>
              Check your email for purchase confirmation and pass details
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">✓</span>
              Browse and book classes using your new pass
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">✓</span>
              View your active passes and bookings in your account
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">✓</span>
              Arrive 10 minutes early to your first class
            </li>
          </ul>
        </div>

        {paymentDetails && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Payment Details</h4>
            <div className="text-xs text-blue-700 space-y-1">
              {paymentDetails.sessionId && (
                <p><strong>Session ID:</strong> {paymentDetails.sessionId}</p>
              )}
              {paymentDetails.passId && (
                <p><strong>Pass ID:</strong> {paymentDetails.passId}</p>
              )}
              <p><strong>Date:</strong> {new Date(paymentDetails.timestamp).toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-3">
          <Link
            href={`/${tenantSlug}`}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            Go to Dashboard
          </Link>
          <Link
            href={`/${tenantSlug}/classes`}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Browse Classes
          </Link>
          <Link
            href={`/${tenantSlug}/subscriptions`}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View My Passes
          </Link>
        </div>

        {tenant?.schoolName && (
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Welcome to {tenant.schoolName}! We're excited to have you join our dance community.
            </p>
          </div>
        )}
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
