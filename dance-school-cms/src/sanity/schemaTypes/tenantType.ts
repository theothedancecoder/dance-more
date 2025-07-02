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
      name: 'subdomain',
      title: 'Subdomain',
      type: 'slug',
      options: {
        source: 'schoolName',
        maxLength: 96,
      },
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
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'School Description',
      type: 'text',
    }),
    defineField({
      name: 'primaryColor',
      title: 'Primary Brand Color',
      type: 'string',
      description: 'Hex color code (e.g., #FF0000)',
    }),
    defineField({
      name: 'secondaryColor',
      title: 'Secondary Brand Color',
      type: 'string',
      description: 'Hex color code (e.g., #00FF00)',
    }),
  ],
});
