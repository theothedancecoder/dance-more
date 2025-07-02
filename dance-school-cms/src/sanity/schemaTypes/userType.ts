import { defineType, defineField } from 'sanity';

export const userType = defineType({
  name: 'user',
  title: 'User',
  type: 'document',
  fields: [
    defineField({
      name: 'clerkId',
      title: 'Clerk ID',
      type: 'string',
      description: 'Unique identifier from Clerk authentication',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
    }),
    defineField({
      name: 'firstName',
      title: 'First Name',
      type: 'string',
    }),
    defineField({
      name: 'lastName',
      title: 'Last Name',
      type: 'string',
    }),
    defineField({
      name: 'phone',
      title: 'Phone Number',
      type: 'string',
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      options: {
        list: [
          { title: 'Student', value: 'student' },
          { title: 'Instructor', value: 'instructor' },
          { title: 'Admin', value: 'admin' },
        ],
      },
      initialValue: 'student',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'profileImage',
      title: 'Profile Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      description: 'Short biography (for instructors)',
    }),
    defineField({
      name: 'emergencyContact',
      title: 'Emergency Contact',
      type: 'object',
      fields: [
        defineField({
          name: 'name',
          title: 'Contact Name',
          type: 'string',
        }),
        defineField({
          name: 'phone',
          title: 'Contact Phone',
          type: 'string',
        }),
        defineField({
          name: 'relationship',
          title: 'Relationship',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'preferences',
      title: 'Preferences',
      type: 'object',
      fields: [
        defineField({
          name: 'danceStyles',
          title: 'Preferred Dance Styles',
          type: 'array',
          of: [{ type: 'string' }],
        }),
        defineField({
          name: 'notifications',
          title: 'Email Notifications',
          type: 'boolean',
          initialValue: true,
        }),
      ],
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
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
      title: 'name',
      subtitle: 'email',
      role: 'role',
      media: 'profileImage',
    },
    prepare({ title, subtitle, role, media }) {
      return {
        title: title || 'Unknown User',
        subtitle: `${subtitle || 'No email'} - ${role || 'student'}`,
        media,
      };
    },
  },
});
