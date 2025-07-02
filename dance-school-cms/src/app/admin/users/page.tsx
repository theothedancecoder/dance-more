'use client';

import { useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { promoteToAdmin, demoteToStudent, listAllUsers } from '@/lib/admin-utils-client';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await listAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToAdmin = async (email: string) => {
    try {
      const success = await promoteToAdmin(email);
      if (success) {
        setMessage({ type: 'success', text: `User ${email} promoted to admin successfully` });
        loadUsers(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: `Failed to promote ${email} to admin` });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred while promoting user' });
    }
  };

  const handleDemoteToStudent = async (email: string) => {
    try {
      const success = await demoteToStudent(email);
      if (success) {
        setMessage({ type: 'success', text: `User ${email} demoted to student successfully` });
        loadUsers(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: `Failed to demote ${email} to student` });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred while demoting user' });
    }
  };

  // Check if current user is admin (you'll need to implement this check)
  const isCurrentUserAdmin = true; // For now, assuming admin access

  if (!isCurrentUserAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage user roles and permissions</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
            <button 
              onClick={() => setMessage(null)}
              className="ml-4 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
          </div>
          
          {users.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No users found. Users will appear here after they sign up.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === UserRole.ADMIN 
                            ? 'bg-red-100 text-red-800'
                            : user.role === UserRole.INSTRUCTOR
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {user.role !== UserRole.ADMIN ? (
                          <button
                            onClick={() => handlePromoteToAdmin(user.email)}
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            Promote to Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDemoteToStudent(user.email)}
                            className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                          >
                            Demote to Student
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Users automatically get "STUDENT" role when they sign up</li>
            <li>• Click "Promote to Admin" to give a user admin privileges</li>
            <li>• Click "Demote to Student" to remove admin privileges</li>
            <li>• Admin users can access the Sanity Studio and manage content</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
