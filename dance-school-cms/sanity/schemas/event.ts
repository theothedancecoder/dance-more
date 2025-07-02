import { defineType, defineField } from 'sanity';

export const eventSchema = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Event Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'content',
      title: 'Event Content',
      type: 'array',
      of: [
        {
          type: 'block',
        },
        {
          type: 'image',
          options: {
            hotspot: true,
          },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative Text',
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
        },
      ],
    }),
    defineField({
      name: 'eventType',
      title: 'Event Type',
      type: 'string',
      options: {
        list: [
          { title: 'Performance', value: 'performance' },
          { title: 'Competition', value: 'competition' },
          { title: 'Workshop', value: 'workshop' },
          { title: 'Masterclass', value: 'masterclass' },
          { title: 'Recital', value: 'recital' },
          { title: 'Social Event', value: 'social' },
          { title: 'Fundraiser', value: 'fundraiser' },
          { title: 'Other', value: 'other' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'startDate',
      title: 'Start Date & Time',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'End Date & Time',
      type: 'datetime',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'address',
      title: 'Full Address',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'ticketPrice',
      title: 'Ticket Price',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'capacity',
      title: 'Maximum Capacity',
      type: 'number',
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'registrationRequired',
      title: 'Registration Required',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'registrationDeadline',
      title: 'Registration Deadline',
      type: 'datetime',
      hidden: ({ document }) => !document?.registrationRequired,
    }),
    defineField({
      name: 'instructors',
      title: 'Featured Instructors',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'instructor' }],
        },
      ],
    }),
    defineField({
      name: 'isPublished',
      title: 'Is Published',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'isFeatured',
      title: 'Is Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'externalLink',
      title: 'External Registration Link',
      type: 'url',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'eventType',
      media: 'featuredImage',
    },
  },
  orderings: [
    {
      title: 'Start Date, New',
      name: 'startDateDesc',
      by: [{ field: 'startDate', direction: 'desc' }],
    },
    {
      title: 'Start Date, Old',
      name: 'startDateAsc',
      by: [{ field: 'startDate', direction: 'asc' }],
    },
  ],
});
