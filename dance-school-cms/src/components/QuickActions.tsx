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
      name: 'Schedule Management',
      description: 'Manage class schedules and instances',
      href: '/admin/schedule',
      icon: CalendarIcon,
      color: 'bg-indigo-500 hover:bg-indigo-600',
    },
    {
      name: 'Manage Users',
      description: 'View and manage users',
      href: '/admin/users',
      icon: UserGroupIcon,
      color: 'bg-green-500 hover:bg-green-600',
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
      name: 'Class Calendar',
      description: 'View and book classes',
      href: '/calendar',
      icon: CalendarIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      name: 'My Classes',
      description: 'View your booked classes',
      href: '/my-classes',
      icon: CalendarIcon,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      name: 'My Subscriptions',
      description: 'Manage subscriptions and bookings',
      href: '/subscriptions',
      icon: CreditCardIcon,
      color: 'bg-yellow-500 hover:bg-yellow-600',
    },
    {
      name: 'Browse Classes',
      description: 'View class information',
      href: '/classes',
      icon: BookOpenIcon,
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
