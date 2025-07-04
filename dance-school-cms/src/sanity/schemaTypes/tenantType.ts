import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'tenant',
  title: 'Dance School',
  type: 'document',
  fields: [
    defineField({
      name: 'schoolName',
      title: 'School Name',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      options: {
        source: 'schoolName',
        maxLength: 96,
        slugify: input => input
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]+/g, '')
          .replace(/\-\-+/g, '-')
          .replace(/^-+/, '')
          .replace(/-+$/, '')
      },
      validation: Rule => Rule.required(),
      description: 'Used in URL path (e.g., /my-dance-school)',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Inactive', value: 'inactive' },
          { title: 'Suspended', value: 'suspended' },
        ],
      },
      initialValue: 'active',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'ownerId',
      title: 'Owner Clerk ID',
      type: 'string',
      description: 'Clerk ID of the tenant owner/admin',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'School Logo',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'contactEmail',
      title: 'Contact Email',
      type: 'string',
      validation: Rule => Rule.required().email(),
    }),
    defineField({
      name: 'contactPhone',
      title: 'Contact Phone',
      type: 'string',
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'object',
      fields: [
        defineField({
          name: 'street',
          title: 'Street Address',
          type: 'string',
        }),
        defineField({
          name: 'city',
          title: 'City',
          type: 'string',
        }),
        defineField({
          name: 'state',
          title: 'State/Province',
          type: 'string',
        }),
        defineField({
          name: 'zipCode',
          title: 'ZIP/Postal Code',
          type: 'string',
        }),
        defineField({
          name: 'country',
          title: 'Country',
          type: 'string',
          initialValue: 'United States',
        }),
      ],
    }),
    defineField({
      name: 'description',
      title: 'School Description',
      type: 'text',
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
    }),
    defineField({
      name: 'socialMedia',
      title: 'Social Media',
      type: 'object',
      fields: [
        defineField({
          name: 'facebook',
          title: 'Facebook',
          type: 'url',
        }),
        defineField({
          name: 'instagram',
          title: 'Instagram',
          type: 'url',
        }),
        defineField({
          name: 'twitter',
          title: 'Twitter',
          type: 'url',
        }),
        defineField({
          name: 'youtube',
          title: 'YouTube',
          type: 'url',
        }),
      ],
    }),
    defineField({
      name: 'branding',
      title: 'Branding',
      type: 'object',
      fields: [
        defineField({
          name: 'primaryColor',
          title: 'Primary Brand Color',
          type: 'string',
          description: 'Hex color code (e.g., #FF0000)',
          initialValue: '#3B82F6',
        }),
        defineField({
          name: 'secondaryColor',
          title: 'Secondary Brand Color',
          type: 'string',
          description: 'Hex color code (e.g., #00FF00)',
          initialValue: '#1F2937',
        }),
        defineField({
          name: 'accentColor',
          title: 'Accent Color',
          type: 'string',
          description: 'Hex color code for highlights',
          initialValue: '#F59E0B',
        }),
      ],
    }),
    defineField({
      name: 'settings',
      title: 'Settings',
      type: 'object',
      fields: [
        defineField({
          name: 'timezone',
          title: 'Timezone',
          type: 'string',
          initialValue: 'America/New_York',
        }),
        defineField({
          name: 'currency',
          title: 'Currency',
          type: 'string',
          options: {
            list: [
              { title: 'USD ($)', value: 'USD' },
              { title: 'EUR (€)', value: 'EUR' },
              { title: 'GBP (£)', value: 'GBP' },
              { title: 'CAD ($)', value: 'CAD' },
            ],
          },
          initialValue: 'USD',
        }),
        defineField({
          name: 'allowPublicRegistration',
          title: 'Allow Public Registration',
          type: 'boolean',
          initialValue: true,
          description: 'Allow new users to register as students',
        }),
        defineField({
          name: 'requireApproval',
          title: 'Require Admin Approval',
          type: 'boolean',
          initialValue: false,
          description: 'New student registrations require admin approval',
        }),
      ],
    }),
    defineField({
      name: 'subscription',
      title: 'Subscription',
      type: 'object',
      fields: [
        defineField({
          name: 'plan',
          title: 'Plan',
          type: 'string',
          options: {
            list: [
              { title: 'Free', value: 'free' },
              { title: 'Basic', value: 'basic' },
              { title: 'Pro', value: 'pro' },
              { title: 'Enterprise', value: 'enterprise' },
            ],
          },
          initialValue: 'free',
        }),
        defineField({
          name: 'stripeCustomerId',
          title: 'Stripe Customer ID',
          type: 'string',
        }),
        defineField({
          name: 'subscriptionId',
          title: 'Stripe Subscription ID',
          type: 'string',
        }),
        defineField({
          name: 'expiresAt',
          title: 'Subscription Expires At',
          type: 'datetime',
        }),
      ],
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
      title: 'schoolName',
      subtitle: 'slug.current',
      status: 'status',
      media: 'logo',
    },
    prepare({ title, subtitle, status, media }) {
      return {
        title: title || 'Unnamed School',
        subtitle: `/${subtitle || 'no-slug'} - ${status || 'unknown'}`,
        media,
      };
    },
  },
});
