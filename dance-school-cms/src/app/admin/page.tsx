import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { sanityClient } from '@/lib/sanity';
import AdminDashboard from '@/components/AdminDashboard';

async function getAdminStats() {
  try {
    // Get total users
    const totalUsers = await sanityClient.fetch(`count(*[_type == "user"])`);
    
    // Get active classes (class templates that are active)
    const activeClasses = await sanityClient.fetch(`count(*[_type == "class" && isActive == true])`);
    
    // Get active subscriptions
    const activeSubscriptions = await sanityClient.fetch(`count(*[_type == "subscription" && isActive == true])`);
    
    // Get this week's class instances
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const thisWeeksClasses = await sanityClient.fetch(`
      count(*[_type == "classInstance" && 
        dateTime >= "${startOfWeek.toISOString()}" && 
        dateTime <= "${endOfWeek.toISOString()}"])
    `);
    
    // Get monthly revenue (current month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    const monthlyRevenue = await sanityClient.fetch(`
      *[_type == "subscription" && 
        startDate >= "${startOfMonth.toISOString()}" && 
        startDate <= "${endOfMonth.toISOString()}" &&
        isActive == true] {
        purchasePrice
      }
    `);
    
    const totalMonthlyRevenue = monthlyRevenue.reduce((sum: number, sub: any) => sum + (sub.purchasePrice || 0), 0);
    
    // Return plain serializable object
    return {
      totalUsers: Number(totalUsers) || 0,
      activeClasses: Number(activeClasses) || 0,
      activeSubscriptions: Number(activeSubscriptions) || 0,
      thisWeeksClasses: Number(thisWeeksClasses) || 0,
      monthlyRevenue: Number(totalMonthlyRevenue) || 0,
      systemStatus: 'Healthy'
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return {
      totalUsers: 0,
      activeClasses: 0,
      activeSubscriptions: 0,
      thisWeeksClasses: 0,
      monthlyRevenue: 0,
      systemStatus: 'Error'
    };
  }
}

export default async function AdminPage() {
  const user = await getServerUser();
  
  // Restrict global admin access to only theothecoder@gmail.com
  const allowedGlobalAdmin = 'theothecoder@gmail.com';
  const userEmail = user?.clerkUser?.emailAddresses?.[0]?.emailAddress || user?.email || '';
  
  if (!user || user.role !== 'admin' || userEmail !== allowedGlobalAdmin) {
    redirect('/dashboard');
  }

  const stats = await getAdminStats();

  // Create a plain object with only the necessary user data
  const userData = {
    fullName: user.clerkUser?.firstName && user.clerkUser?.lastName 
      ? `${user.clerkUser.firstName} ${user.clerkUser.lastName}`.trim()
      : user.name || 'Admin',
    firstName: user.clerkUser?.firstName || user.name || 'Admin'
  };

  return <AdminDashboard stats={stats} user={userData} />;
}
