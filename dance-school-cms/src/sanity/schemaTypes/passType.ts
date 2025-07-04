import { defineType, defineField } from 'sanity';

export const passType = defineType({
  name: 'pass',
  title: 'Pass',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Pass Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'type',
      title: 'Pass Type',
      type: 'string',
      options: {
        list: [
          { title: 'Single Class', value: 'single' },
          { title: 'Multi-Class Pass', value: 'multi-pass' },
          { title: 'Multi-Class (Clipcard)', value: 'multi' },
          { title: 'Unlimited Monthly', value: 'unlimited' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Price (kr)',
      type: 'number',
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: 'validityDays',
      title: 'Validity Period (Days)',
      type: 'number',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'classesLimit',
      title: 'Number of Classes',
      type: 'number',
      description: 'Only applicable for multi-class passes and clipcards',
      hidden: ({ document }) => !['multi', 'multi-pass'].includes((document as any)?.type),
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      description: 'Whether this pass is available for purchase',
      initialValue: true,
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'tenant',
      title: 'Tenant',
      type: 'reference',
      to: [{ type: 'tenant' }],
      validation: (Rule) => Rule.required(),
      description: 'The dance school this pass belongs to',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      type: 'type',
      price: 'price',
      isActive: 'isActive',
    },
    prepare({ title, type, price, isActive }) {
      const typeLabels = {
        single: 'Single Class',
        'multi-pass': 'Multi-Class Pass',
        multi: 'Clipcard',
        unlimited: 'Unlimited',
      };
      return {
        title,
        subtitle: `${typeLabels[type as keyof typeof typeLabels]} • ${price} kr ${!isActive ? '(Inactive)' : ''}`,
      };
    },
  },
});
