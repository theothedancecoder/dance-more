'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useTenant } from '@/contexts/TenantContext';
import { XMarkIcon, BellIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'general' | 'class_update' | 'payment_reminder' | 'schedule_change' | 'important';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
  isRead: boolean;
}

export default function NotificationBanner() {
  const { isSignedIn, userId } = useAuth();
  const { tenant } = useTenant();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn && tenant?.slug) {
      fetchNotifications();
    }
  }, [isSignedIn, tenant?.slug]);

  const fetchNotifications = async () => {
    if (!tenant?.slug) return;
    
    setLoading(true);
    try {
      const tenantSlug = typeof tenant.slug === 'string' ? tenant.slug : tenant.slug.current;
      const response = await fetch('/api/notifications', {
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!tenant?.slug) return;

    try {
      const tenantSlug = typeof tenant.slug === 'string' ? tenant.slug : tenant.slug.current;
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissNotification = (notificationId: string) => {
    setDismissedNotifications(prev => new Set([...prev, notificationId]));
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'urgent' || type === 'important') {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
    }
    if (type === 'class_update' || type === 'schedule_change') {
      return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
    return <BellIcon className="h-5 w-5 text-gray-500" />;
  };

  const getNotificationStyles = (type: string, priority: string) => {
    if (priority === 'urgent' || type === 'important') {
      return 'bg-red-50 border-red-200 text-red-800';
    }
    if (priority === 'high') {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
    if (type === 'class_update' || type === 'schedule_change') {
      return 'bg-blue-50 border-blue-200 text-blue-800';
    }
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  // Filter out dismissed notifications and show only unread or high priority ones
  const visibleNotifications = notifications.filter(notification => 
    !dismissedNotifications.has(notification._id) && 
    (!notification.isRead || notification.priority === 'urgent')
  );

  if (!isSignedIn || !tenant || loading || visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleNotifications.map((notification) => (
        <div
          key={notification._id}
          className={`border rounded-lg p-4 shadow-sm ${getNotificationStyles(notification.type, notification.priority)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {getNotificationIcon(notification.type, notification.priority)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium">{notification.title}</h4>
                  {!notification.isRead && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      New
                    </span>
                  )}
                  {notification.priority === 'urgent' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-sm mt-1">{notification.message}</p>
                {notification.actionUrl && notification.actionText && (
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className="mt-2 text-sm font-medium hover:underline focus:outline-none focus:underline"
                    style={{ color: tenant?.branding?.primaryColor || '#3B82F6' }}
                  >
                    {notification.actionText} →
                  </button>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(notification.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {!notification.isRead && (
                <button
                  onClick={() => markAsRead(notification._id)}
                  className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  Mark as read
                </button>
              )}
              <button
                onClick={() => dismissNotification(notification._id)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
