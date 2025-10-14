'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface PaymentButtonProps {
  classId: string;
  price: number;
  title: string;
  selectedDateTime?: string;
}

export default function PaymentButton({ classId, price, title, selectedDateTime }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const { user, isSignedIn } = useUser();

  const handlePayment = async () => {
    if (!isSignedIn) {
      window.location.href = '/sign-in';
      return;
    }

    if (!selectedDateTime) {
      alert('Please select a class session time before booking.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          selectedDateTime,
          successUrl: `${window.location.origin}/payment/success`,
          cancelUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : (
        `Book Now - ${price} kr`
      )}
    </button>
  );
}
