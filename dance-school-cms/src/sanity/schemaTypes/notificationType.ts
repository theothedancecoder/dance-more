import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'notification',
  title: 'Notification',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required().max(100),
    }),
    defineField({
      name: 'message',
      title: 'Message',
      type: 'text',
      validation: Rule => Rule.required().max(500),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'General', value: 'general' },
          { title: 'Class Update', value: 'class_update' },
          { title: 'Payment Reminder', value: 'payment_reminder' },
          { title: 'Schedule Change', value: 'schedule_change' },
          { title: 'Important', value: 'important' },
        ],
      },
      initialValue: 'general',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'string',
      options: {
        list: [
          { title: 'Low', value: 'low' },
          { title: 'Normal', value: 'normal' },
          { title: 'High', value: 'high' },
          { title: 'Urgent', value: 'urgent' },
        ],
      },
      initialValue: 'normal',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'tenant',
      title: 'Dance School',
      type: 'reference',
      to: [{ type: 'tenant' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'user' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'targetAudience',
      title: 'Target Audience',
      type: 'string',
      options: {
        list: [
          { title: 'All Members', value: 'all' },
          { title: 'Students Only', value: 'students' },
          { title: 'Instructors Only', value: 'instructors' },
          { title: 'Active Subscribers', value: 'active_subscribers' },
        ],
      },
      initialValue: 'all',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      initialValue: true,
      description: 'Whether this notification should be displayed to users',
    }),
    defineField({
      name: 'expiresAt',
      title: 'Expires At',
      type: 'datetime',
      description: 'When this notification should stop being displayed (optional)',
    }),
    defineField({
      name: 'actionUrl',
      title: 'Action URL',
      type: 'string',
      description: 'Optional URL to redirect users when they click the notification',
    }),
    defineField({
      name: 'actionText',
      title: 'Action Button Text',
      type: 'string',
      description: 'Text for the action button (e.g., "View Details", "Book Now")',
    }),
    defineField({
      name: 'readBy',
      title: 'Read By',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'user',
              type: 'reference',
              to: [{ type: 'user' }],
            },
            {
              name: 'readAt',
              type: 'datetime',
            },
          ],
        },
      ],
      description: 'Track which users have read this notification',
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'message',
      type: 'type',
      priority: 'priority',
      isActive: 'isActive',
    },
    prepare({ title, subtitle, type, priority, isActive }) {
      const priorityEmoji = {
        low: '🔵',
        normal: '⚪',
        high: '🟡',
        urgent: '🔴',
      };
      
      return {
        title: `${priorityEmoji[priority as keyof typeof priorityEmoji] || '⚪'} ${title}`,
        subtitle: `${type} • ${isActive ? 'Active' : 'Inactive'} • ${subtitle?.slice(0, 60)}...`,
      };
    },
  },
  orderings: [
    {
      title: 'Created Date, New',
      name: 'createdAtDesc',
      by: [{ field: 'createdAt', direction: 'desc' }],
    },
    {
      title: 'Priority, High to Low',
      name: 'priorityDesc',
      by: [
        { field: 'priority', direction: 'desc' },
        { field: 'createdAt', direction: 'desc' },
      ],
    },
  ],
});
