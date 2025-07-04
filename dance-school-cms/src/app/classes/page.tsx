import { sanityClient } from '@/lib/sanity';
import { classesQuery } from '@/lib/sanity-queries';
import { SanityClass } from '@/types/sanity';
import { urlFor } from '@/lib/sanity';
import Image from 'next/image';
import Link from 'next/link';

async function getClasses(): Promise<SanityClass[]> {
  try {
    return await sanityClient.fetch(classesQuery);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return [];
  }
}

export default async function ClassesPage() {
  const classes = await getClasses();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Dance Classes
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover our wide range of dance classes for all skill levels and ages.
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No classes available at the moment. Please check back later or visit our Sanity Studio to add content.
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
            {classes.map((classItem) => (
              <div
                key={classItem._id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {classItem.image && (
                  <div className="relative h-48">
                    <Image
                      src={urlFor(classItem.image).width(400).height(300).url()}
                      alt={classItem.image.alt || classItem.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full uppercase tracking-wide font-semibold">
                      {classItem.danceStyle}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">
                      {classItem.level}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {classItem.title}
                  </h3>
                  
                  {classItem.description && (
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {classItem.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center justify-between">
                      <span>Instructor:</span>
                      <span className="font-medium">{classItem.instructor?.name || 'TBA'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">{classItem.duration} minutes</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Price:</span>
                      <span className="font-medium">{classItem.price} kr</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Location:</span>
                      <span className="font-medium">{classItem.location}</span>
                    </div>
                  </div>
                  
                  {classItem.schedule && classItem.schedule.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Schedule:</h4>
                      <div className="space-y-1">
                        {classItem.schedule.map((schedule, index) => (
                          <div key={index} className="text-xs text-gray-600 flex justify-between">
                            <span className="capitalize">{schedule.dayOfWeek}</span>
                            <span>{schedule.startTime} - {schedule.endTime}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <Link
                      href={`/classes/${classItem.slug?.current || classItem._id}`}
                      className="w-full bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors inline-block"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
