export interface SanityImage {
  _type: 'image';
  asset: {
    _ref: string;
    _type: 'reference';
  };
  alt?: string;
  caption?: string;
}

export interface SanitySlug {
  _type: 'slug';
  current: string;
}

export interface SanityBlock {
  _type: 'block';
  children: Array<{
    _type: 'span';
    text: string;
    marks?: string[];
  }>;
  markDefs?: Array<{
    _key: string;
    _type: string;
    href?: string;
  }>;
  style?: string;
  listItem?: string;
  level?: number;
}

export interface SanityClass {
  _id: string;
  _type: 'class';
  title: string;
  slug: SanitySlug;
  description?: string;
  image?: SanityImage;
  instructor?: SanityInstructor;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all-levels';
  danceStyle: 'ballet' | 'hip-hop' | 'jazz' | 'contemporary' | 'tap' | 'ballroom' | 'latin' | 'salsa' | 'swing' | 'other';
  duration: number;
  capacity: number;
  price: number;
  location: string;
  startTime: string;
  endTime: string;
  schedule?: Array<{
    dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    startTime: string;
    endTime: string;
  }>;
  isActive: boolean;
  prerequisites?: string;
  equipment?: string[];
}

export interface SanityInstructor {
  _id: string;
  _type: 'instructor';
  name: string;
  slug: SanitySlug;
  email: string;
  phone?: string;
  bio?: string;
  profileImage?: SanityImage;
  specialties: string[];
  experience?: number;
  certifications?: Array<{
    title: string;
    organization: string;
    year: number;
  }>;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    website?: string;
  };
  isActive: boolean;
  hourlyRate?: number;
  availability?: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }>;
}

export interface SanityEvent {
  _id: string;
  _type: 'event';
  title: string;
  slug: SanitySlug;
  description?: string;
  content?: Array<SanityBlock | SanityImage>;
  featuredImage?: SanityImage;
  eventType: 'performance' | 'competition' | 'workshop' | 'masterclass' | 'recital' | 'social' | 'fundraiser' | 'other';
  startDate: string;
  endDate?: string;
  location: string;
  address?: string;
  ticketPrice?: number;
  capacity?: number;
  registrationRequired: boolean;
  registrationDeadline?: string;
  instructors?: SanityInstructor[];
  isPublished: boolean;
  isFeatured: boolean;
  tags?: string[];
  externalLink?: string;
}

export interface SanityPost {
  _id: string;
  _type: 'post';
  title: string;
  slug: SanitySlug;
  excerpt?: string;
  content: Array<SanityBlock | SanityImage>;
  featuredImage?: SanityImage;
  category: 'news' | 'announcement' | 'student-spotlight' | 'instructor-feature' | 'tips-techniques' | 'studio-updates' | 'community' | 'events';
  author?: SanityInstructor;
  publishedAt: string;
  isPublished: boolean;
  isFeatured: boolean;
  tags?: string[];
  relatedClasses?: SanityClass[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface SanityDashboardData {
  recentPosts: SanityPost[];
  upcomingEvents: SanityEvent[];
  activeClasses: SanityClass[];
}
