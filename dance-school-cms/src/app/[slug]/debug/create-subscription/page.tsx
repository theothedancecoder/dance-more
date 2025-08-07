'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function CreateSubscriptionDebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const tenantSlug = params.slug as string;

  const createSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to create subscription', details: error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Debug: Create Test Subscription</h1>
          
          <p className="text-gray-600 mb-6">
            This will create a test subscription for your account using the first available pass for this tenant.
          </p>

          <button
            onClick={createSubscription}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Test Subscription'}
          </button>

          {result && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Result:</h2>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> After creating a subscription, go back to the subscriptions page to see it appear in your "Your Active Passes" section.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
