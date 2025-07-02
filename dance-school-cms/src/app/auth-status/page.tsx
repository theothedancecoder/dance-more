import { currentUser } from '@clerk/nextjs/server';
import { getServerUser, getAdminEmails } from '@/lib/auth';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default async function AuthStatusPage() {
  const clerkUser = await currentUser();
  const serverUser = await getServerUser();
  const adminEmails = getAdminEmails();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Authentication Status</h1>
          {clerkUser && <UserButton afterSignOutUrl="/auth-status" />}
        </div>

        <div className="grid gap-6">
          {/* Clerk User Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Clerk User Information</h2>
            {clerkUser ? (
              <div className="space-y-2">
                <p><strong>ID:</strong> {clerkUser.id}</p>
                <p><strong>Email:</strong> {clerkUser.emailAddresses[0]?.emailAddress}</p>
                <p><strong>Name:</strong> {clerkUser.firstName} {clerkUser.lastName}</p>
                <p><strong>Created:</strong> {new Date(clerkUser.createdAt).toLocaleString()}</p>
                <p><strong>Metadata Role:</strong> {clerkUser.publicMetadata?.role as string || 'Not set'}</p>
              </div>
            ) : (
              <p className="text-gray-600">Not signed in</p>
            )}
          </div>

          {/* Server User Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Server User Information</h2>
            {serverUser ? (
              <div className="space-y-2">
                <p><strong>Email:</strong> {serverUser.email}</p>
                <p><strong>Name:</strong> {serverUser.name}</p>
                <p><strong>Role:</strong> <span className={`px-2 py-1 rounded text-sm ${
                  serverUser.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>{serverUser.role}</span></p>
              </div>
            ) : (
              <p className="text-gray-600">Not signed in</p>
            )}
          </div>

          {/* Admin Configuration */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Admin Configuration</h2>
            <div className="space-y-2">
              <p><strong>Admin Emails:</strong></p>
              <ul className="list-disc list-inside ml-4">
                {adminEmails.map((email, index) => (
                  <li key={index} className="text-sm">{email}</li>
                ))}
              </ul>
              {serverUser && (
                <p className="mt-4">
                  <strong>Current User Admin Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    serverUser.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {serverUser.role === 'admin' ? 'IS ADMIN' : 'NOT ADMIN'}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-4">
              {!clerkUser ? (
                <div>
                  <p className="mb-2">You need to sign in to access admin features.</p>
                  <Link href="/sign-in" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Sign In
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {serverUser?.role === 'admin' ? (
                    <div>
                      <p className="text-green-600 font-medium mb-2">✅ You have admin access!</p>
                      <Link href="/admin" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-2">
                        Go to Admin Dashboard
                      </Link>
                      <Link href="/admin/passes" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        Manage Passes & Clipcards
                      </Link>
                    </div>
                  ) : (
                    <div>
                      <p className="text-red-600 font-medium mb-2">❌ You don't have admin access</p>
                      <p className="text-sm text-gray-600 mb-2">
                        Your email ({serverUser?.email}) is not in the admin list.
                      </p>
                      <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        Go to Student Dashboard
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-yellow-800">How to Get Admin Access</h2>
            <div className="text-sm text-yellow-700 space-y-2">
              <p>Admin access is now controlled by the <code>ADMIN_EMAILS</code> environment variable.</p>
              <p>To add admin access for an email:</p>
              <ol className="list-decimal list-inside ml-4 space-y-1">
                <li>Add the email to the <code>ADMIN_EMAILS</code> environment variable in <code>.env.local</code></li>
                <li>Restart the development server</li>
                <li>Sign in with that email</li>
                <li>You'll automatically have admin access</li>
              </ol>
              <p className="mt-4">
                <strong>Current admin emails:</strong> {adminEmails.join(', ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
