import { sanityClient } from '@/lib/sanity';
import { postQuery } from '@/lib/sanity-queries';
import { SanityPost } from '@/types/sanity';
import { urlFor } from '@/lib/sanity';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import PortableText from '@/components/PortableText';
import { notFound } from 'next/navigation';

interface Props {
  params: {
    slug: string;
  };
}

async function getPost(slug: string): Promise<SanityPost | null> {
  try {
    return await sanityClient.fetch(postQuery, { slug });
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Blog
        </Link>

        <article className="bg-white rounded-lg shadow-lg overflow-hidden">
          {post.featuredImage && (
            <div className="relative h-96">
              <Image
                src={urlFor(post.featuredImage).width(1200).height(600).url()}
                alt={post.featuredImage.alt || post.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full uppercase tracking-wide font-semibold">
                {post.category.replace('-', ' ')}
              </span>
              <time
                dateTime={post.publishedAt}
                className="text-gray-500"
              >
                {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
              </time>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              {post.title}
            </h1>

            {post.author && (
              <div className="flex items-center mb-8 border-b border-gray-200 pb-6">
                {post.author.profileImage && (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4">
                    <Image
                      src={urlFor(post.author.profileImage).width(48).height(48).url()}
                      alt={post.author.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900">
                    {post.author.name}
                  </div>
                  {post.author.bio && (
                    <p className="text-gray-500 text-sm line-clamp-2">
                      {post.author.bio}
                    </p>
                  )}
                </div>
              </div>
            )}

            {post.excerpt && (
              <div className="text-xl text-gray-600 mb-8 font-medium italic">
                {post.excerpt}
              </div>
            )}

            <div className="prose prose-lg max-w-none mb-8">
              <PortableText content={post.content} />
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="border-t border-gray-200 pt-6 mt-8">
                <h2 className="text-sm font-medium text-gray-500 mb-3">
                  Tagged with
                </h2>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {post.relatedClasses && post.relatedClasses.length > 0 && (
              <div className="border-t border-gray-200 pt-8 mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Related Classes
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {post.relatedClasses.map((classItem) => (
                    <Link
                      key={classItem._id}
                      href={`/classes/${classItem.slug.current}`}
                      className="group block"
                    >
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        {classItem.image && (
                          <div className="relative h-48">
                            <Image
                              src={urlFor(classItem.image).width(400).height(300).url()}
                              alt={classItem.title}
                              fill
                              className="object-cover group-hover:opacity-90 transition-opacity"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {classItem.title}
                          </h3>
                          <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                            <span className="capitalize">{classItem.danceStyle}</span>
                            <span className="capitalize">{classItem.level}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
