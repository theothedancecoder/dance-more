'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function ClearSessionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [showSignOut, setShowSignOut] = useState(false);
  const { signOut } = useAuth();

  const handleClearSession = async () => {
    setIsLoading(true);
    setMessage(null);
    setNextSteps([]);

    try {
      // Call our API to unlink session
      const response = await fetch('/api/debug/clear-session', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setNextSteps(data.nextSteps || []);
        setShowSignOut(true);
      } else {
        setMessage(data.error || 'Failed to clear session');
      }
    } catch (err) {
      setMessage('An error occurred while clearing session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut({
        // Redirect to sign-in after signing out
        redirectUrl: '/sign-in'
      });
    } catch (err) {
      setMessage('Error signing out. Please try again.');
    }
  };

  const manualInstructions = [
    '1. Open browser Developer Tools (F12)',
    '2. Go to Application/Storage tab',
    '3. Clear all cookies for localhost:3001',
    '4. Clear Local Storage and Session Storage',
    '5. Close all browser tabs for this site',
    '6. Open a new browser window',
    '7. Navigate to http://localhost:3001'
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-red-600">
          🔧 Debug: Clear Session
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Fix "bachatacity" or other old tenant redirects
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* Problem Description */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-semibold text-yellow-800 mb-2">Problem:</h3>
            <p className="text-yellow-700 text-sm">
              If you're seeing redirects to "bachatacity" or other old tenant names, 
              this is due to cached session data in your browser from previous testing.
            </p>
          </div>

          {/* Solution 1: Automatic Clear */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Solution 1: Automatic Clear (Recommended)</h3>
            
            {!showSignOut ? (
              <button
                onClick={handleClearSession}
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Clearing Session...' : 'Step 1: Clear Session Data'}
              </button>
            ) : (
              <button
                onClick={handleSignOut}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Step 2: Sign Out & Complete Reset
              </button>
            )}
          </div>

          {/* Success Message */}
          {message && (
            <div className={`mb-6 p-4 rounded border ${
              message.includes('error') || message.includes('Error') 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <p className="font-semibold">{message}</p>
              {nextSteps.length > 0 && (
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  {nextSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Solution 2: Manual Clear */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Solution 2: Manual Clear</h3>
            <div className="bg-gray-50 p-4 rounded border">
              <p className="text-sm text-gray-600 mb-2">If the automatic method doesn't work:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                {manualInstructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* After Clearing Instructions */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold text-blue-800 mb-2">After clearing session:</h3>
            <p className="text-blue-700 text-sm">
              Navigate to <code className="bg-blue-100 px-1 rounded">http://localhost:3001</code> 
              and try registering a new dance school. The redirect should now work correctly 
              with path-based URLs (e.g., <code className="bg-blue-100 px-1 rounded">localhost:3001/your-school-name</code>).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
