import { defineType, defineField } from 'sanity';

export const subscriptionType = defineType({
  name: 'subscription',
  title: 'Subscription',
  type: 'document',
  fields: [
    defineField({
      name: 'user',
      title: 'User',
      type: 'reference',
      to: [{ type: 'user' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Single Class', value: 'single' },
          { title: 'Multi-Class Pass', value: 'multi-pass' },
          { title: 'Clipcard', value: 'clipcard' },
          { title: 'Monthly Pass', value: 'monthly' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'startDate',
      title: 'Start Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'End Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'passId',
      title: 'Pass ID',
      type: 'string',
      description: 'Reference to the original pass used to create this subscription',
    }),
    defineField({
      name: 'passName',
      title: 'Pass Name',
      type: 'string',
      description: 'Name of the pass at time of purchase',
    }),
    defineField({
      name: 'purchasePrice',
      title: 'Purchase Price',
      type: 'number',
      description: 'Price paid for this subscription',
    }),
    defineField({
      name: 'remainingClips',
      title: 'Remaining Clips',
      type: 'number',
      hidden: ({ document }) => !['single', 'multi-pass', 'clipcard'].includes((document as any)?.type),
      validation: (Rule) => 
        Rule.custom((value, { document }) => {
          const type = (document as any)?.type;
          if (['single', 'multi-pass', 'clipcard'].includes(type) && (value === undefined || value < 0)) {
            return 'This subscription type must have a non-negative number of remaining clips';
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
      name: 'stripePaymentId',
      title: 'Stripe Payment ID',
      type: 'string',
    }),
    defineField({
      name: 'stripeSessionId',
      title: 'Stripe Session ID',
      type: 'string',
      description: 'Stripe checkout session ID for deduplication',
    }),
    defineField({
      name: 'tenant',
      title: 'Tenant',
      type: 'reference',
      to: [{ type: 'tenant' }],
      validation: (Rule) => Rule.required(),
      description: 'The dance school this subscription belongs to',
    }),
  ],
  preview: {
    select: {
      title: 'type',
      userName: 'user.name',
      startDate: 'startDate',
      endDate: 'endDate',
      remainingClips: 'remainingClips',
      isActive: 'isActive',
    },
    prepare({ title, userName, startDate, endDate, remainingClips, isActive }) {
      const status = isActive ? '✅ Active' : '❌ Inactive';
      const typeLabels = {
        single: 'Single Class',
        'multi-pass': 'Multi-Class Pass',
        clipcard: 'Clipcard',
        monthly: 'Monthly Pass',
      };
      const displayType = typeLabels[title as keyof typeof typeLabels] || title;
      const clips = ['single', 'multi-pass', 'clipcard'].includes(title) ? ` (${remainingClips} clips)` : '';
      return {
        title: `${userName} - ${displayType}${clips}`,
        subtitle: `${status} | ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
      };
    },
  },
});
