'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function StripeReturnPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.slug as string;
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error' | 'pending'>('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check Stripe Connect status after return
    checkStripeStatus();
  }, []);

  const checkStripeStatus = async () => {
    try {
      const response = await fetch('/api/stripe/connect/status', {
        headers: {
          'x-tenant-slug': tenantSlug,
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.connected && data.chargesEnabled && data.payoutsEnabled) {
          setStatus('success');
          setMessage('Your Stripe Connect account has been successfully set up! You can now receive payments directly to your bank account.');
        } else if (data.connected && data.onboardingCompleted) {
          setStatus('success');
          setMessage('Your Stripe Connect account is set up and ready to receive payments.');
        } else if (data.connected) {
          setStatus('pending');
          setMessage('Your Stripe Connect account is being reviewed. You may need to complete additional verification steps.');
        } else {
          setStatus('error');
          setMessage('There was an issue setting up your Stripe Connect account. Please try again.');
        }
      } else {
        setStatus('error');
        setMessage('Unable to verify your Stripe Connect status. Please check your connection and try again.');
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
      setStatus('error');
      setMessage('An error occurred while checking your account status.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push(`/${tenantSlug}/admin/payments`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verifying Your Account
            </h2>
            <p className="text-gray-600">
              Please wait while we check your Stripe Connect setup...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === 'success' && (
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
          )}
          
          {status === 'error' && (
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          )}
          
          {status === 'pending' && (
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
          )}
          
          <h2 className={`text-xl font-semibold mb-4 ${
            status === 'success' ? 'text-gray-900' :
            status === 'error' ? 'text-red-900' :
            'text-yellow-900'
          }`}>
            {status === 'success' && 'Account Setup Complete!'}
            {status === 'error' && 'Setup Issue'}
            {status === 'pending' && 'Setup In Progress'}
          </h2>
          
          <p className={`mb-6 ${
            status === 'success' ? 'text-gray-600' :
            status === 'error' ? 'text-red-600' :
            'text-yellow-600'
          }`}>
            {message}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                status === 'success' 
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {status === 'success' ? 'Continue to Payments' : 'Return to Payments'}
            </button>
            
            {status === 'error' && (
              <button
                onClick={checkStripeStatus}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Check Status Again
              </button>
            )}
          </div>
          
          {status === 'pending' && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 mb-1">
                What's Next?
              </h3>
              <p className="text-sm text-yellow-700">
                Stripe may need additional information to verify your account. 
                Check your email for any verification requests from Stripe.
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 mb-1">
                🎉 You're All Set!
              </h3>
              <p className="text-sm text-green-700">
                Your students can now purchase classes and passes, and payments will go directly to your bank account with our subscription model - no transaction fees!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
