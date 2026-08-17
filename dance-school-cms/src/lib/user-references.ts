import { sanityClient } from '@/lib/sanity';

type SanityUserReference = { _id: string };

export async function resolveUserReferenceIds(clerkUserId: string): Promise<string[]> {
  const users = await sanityClient.fetch<SanityUserReference[]>(
    `*[_type == "user" && (clerkId == $clerkUserId || _id == $clerkUserId)]{
      _id
    }`,
    { clerkUserId }
  );

  return Array.from(new Set([clerkUserId, ...users.map((user) => user._id)]));
}
