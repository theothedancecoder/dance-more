import { sanityClient } from '@/lib/sanity';
import { classQuery } from '@/lib/sanity-queries';
import { SanityClass } from '@/types/sanity';
import { urlFor } from '@/lib/sanity';
import Image from 'next/image';
import Link from 'next/link';
import PortableText from '@/components/PortableText';
import PaymentButton from '@/components/PaymentButton';
import { notFound } from 'next/navigation';

interface Props {
  params: {
    slug: string;
  };
}

async function getClass(slug: string): Promise<SanityClass | null> {
  try {
    return await sanityClient.fetch(classQuery, { slug });
  } catch (error) {
    console.error('Error fetching class:', error);
    return null;
  }
}

export default async function ClassPage({ params }: Props) {
  const { slug } = await params;
  const classData = await getClass(slug);

  if (!classData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/classes"
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
          Back to Classes
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {classData.image && (
            <div className="relative h-96">
              <Image
                src={urlFor(classData.image).width(1200).height(600).url()}
                alt={classData.image.alt || classData.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full uppercase tracking-wide font-semibold mr-2">
                  {classData.danceStyle}
                </span>
                <span className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full uppercase tracking-wide font-semibold">
                  {classData.level}
                </span>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {classData.price} kr
              </span>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {classData.title}
            </h1>

            {classData.description && (
              <div className="prose max-w-none mb-8">
                <p className="text-gray-700 leading-relaxed">{classData.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Class Details
                </h2>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Duration:</dt>
                    <dd className="font-medium">{classData.duration} minutes</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Location:</dt>
                    <dd className="font-medium">{classData.location}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Schedule</h2>
                {classData.schedule && classData.schedule.length > 0 ? (
                  <div className="space-y-2">
                    {classData.schedule.map((schedule, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-gray-50 p-3 rounded"
                      >
                        <span className="font-medium capitalize">
                          {schedule.dayOfWeek}
                        </span>
                        <span className="text-gray-600">
                          {schedule.startTime} - {schedule.endTime}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No scheduled sessions</p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Instructor</h2>
              <div className="flex items-center">
                {classData.instructor?.profileImage && (
                  <div className="relative w-16 h-16 rounded-full overflow-hidden mr-4">
                    <Image
                      src={urlFor(classData.instructor.profileImage)
                        .width(64)
                        .height(64)
                        .url()}
                      alt={classData.instructor.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {classData.instructor?.name || 'TBA'}
                  </h3>
                  {classData.instructor?.bio && (
                    <p className="text-gray-600 mt-1 line-clamp-2">
                      {classData.instructor.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {(classData.prerequisites || (classData.equipment && classData.equipment.length > 0)) && (
              <div className="border-t border-gray-200 pt-8 mt-8">
                {classData.prerequisites && (
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      Prerequisites
                    </h2>
                    <p className="text-gray-600">{classData.prerequisites}</p>
                  </div>
                )}

                {classData.equipment && classData.equipment.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      Required Equipment
                    </h2>
                    <ul className="list-disc list-inside text-gray-600">
                      {classData.equipment.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 max-w-md mx-auto">
              <PaymentButton
                classId={classData._id}
                price={classData.price}
                title={classData.title}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
