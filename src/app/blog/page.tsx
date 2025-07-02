import { sanityClient } from '@/lib/sanity';
import { postsQuery } from '@/lib/sanity-queries';
import { SanityPost } from '@/types/sanity';
import { urlFor } from '@/lib/sanity';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';

async function getPosts(): Promise<SanityPost[]> {
  try {
    return await sanityClient.fetch(postsQuery);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Dance School Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stay updated with the latest news, tips, and stories from our dance community.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No blog posts available at the moment. Please check back later or visit our Sanity Studio to add content.
            </p>
            <Link
              href="/studio"
              className="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Sanity Studio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <article
                key={post._id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {post.featuredImage && (
                  <div className="relative h-48">
                    <Image
                      src={urlFor(post.featuredImage).width(400).height(300).url()}
                      alt={post.featuredImage.alt || post.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full uppercase tracking-wide font-semibold">
                      {post.category.replace('-', ' ')}
                    </span>
                    {post.isFeatured && (
                      <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full uppercase tracking-wide font-semibold">
                        Featured
                      </span>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {post.title}
                  </h2>
                  
                  {post.excerpt && (
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    {post.author && (
                      <div className="flex items-center">
                        {post.author.profileImage && (
                          <div className="relative w-6 h-6 rounded-full overflow-hidden mr-2">
                            <Image
                              src={urlFor(post.author.profileImage).width(24).height(24).url()}
                              alt={post.author.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <span>{post.author.name}</span>
                      </div>
                    )}
                    <time dateTime={post.publishedAt}>
                      {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                    </time>
                  </div>
                  
                  {post.tags && post.tags.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {post.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                        {post.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{post.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <Link
                    href={`/blog/${post.slug.current}`}
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Read More
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
