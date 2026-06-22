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
      name: 'validityType',
      title: 'Validity Type',
      type: 'string',
      options: {
        list: [
          { title: 'Valid for X days from purchase', value: 'days' },
          { title: 'Valid until specific date', value: 'date' },
        ],
      },
      initialValue: 'days',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'validityDays',
      title: 'Validity Period (Days)',
      type: 'number',
      description: 'Number of days the pass is valid from purchase date',
      hidden: ({ document }) => (document as any)?.validityType !== 'days',
      validation: (Rule) => 
        Rule.custom((value, context) => {
          const validityType = (context.document as any)?.validityType;
          if (validityType === 'days' && (!value || value < 1)) {
            return 'Validity days must be at least 1 when using days-based validity';
          }
          return true;
        }),
    }),
    defineField({
      name: 'expiryDate',
      title: 'Expiry Date',
      type: 'datetime',
      description: 'Specific date when this pass expires and can no longer be purchased or used',
      hidden: ({ document }) => (document as any)?.validityType !== 'date',
      validation: (Rule) => 
        Rule.custom((value, context) => {
          const validityType = (context.document as any)?.validityType;
          if (validityType === 'date' && !value) {
            return 'Expiry date is required when using date-based validity';
          }
          if (value && new Date(value) <= new Date()) {
            return 'Expiry date must be in the future';
          }
          return true;
        }),
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
      name: 'features',
      title: 'Features',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'List of features/benefits included with this pass',
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      description: 'Whether this pass is available for purchase',
      initialValue: true,
    }),
    defineField({
      name: 'promoActive',
      title: 'Promo Code Active',
      type: 'boolean',
      description: 'Enable promo code discount for this pass',
      initialValue: false,
    }),
    defineField({
      name: 'promoCode',
      title: 'Promo Code',
      type: 'string',
      description: 'Code students can enter at checkout (e.g. WELCOME20)',
      hidden: ({ document }) => !(document as any)?.promoActive,
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const promoActive = (context.document as any)?.promoActive;
          if (promoActive && !value) return 'Promo code is required when promo is active';
          return true;
        }),
    }),
    defineField({
      name: 'promoDiscountType',
      title: 'Promo Discount Type',
      type: 'string',
      options: {
        list: [
          { title: 'Percentage', value: 'percentage' },
          { title: 'Fixed Amount (kr)', value: 'fixed' },
        ],
      },
      hidden: ({ document }) => !(document as any)?.promoActive,
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const promoActive = (context.document as any)?.promoActive;
          if (promoActive && !value) return 'Promo discount type is required when promo is active';
          return true;
        }),
    }),
    defineField({
      name: 'promoDiscountValue',
      title: 'Promo Discount Value',
      type: 'number',
      description: 'If percentage: 1-100. If fixed: amount in kr.',
      hidden: ({ document }) => !(document as any)?.promoActive,
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const doc = context.document as any;
          if (!doc?.promoActive) return true;
          if (value === undefined || value === null || value <= 0) {
            return 'Promo discount value must be greater than 0';
          }
          if (doc.promoDiscountType === 'percentage' && value > 100) {
            return 'Percentage discount cannot exceed 100';
          }
          return true;
        }),
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
      validityType: 'validityType',
      validityDays: 'validityDays',
      expiryDate: 'expiryDate',
      promoActive: 'promoActive',
      promoCode: 'promoCode',
      promoDiscountType: 'promoDiscountType',
      promoDiscountValue: 'promoDiscountValue',
    },
    prepare({ title, type, price, isActive, validityType, validityDays, expiryDate, promoActive, promoCode, promoDiscountType, promoDiscountValue }) {
      const typeLabels = {
        single: 'Single Class',
        'multi-pass': 'Multi-Class Pass',
        multi: 'Clipcard',
        unlimited: 'Unlimited',
      };
      
      let validityInfo = '';
      if (validityType === 'days' && validityDays) {
        validityInfo = ` • ${validityDays} days`;
      } else if (validityType === 'date' && expiryDate) {
        const expiry = new Date(expiryDate);
        validityInfo = ` • Until ${expiry.toLocaleDateString()}`;
      }
      
      const promoInfo = promoActive && promoCode && promoDiscountValue
        ? ` • Promo: ${promoCode.toUpperCase()} (${promoDiscountType === 'percentage' ? `${promoDiscountValue}%` : `${promoDiscountValue} kr`})`
        : '';

      return {
        title,
        subtitle: `${typeLabels[type as keyof typeof typeLabels]} • ${price} kr${validityInfo}${promoInfo}${!isActive ? ' (Inactive)' : ''}`,
      };
    },
  },
});
