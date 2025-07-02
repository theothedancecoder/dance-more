import { defineType, defineField } from 'sanity';

export const classType = defineType({
  name: 'class',
  title: 'Dance Class',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Class Title',
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
      name: 'image',
      title: 'Class Image',
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
      name: 'instructor',
      title: 'Instructor',
      type: 'reference',
      to: [{ type: 'instructor' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'level',
      title: 'Difficulty Level',
      type: 'string',
      options: {
        list: [
          { title: 'Beginner', value: 'beginner' },
          { title: 'Intermediate', value: 'intermediate' },
          { title: 'Advanced', value: 'advanced' },
          { title: 'All Levels', value: 'all-levels' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'danceStyle',
      title: 'Dance Style',
      type: 'string',
      options: {
        list: [
          { title: 'Ballet', value: 'ballet' },
          { title: 'Hip Hop', value: 'hip-hop' },
          { title: 'Jazz', value: 'jazz' },
          { title: 'Contemporary', value: 'contemporary' },
          { title: 'Tap', value: 'tap' },
          { title: 'Ballroom', value: 'ballroom' },
          { title: 'Latin', value: 'latin' },
          { title: 'Salsa', value: 'salsa' },
          { title: 'Swing', value: 'swing' },
          { title: 'Other', value: 'other' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'duration',
      title: 'Duration (minutes)',
      type: 'number',
      validation: (Rule) => Rule.required().min(15).max(180),
    }),
    defineField({
      name: 'capacity',
      title: 'Maximum Capacity',
      type: 'number',
      validation: (Rule) => Rule.required().min(1).max(100),
    }),
    defineField({
      name: 'price',
      title: 'Price per Class',
      type: 'number',
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: 'location',
      title: 'Studio Location',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isRecurring',
      title: 'Is Recurring Class',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'recurringSchedule',
      title: 'Recurring Schedule',
      type: 'object',
      hidden: ({ document }) => !(document as any)?.isRecurring,
      fields: [
        {
          name: 'startDate',
          title: 'Start Date',
          type: 'date',
          validation: (Rule) => Rule.required(),
        },
        {
          name: 'endDate',
          title: 'End Date',
          type: 'date',
          validation: (Rule) => Rule.required(),
        },
        {
          name: 'weeklySchedule',
          title: 'Weekly Schedule',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                {
                  name: 'dayOfWeek',
                  title: 'Day of Week',
                  type: 'string',
                  options: {
                    list: [
                      { title: 'Monday', value: 'monday' },
                      { title: 'Tuesday', value: 'tuesday' },
                      { title: 'Wednesday', value: 'wednesday' },
                      { title: 'Thursday', value: 'thursday' },
                      { title: 'Friday', value: 'friday' },
                      { title: 'Saturday', value: 'saturday' },
                      { title: 'Sunday', value: 'sunday' },
                    ],
                  },
                  validation: (Rule) => Rule.required(),
                },
                {
                  name: 'startTime',
                  title: 'Start Time',
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                },
                {
                  name: 'endTime',
                  title: 'End Time',
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                },
              ],
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'singleClassDate',
      title: 'Single Class Date & Time',
      type: 'datetime',
      hidden: ({ document }) => (document as any)?.isRecurring,
      validation: (Rule) => 
        Rule.custom((value, { document }) => {
          if (!(document as any)?.isRecurring && !value) {
            return 'Single classes must have a date and time';
          }
          return true;
        }),
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'prerequisites',
      title: 'Prerequisites',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'equipment',
      title: 'Required Equipment',
      type: 'array',
      of: [{ type: 'string' }],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'danceStyle',
      media: 'image',
    },
  },
});
