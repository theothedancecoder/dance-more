'use client';

import { useState } from 'react';

interface ReadMoreTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  buttonClassName?: string;
}

export default function ReadMoreText({ 
  text, 
  maxLength = 150, 
  className = '', 
  buttonClassName = '' 
}: ReadMoreTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // If text is shorter than maxLength, just display it normally
  if (text.length <= maxLength) {
    return <p className={className}>{text}</p>;
  }

  const truncatedText = text.slice(0, maxLength).trim();
  const displayText = isExpanded ? text : `${truncatedText}...`;

  return (
    <div>
      <p className={className}>
        {displayText}
        {' '}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded ${buttonClassName}`}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Show less text' : 'Show more text'}
        >
          {isExpanded ? 'Read less' : 'Read more'}
        </button>
      </p>
    </div>
  );
}
