import Link from 'next/link';
import { User, UserRole } from '@/types';
import { 
  PlusIcon, 
  CalendarIcon, 
  UserGroupIcon, 
  CreditCardIcon,
  ChartBarIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

interface QuickActionsProps {
  user: User;
}

interface Action {
  name: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export default function QuickActions({ user }: QuickActionsProps) {
  const adminActions: Action[] = [
    {
      name: 'Create Class',
      description: 'Add a new dance class',
      href: '/admin/classes/new',
      icon: PlusIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      name: 'Manage Users',
      description: 'View and manage users',
      href: '/admin/users',
      icon: UserGroupIcon,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      name: 'View Reports',
      description: 'Analytics and reports',
      href: '/admin/reports',
      icon: ChartBarIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      name: 'Payments',
      description: 'Manage payments and subscriptions',
      href: '/admin/payments',
      icon: CreditCardIcon,
      color: 'bg-yellow-500 hover:bg-yellow-600',
    },
  ];

  const studentActions: Action[] = [
    {
      name: 'Browse Classes',
      description: 'Find and book classes',
      href: '/student/classes',
      icon: CalendarIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      name: 'My Bookings',
      description: 'View your bookings',
      href: '/student/bookings',
      icon: BookOpenIcon,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      name: 'Buy Pass',
      description: 'Purchase class passes',
      href: '/student/passes',
      icon: CreditCardIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  const instructorActions: Action[] = [
    {
      name: 'My Classes',
      description: 'Manage your classes',
      href: '/instructor/classes',
      icon: CalendarIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      name: 'Class Roster',
      description: 'View student attendance',
      href: '/instructor/roster',
      icon: UserGroupIcon,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      name: 'Schedule',
      description: 'View your teaching schedule',
      href: '/instructor/schedule',
      icon: BookOpenIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  let actions: Action[] = [];
  if (user.role === UserRole.ADMIN) {
    actions = adminActions;
  } else if (user.role === UserRole.STUDENT) {
    actions = studentActions;
  } else if (user.role === UserRole.INSTRUCTOR) {
    actions = instructorActions;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.name}
              href={action.href}
              className={`${action.color} group relative rounded-lg p-4 text-white transition-colors`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="h-6 w-6 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">{action.name}</h4>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
