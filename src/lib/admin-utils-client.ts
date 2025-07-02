import { User } from '@/types';

// Client-side utility functions that call API routes instead of using server-only imports

export async function listAllUsers(): Promise<User[]> {
  try {
    const response = await fetch('/api/admin/users/manage');
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    const data = await response.json();
    return data.users;
  } catch (error) {
    console.error('Error loading users:', error);
    throw error;
  }
}

export async function promoteToAdmin(email: string): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/users/manage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'promote',
        email,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to promote user');
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    return false;
  }
}

export async function demoteToStudent(email: string): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/users/manage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'demote',
        email,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to demote user');
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error demoting user:', error);
    return false;
  }
}
