'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sanityClient } from '@/lib/sanity';
import PaymentsTable from '@/components/PaymentsTable';

interface Transaction {
  _id: string;
  type: 'booking' | 'subscription';
  class?: {
    _id: string;
    title: string;
    price: number;
  };
  pass?: {
    _id: string;
    name: string;
    price: number;
    type: string;
  };
  user: {
    _id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  status: string;
  paymentId: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  email: string;
  createdAt: string;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/status');
        if (!response.ok) {
          router.push('/dashboard');
          return;
        }

        const data = await response.json();
        if (!data.authenticated || data.user.role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        fetchTransactions();
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/dashboard');
      }
    };

    checkAuth();
  }, [router]);

  const fetchTransactions = async () => {
    try {
      const bookings = await sanityClient.fetch(`
        *[_type == "booking"] | order(createdAt desc) {
          _id,
          "type": "booking",
          class->{
            _id,
            title,
            price
          },
          user->{
            _id,
            name,
            firstName,
            lastName,
            email
          },
          status,
          paymentId,
          paymentStatus,
          amount,
          currency,
          email,
          createdAt
        }
      `);

      const subscriptions = await sanityClient.fetch(`
        *[_type == "subscription"] | order(startDate desc) {
          _id,
          "type": "subscription",
          "pass": {
            "_id": passId,
            "name": passName,
            "price": purchasePrice,
            "type": type
          },
          user->{
            _id,
            clerkId,
            name,
            firstName,
            lastName,
            email
          },
          "status": select(isActive == true => "active", "inactive"),
          "paymentId": stripePaymentId,
          "paymentStatus": "completed",
          "amount": purchasePrice,
          "currency": "nok",
          "email": user->email,
          "createdAt": startDate
        }
      `);

      const allTransactions = [...bookings, ...subscriptions].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalRevenue = transactions
    .filter(transaction => transaction.paymentStatus === 'completed')
    .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payments & Bookings</h1>
              <p className="text-gray-600">Manage class bookings and payment transactions</p>
            </div>
            <div className="flex space-x-4">
              <a
                href="/admin"
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Admin</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">kr</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{totalRevenue.toFixed(2)} kr</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">#</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">✓</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Confirmed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {transactions.filter(t => t.status === 'confirmed' || t.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">⏳</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {transactions.filter(t => t.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <PaymentsTable transactions={transactions} />
      </div>
    </div>
  );
}
