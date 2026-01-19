import { defineField, defineType } from 'sanity';

export const webhookLogType = defineType({
  name: 'webhookLog',
  title: 'Webhook Log',
  type: 'document',
  fields: [
    defineField({
      name: 'eventType',
      title: 'Event Type',
      type: 'string',
      description: 'Type of webhook event (e.g., checkout.session.completed)',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'eventId',
      title: 'Event ID',
      type: 'string',
      description: 'Unique identifier for the webhook event from Stripe',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      description: 'Processing status of the webhook',
      options: {
        list: [
          { title: 'Processing', value: 'processing' },
          { title: 'Success', value: 'success' },
          { title: 'Error', value: 'error' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'details',
      title: 'Details',
      type: 'object',
      description: 'Additional details about the webhook processing',
      fields: [
        defineField({
          name: 'sessionId',
          title: 'Session ID',
          type: 'string',
        }),
        defineField({
          name: 'metadata',
          title: 'Metadata',
          type: 'object',
          fields: [
            { name: 'passId', type: 'string', title: 'Pass ID' },
            { name: 'userId', type: 'string', title: 'User ID' },
            { name: 'tenantId', type: 'string', title: 'Tenant ID' },
            { name: 'type', type: 'string', title: 'Type' },
          ],
        }),
        defineField({
          name: 'error',
          title: 'Error Message',
          type: 'text',
        }),
        defineField({
          name: 'stack',
          title: 'Stack Trace',
          type: 'text',
        }),
        defineField({
          name: 'processingTimeMs',
          title: 'Processing Time (ms)',
          type: 'number',
        }),
        defineField({
          name: 'signatureLength',
          title: 'Signature Length',
          type: 'number',
        }),
        defineField({
          name: 'bodyLength',
          title: 'Body Length',
          type: 'number',
        }),
      ],
    }),
    defineField({
      name: 'timestamp',
      title: 'Timestamp',
      type: 'datetime',
      description: 'When the webhook was received',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      eventType: 'eventType',
      status: 'status',
      timestamp: 'timestamp',
      eventId: 'eventId',
    },
    prepare({ eventType, status, timestamp, eventId }) {
      const statusEmoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
      return {
        title: `${statusEmoji} ${eventType}`,
        subtitle: `${new Date(timestamp).toLocaleString()} - ${eventId}`,
      };
    },
  },
});
