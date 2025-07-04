import { defineType, defineField } from 'sanity';

export const classInstanceType = defineType({
  name: 'classInstance',
  title: 'Class Instance',
  type: 'document',
  fields: [
    defineField({
      name: 'parentClass',
      title: 'Parent Class',
      type: 'reference',
      to: [{ type: 'class' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isCancelled',
      title: 'Is Cancelled',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'cancellationReason',
      title: 'Cancellation Reason',
      type: 'text',
      hidden: ({ document }) => !document?.isCancelled,
    }),
    defineField({
      name: 'bookings',
      title: 'Bookings',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'student',
              title: 'Student',
              type: 'reference',
              to: [{ type: 'user' }],
            },
            {
              name: 'bookingType',
              title: 'Booking Type',
              type: 'string',
              options: {
                list: [
                  { title: 'Subscription', value: 'subscription' },
                  { title: 'Clipcard', value: 'clipcard' },
                ],
              },
            },
            {
              name: 'bookingTime',
              title: 'Booking Time',
              type: 'datetime',
            },
            {
              name: 'tenant',
              title: 'Tenant',
              type: 'reference',
              to: [{ type: 'tenant' }],
              validation: (Rule) => Rule.required(),
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'remainingCapacity',
      title: 'Remaining Capacity',
      type: 'number',
      validation: (Rule) => Rule.required().min(0),
    }),
  ],
  preview: {
    select: {
      title: 'parentClass.title',
      date: 'date',
      cancelled: 'isCancelled',
    },
    prepare({ title, date, cancelled }) {
      return {
        title: `${title} - ${new Date(date).toLocaleDateString()}`,
        subtitle: cancelled ? '❌ CANCELLED' : undefined,
      };
    },
  },
});
