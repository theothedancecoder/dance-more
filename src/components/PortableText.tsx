import { PortableText as SanityPortableText } from '@portabletext/react';
import { urlFor } from '@/lib/sanity';
import { SanityImage } from '@/types/sanity';
import Image from 'next/image';
import type { PortableTextComponents } from '@portabletext/react';

interface PortableTextProps {
  content: any[];
}

const components: PortableTextComponents = {
  types: {
    image: ({ value }: { value: SanityImage }) => {
      if (!value?.asset) return null;
      
      return (
        <div className="my-8">
          <Image
            src={urlFor(value).width(800).height(600).url()}
            alt={value.alt || ''}
            width={800}
            height={600}
            className="rounded-lg"
          />
          {value.caption && (
            <p className="text-sm text-gray-600 mt-2 text-center italic">
              {value.caption}
            </p>
          )}
        </div>
      );
    },
  },
  block: {
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold mb-6 text-gray-900">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-3xl font-bold mb-4 text-gray-900">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-2xl font-bold mb-3 text-gray-900">{children}</h3>
    ),
    normal: ({ children }) => (
      <p className="mb-4 text-gray-700 leading-relaxed">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 my-6 italic text-gray-600">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="ml-4">{children}</li>,
    number: ({ children }) => <li className="ml-4">{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
        {children}
      </code>
    ),
    link: ({ children, value }) => {
      const href = value?.href || '#';
      return (
        <a
          href={href}
          className="text-blue-600 hover:text-blue-800 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },
  },
};

export default function PortableText({ content }: PortableTextProps) {
  return (
    <div className="prose prose-lg max-w-none">
      <SanityPortableText value={content} components={components} />
    </div>
  );
}
