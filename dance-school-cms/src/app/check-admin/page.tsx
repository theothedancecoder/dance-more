'use client';

import { useUser, SignInButton, SignOutButton } from '@clerk/nextjs';
import { useState } from 'react';

export default function CheckAdminPage() {
  const { user, isLoaded } = useUser();
  const [result, setResult] = useState<string>('');

  const checkRole = () => {
    if (!user) {
      setResult('No user logged in - please sign in first');
      return;
    }

    const email = user.emailAddresses[0]?.emailAddress;
    const role = user.publicMetadata?.role;
    
    setResult(`
      Email: ${email}
      Current Role in Clerk: ${role || 'Not set'}
      Expected Role: ${email === 'dancation@gmail.com' ? 'admin' : 'student'}
      
      ${email === 'dancation@gmail.com' ? 'This email should have admin access!' : 'This email will have student access.'}
    `);
  };

  const promoteToAdmin = async () => {
    if (!user) {
      setResult('Please sign in first');
      return;
    }

    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.emailAddresses[0]?.emailAddress })
      });

      const data = await response.json();
      if (response.ok) {
        setResult('Successfully promoted to admin! Please refresh the page and try accessing /admin');
        // Force a page reload to refresh the user data
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`Error: ${error}`);
    }
  };

  if (!isLoaded) {
    return <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
      <div>Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Admin Role Checker & Fixer</h1>
        
        {!user ? (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <p className="mb-4">You need to sign in first to check your admin status.</p>
            <SignInButton mode="modal">
              <button className="bg-blue-600 text-white px-4 py-2 rounded">
                Sign In
              </button>
            </SignInButton>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <p className="mb-4">Signed in as: {user.emailAddresses[0]?.emailAddress}</p>
            
            <div className="space-x-4 mb-4">
              <button
                onClick={checkRole}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Check Current Role
              </button>
              
              <button
                onClick={promoteToAdmin}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Promote Current User to Admin
              </button>
              
              <SignOutButton>
                <button className="bg-red-600 text-white px-4 py-2 rounded">
                  Sign Out
                </button>
              </SignOutButton>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            <pre className="whitespace-pre-wrap">{result}</pre>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <a href="/admin" className="text-blue-600 hover:underline text-lg">
              → Go to Admin Dashboard
            </a>
            <p className="text-sm text-gray-600">
              (You need to be signed in as admin to access this)
            </p>
          </div>
          
          <div>
            <a href="/dashboard" className="text-blue-600 hover:underline text-lg">
              → Go to Student Dashboard
            </a>
            <p className="text-sm text-gray-600">
              (Available to all signed-in users)
            </p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Instructions:</h3>
          <ol className="list-decimal list-inside text-sm text-yellow-700 mt-2 space-y-1">
            <li>Sign in with your account (dancation@gmail.com for admin access)</li>
            <li>Click "Check Current Role" to see your current status</li>
            <li>If you're not admin, click "Promote Current User to Admin"</li>
            <li>Wait for the page to refresh, then go to Admin Dashboard</li>
            <li>You should now see the "Passes & Clipcards" section</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
