import { createClient } from 'next-sanity';
import imageUrlBuilder from '@sanity/image-url';

export const config = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
};

// Read-only client for public use
export const sanityClient = createClient(config);

// Write client with token for server-side operations
export const writeClient = createClient({
  ...config,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false, // Don't use CDN for write operations
});

const builder = imageUrlBuilder(sanityClient);

export const urlFor = (source: any) => {
  return builder.image(source);
};

export const getClient = () => sanityClient;
export const getWriteClient = () => writeClient;
