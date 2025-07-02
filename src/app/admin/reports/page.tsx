import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { sanityClient } from '@/lib/sanity';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

interface ReportData {
  totalRevenue: number;
  totalBookings: number;
  activeClasses: number;
  totalUsers: number;
  revenueByMonth: Array<{ month: string; revenue: number; bookings: number }>;
  popularClasses: Array<{ title: string; bookings: number; revenue: number }>;
  recentActivity: Array<{
    type: string;
    description: string;
    date: string;
    amount?: number;
  }>;
}

async function getReportData(): Promise<ReportData> {
  try {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);

    // Get all bookings
    const bookings = await sanityClient.fetch(`
      *[_type == "booking"] {
        _id,
        class->{
          _id,
          title,
          price
        },
        user->{
          _id,
          name,
          email
        },
        status,
        paymentStatus,
        amount,
        currency,
        createdAt
      }
    `);

    // Get all classes with count
    const classesCount = await sanityClient.fetch(`
      count(*[_type == "class" && isActive == true])
    `);

    // Get all users with count
    const usersCount = await sanityClient.fetch(`
      count(*[_type == "user"])
    `);

    // Get classes for popular classes list
    const classes = await sanityClient.fetch(`
      *[_type == "class" && isActive == true] {
        _id,
        title
      }
    `);

    // Get recent users for activity feed
    const recentUsers = await sanityClient.fetch(`
      *[_type == "user"] | order(createdAt desc)[0...5] {
        _id,
        name,
        createdAt
      }
    `);

    // Calculate metrics
    const completedBookings = bookings.filter((b: any) => b.paymentStatus === 'completed');
    const totalRevenue = completedBookings.reduce((sum: number, b: any) => sum + (b.amount || 0), 0) / 100;
    const totalBookings = bookings.length;
    const activeClasses = classes.length;
    const totalUsers = users.length;

    // Revenue by month (last 6 months)
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subDays(now, i * 30));
      const monthEnd = endOfMonth(monthStart);
      const monthBookings = completedBookings.filter((b: any) => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      });
      
      revenueByMonth.push({
        month: format(monthStart, 'MMM yyyy'),
        revenue: monthBookings.reduce((sum: number, b: any) => sum + (b.amount || 0), 0) / 100,
        bookings: monthBookings.length
      });
    }

    // Popular classes
    const classBookings: Record<string, { title: string; bookings: number; revenue: number }> = {};
    completedBookings.forEach((booking: any) => {
      const classId = booking.class?._id;
      const classTitle = booking.class?.title || 'Unknown Class';
      if (classId) {
        if (!classBookings[classId]) {
          classBookings[classId] = {
            title: classTitle,
            bookings: 0,
            revenue: 0
          };
        }
        classBookings[classId].bookings++;
        classBookings[classId].revenue += (booking.amount || 0) / 100;
      }
    });

    const popularClasses = Object.values(classBookings)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    // Recent activity
    const recentActivity = [
      ...bookings.slice(-10).map((b: any) => ({
        type: 'booking',
        description: `New booking for ${b.class?.title || 'Unknown Class'} by ${b.user?.name || 'Unknown User'}`,
        date: b.createdAt,
        amount: b.amount ? (b.amount / 100) : undefined
      })),
      ...users.slice(-5).map((u: any) => ({
        type: 'user',
        description: `New user registered: ${u.name}`,
        date: u.createdAt
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    return {
      totalRevenue,
      totalBookings,
      activeClasses,
      totalUsers,
      revenueByMonth,
      popularClasses: popularClasses as any,
      recentActivity
    };
  } catch (error) {
    console.error('Error fetching report data:', error);
    return {
      totalRevenue: 0,
      totalBookings: 0,
      activeClasses: 0,
      totalUsers: 0,
      revenueByMonth: [],
      popularClasses: [],
      recentActivity: []
    };
  }
}

export default async function AdminReportsPage() {
  const user = await getServerUser();
  
  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  const reportData = await getReportData();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600">Business insights and performance metrics</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
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
                <p className="text-2xl font-bold text-gray-900">{reportData.totalRevenue.toFixed(2)} kr</p>
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
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📚</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Classes</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.activeClasses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">👥</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalUsers}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue by Month */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Revenue by Month</h2>
            </div>
            <div className="p-6">
              {reportData.revenueByMonth.length > 0 ? (
                <div className="space-y-4">
                  {reportData.revenueByMonth.map((month, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{month.month}</p>
                        <p className="text-xs text-gray-500">{month.bookings} bookings</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{month.revenue.toFixed(2)} kr</p>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min((month.revenue / Math.max(...reportData.revenueByMonth.map(m => m.revenue))) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No revenue data available</p>
              )}
            </div>
          </div>

          {/* Popular Classes */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Popular Classes</h2>
            </div>
            <div className="p-6">
              {reportData.popularClasses.length > 0 ? (
                <div className="space-y-4">
                  {reportData.popularClasses.map((classItem, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{classItem.title}</p>
                        <p className="text-xs text-gray-500">{classItem.bookings} bookings</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{classItem.revenue.toFixed(2)} kr</p>
                        <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min((classItem.bookings / Math.max(...reportData.popularClasses.map(c => c.bookings))) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No class data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            {reportData.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {reportData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'booking' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {format(new Date(activity.date), 'MMM dd, yyyy HH:mm')}
                        </p>
                        {activity.amount && (
                          <span className="text-xs font-medium text-green-600">
                            +{activity.amount.toFixed(2)} kr
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
