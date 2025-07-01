import { groq } from 'next-sanity';

// Class queries
export const classesQuery = groq`
  *[_type == "class" && isActive == true] | order(_createdAt desc) {
    _id,
    title,
    slug,
    description,
    image,
    instructor->{
      _id,
      name,
      profileImage
    },
    level,
    danceStyle,
    duration,
    capacity,
    price,
    location,
    startTime,
    endTime,
    schedule,
    prerequisites,
    equipment
  }
`;

export const upcomingClassesQuery = groq`
  *[_type == "class" && isActive == true && startTime > now()] | order(startTime asc) {
    _id,
    title,
    slug,
    description,
    instructor->{
      _id,
      name
    },
    level,
    danceStyle,
    duration,
    capacity,
    price,
    location,
    startTime,
    endTime
  }
`;

export const classQuery = groq`
  *[_type == "class" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    description,
    image,
    instructor->{
      _id,
      name,
      bio,
      profileImage,
      specialties,
      experience
    },
    level,
    danceStyle,
    duration,
    capacity,
    price,
    location,
    startTime,
    endTime,
    schedule,
    prerequisites,
    equipment,
    isActive
  }
`;

// Instructor queries
export const instructorsQuery = groq`
  *[_type == "instructor" && isActive == true] | order(name asc) {
    _id,
    name,
    slug,
    email,
    bio,
    profileImage,
    specialties,
    experience,
    certifications,
    socialMedia
  }
`;

export const instructorQuery = groq`
  *[_type == "instructor" && slug.current == $slug][0] {
    _id,
    name,
    slug,
    email,
    phone,
    bio,
    profileImage,
    specialties,
    experience,
    certifications,
    socialMedia,
    hourlyRate,
    availability
  }
`;

// Event queries
export const eventsQuery = groq`
  *[_type == "event" && isPublished == true] | order(startDate asc) {
    _id,
    title,
    slug,
    description,
    featuredImage,
    eventType,
    startDate,
    endDate,
    location,
    ticketPrice,
    capacity,
    registrationRequired,
    registrationDeadline,
    instructors[]->{
      _id,
      name,
      profileImage
    },
    isFeatured,
    tags
  }
`;

export const eventQuery = groq`
  *[_type == "event" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    description,
    content,
    featuredImage,
    eventType,
    startDate,
    endDate,
    location,
    address,
    ticketPrice,
    capacity,
    registrationRequired,
    registrationDeadline,
    instructors[]->{
      _id,
      name,
      bio,
      profileImage,
      specialties
    },
    isFeatured,
    tags,
    externalLink
  }
`;

export const featuredEventsQuery = groq`
  *[_type == "event" && isPublished == true && isFeatured == true] | order(startDate asc) [0...3] {
    _id,
    title,
    slug,
    description,
    featuredImage,
    eventType,
    startDate,
    endDate,
    location,
    ticketPrice
  }
`;

// Blog post queries
export const postsQuery = groq`
  *[_type == "post" && isPublished == true] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    featuredImage,
    category,
    author->{
      _id,
      name,
      profileImage
    },
    publishedAt,
    isFeatured,
    tags
  }
`;

export const postQuery = groq`
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    excerpt,
    content,
    featuredImage,
    category,
    author->{
      _id,
      name,
      bio,
      profileImage
    },
    publishedAt,
    tags,
    relatedClasses[]->{
      _id,
      title,
      slug,
      image,
      danceStyle,
      level
    },
    seoTitle,
    seoDescription
  }
`;

export const featuredPostsQuery = groq`
  *[_type == "post" && isPublished == true && isFeatured == true] | order(publishedAt desc) [0...3] {
    _id,
    title,
    slug,
    excerpt,
    featuredImage,
    category,
    publishedAt
  }
`;

export const recentPostsQuery = groq`
  *[_type == "post" && isPublished == true] | order(publishedAt desc) [0...5] {
    _id,
    title,
    slug,
    excerpt,
    featuredImage,
    category,
    publishedAt
  }
`;

// Dashboard queries
export const dashboardDataQuery = groq`
{
  "recentPosts": *[_type == "post" && isPublished == true] | order(publishedAt desc) [0...3] {
    _id,
    title,
    slug,
    excerpt,
    featuredImage,
    category,
    publishedAt
  },
  "upcomingEvents": *[_type == "event" && isPublished == true && startDate > now()] | order(startDate asc) [0...3] {
    _id,
    title,
    slug,
    eventType,
    startDate,
    location,
    featuredImage
  },
  "activeClasses": *[_type == "class" && isActive == true] | order(_createdAt desc) [0...6] {
    _id,
    title,
    slug,
    danceStyle,
    level,
    instructor->{
      name
    },
    image
  }
}
`;
