import { defineType, defineField } from 'sanity';

export const instructorSchema = defineType({
  name: 'instructor',
  title: 'Instructor',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Full Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: 'phone',
      title: 'Phone Number',
      type: 'string',
    }),
    defineField({
      name: 'bio',
      title: 'Biography',
      type: 'text',
      rows: 6,
    }),
    defineField({
      name: 'profileImage',
      title: 'Profile Image',
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
      name: 'specialties',
      title: 'Dance Specialties',
      type: 'array',
      of: [
        {
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
        },
      ],
    }),
    defineField({
      name: 'experience',
      title: 'Years of Experience',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(50),
    }),
    defineField({
      name: 'certifications',
      title: 'Certifications',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'title',
              title: 'Certification Title',
              type: 'string',
            },
            {
              name: 'organization',
              title: 'Issuing Organization',
              type: 'string',
            },
            {
              name: 'year',
              title: 'Year Obtained',
              type: 'number',
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'socialMedia',
      title: 'Social Media',
      type: 'object',
      fields: [
        {
          name: 'instagram',
          title: 'Instagram',
          type: 'url',
        },
        {
          name: 'facebook',
          title: 'Facebook',
          type: 'url',
        },
        {
          name: 'youtube',
          title: 'YouTube',
          type: 'url',
        },
        {
          name: 'website',
          title: 'Personal Website',
          type: 'url',
        },
      ],
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'hourlyRate',
      title: 'Hourly Rate',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'availability',
      title: 'Availability',
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
            },
            {
              name: 'startTime',
              title: 'Available From',
              type: 'string',
            },
            {
              name: 'endTime',
              title: 'Available Until',
              type: 'string',
            },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'email',
      media: 'profileImage',
    },
  },
});
