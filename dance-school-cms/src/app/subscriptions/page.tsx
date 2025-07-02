'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface Subscription {
  _id: string;
  type: 'single' | 'multi-pass' | 'clipcard' | 'monthly';
  startDate: string;
  endDate: string;
  remainingClips?: number;
  isActive: boolean;
  passName?: string;
  purchasePrice?: number;
}

interface Pass {
  _id: string;
  name: string;
  description: string;
  type: 'single' | 'multi-pass' | 'multi' | 'unlimited';
  price: number;
  validityDays: number;
  classesLimit?: number;
  isActive: boolean;
}

interface Booking {
  _id: string;
  date: string;
  parentClass: {
    title: string;
    instructor: { name: string };
    danceStyle: string;
    location: string;
  };
  userBooking: {
    bookingType: string;
    bookingTime: string;
  };
}

const getSubscriptionDisplayName = (type: string): string => {
  const displayNames = {
    single: 'Single Class Pass',
    'multi-pass': 'Multi-Class Pass',
    clipcard: 'Clipcard',
    monthly: 'Monthly Pass',
  };
  return displayNames[type as keyof typeof displayNames] || type;
};

export default function SubscriptionsPage() {
  const { user, isLoaded } = useUser();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [availablePasses, setAvailablePasses] = useState<Pass[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      fetchSubscriptionsAndPasses();
      fetchBookings();
    }

    // Handle success/cancel messages from Stripe redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      alert('Payment successful! Your pass has been activated.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('canceled') === 'true') {
      alert('Payment was canceled. You can try again anytime.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isLoaded, user]);

  const fetchSubscriptionsAndPasses = async () => {
    try {
      const response = await fetch('/api/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions);
        setAvailablePasses(data.availablePasses);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings');
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchasePass = async (passId: string, passName: string) => {
    try {
      // Create Stripe checkout session
      const response = await fetch('/api/stripe/checkout-pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passId,
          successUrl: `${window.location.origin}/subscriptions?success=true`,
          cancelUrl: `${window.location.origin}/subscriptions?canceled=true`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url; // Redirect to Stripe Checkout
      }
    } catch (error) {
      console.error('Error initiating pass purchase:', error);
      alert('Failed to initiate pass purchase. Please try again.');
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
          <p className="text-gray-600">You need to be signed in to view your subscriptions.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const activeSubscriptions = subscriptions.filter(sub => 
    sub.isActive && new Date(sub.endDate) > now
  );

  const upcomingBookings = bookings.filter(booking => 
    new Date(booking.date) > now
  ).slice(0, 5);

  const pastBookings = bookings.filter(booking => 
    new Date(booking.date) <= now
  ).slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Subscriptions</h1>
              <p className="text-gray-600 mt-2">Manage your subscriptions and view your bookings</p>
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

        {/* Active Subscriptions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Active Subscriptions</h2>
          
          {activeSubscriptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You don&apos;t have any active subscriptions.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {availablePasses.map((pass) => (
                  <div key={pass._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-lg mb-2">{pass.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{pass.description}</p>
                    <div className="space-y-1 text-sm text-gray-500 mb-4">
                      <p><strong>{pass.price} kr</strong></p>
                      {(pass.type === 'multi-pass' || pass.type === 'multi') && (
                        <p>{pass.classesLimit} classes</p>
                      )}
                      <p>Valid for {pass.validityDays} days</p>
                    </div>
                    <button
                      onClick={() => purchasePass(pass._id, pass.name)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      Buy Now - {pass.price} kr
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeSubscriptions.map((subscription) => (
                <div key={subscription._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {subscription.passName || getSubscriptionDisplayName(subscription.type)}
                      </h3>
                      <p className="text-gray-600">
                        Valid until: {new Date(subscription.endDate).toLocaleDateString()}
                      </p>
                      {['single', 'multi-pass', 'clipcard'].includes(subscription.type) && (
                        <p className="text-blue-600 font-medium">
                          {subscription.remainingClips} {subscription.remainingClips === 1 ? 'class' : 'classes'} remaining
                        </p>
                      )}
                      {subscription.purchasePrice && (
                        <p className="text-sm text-gray-500">
                          Purchased for {subscription.purchasePrice} kr
                        </p>
                      )}
                    </div>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                      Active
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">Need more classes?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availablePasses.map((pass) => (
                    <button
                      key={pass._id}
                      onClick={() => purchasePass(pass._id, pass.name)}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      Buy {pass.name} - {pass.price} kr
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Bookings */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upcoming Classes</h2>
          
          {upcomingBookings.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No upcoming bookings</p>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={booking._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{booking.parentClass.title}</h3>
                      <p className="text-gray-600">{booking.parentClass.danceStyle}</p>
                      <p className="text-sm text-gray-500">
                        Instructor: {booking.parentClass.instructor.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Location: {booking.parentClass.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {new Date(booking.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(booking.date).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      <span className="inline-block mt-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {booking.userBooking.bookingType}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Classes</h2>
            <div className="space-y-3">
              {pastBookings.map((booking) => (
                <div key={booking._id} className="border border-gray-200 rounded-lg p-3 opacity-75">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{booking.parentClass.title}</h4>
                      <p className="text-sm text-gray-500">
                        {booking.parentClass.danceStyle} • {booking.parentClass.instructor.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(booking.date).toLocaleDateString()}
                      </p>
                      <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                        Completed
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
