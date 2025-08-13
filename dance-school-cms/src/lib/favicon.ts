import sharp from 'sharp';

// Cache for processed favicons (in-memory cache for development)
const faviconCache = new Map<string, { data: Buffer; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Detects tenant from request headers
 * Supports both subdomain and path-based tenant detection
 * Also checks referer header for tenant context
 */
export function detectTenantFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const hostname = url.hostname;
  
  // Environment configuration
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dancemore.com';
  const vercelProjectName = process.env.NEXT_PUBLIC_VERCEL_PROJECT_NAME || 'dance-school-cms';
  
  // First, try to get tenant from subdomain (for production)
  if (!hostname.includes('localhost')) {
    // Handle Vercel preview domains (tenant.vercel.app or main.vercel.app)
    if (hostname.endsWith('.vercel.app')) {
      const hostWithoutVercel = hostname.replace('.vercel.app', '');
      const parts = hostWithoutVercel.split('.');
      
      // If it's the main app deployment, there is no tenant
      if (hostWithoutVercel !== vercelProjectName && parts.length > 1) {
        // Extract subdomain from tenant.project-name.vercel.app or tenant.vercel.app
        return parts[0];
      }
    }
    
    // Handle production domains (tenant.dancemore.com)
    if (hostname.endsWith(baseDomain)) {
      const hostWithoutBase = hostname.replace(`.${baseDomain}`, '');
      
      // If it's not the main domain or www, extract tenant
      if (hostWithoutBase && hostWithoutBase !== 'www' && hostWithoutBase !== baseDomain) {
        const [subdomainPart] = hostWithoutBase.split('.');
        return subdomainPart;
      }
    }
    
    // For any other domains, try to extract the first part as tenant
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const potentialTenant = parts[0];
      // Skip common non-tenant subdomains
      if (!['www', 'api', 'admin', 'app'].includes(potentialTenant)) {
        return potentialTenant;
      }
    }
  }
  
  // If no tenant from subdomain, check referer header for path-based tenant
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const pathSegments = refererUrl.pathname.split('/').filter(Boolean);
      
      if (pathSegments.length > 0) {
        const firstSegment = pathSegments[0];
        // Skip known non-tenant routes
        const skipRoutes = [
          'api', '_next', 'sign-in', 'sign-up', 'studio', '.clerk', 
          'register-school', 'unauthorized', 'dashboard', 'admin', 
          'student', 'my-classes', 'payment', 'classes', 'calendar', 
          'my-subscriptions', 'subscriptions', 'instructor', 'blog', 
          'auth-status', 'check-admin', 'promote-admin', 'debug'
        ];
        
        if (!skipRoutes.includes(firstSegment)) {
          return firstSegment;
        }
      }
    } catch (error) {
      console.warn('Failed to parse referer URL:', referer, error);
    }
  }
  
  return null;
}

/**
 * Converts an image to ICO format
 * Supports multiple sizes for better compatibility
 */
export async function convertToIco(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Create multiple sizes for ICO format (16x16, 32x32, 48x48)
    const sizes = [16, 32, 48];
    const images: Buffer[] = [];
    
    for (const size of sizes) {
      const resized = await sharp(imageBuffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toBuffer();
      
      images.push(resized);
    }
    
    // For simplicity, return the 32x32 version as ICO
    // In a production environment, you might want to use a proper ICO library
    // that can combine multiple sizes into a single ICO file
    return images[1]; // 32x32 version
  } catch (error) {
    console.error('Error converting image to ICO:', error);
    throw new Error('Failed to convert image to ICO format');
  }
}

/**
 * Fetches and processes a tenant's logo for use as favicon
 */
export async function getTenantFavicon(logoUrl: string, tenantSlug: string): Promise<Buffer> {
  const cacheKey = `${tenantSlug}-${logoUrl}`;
  
  // Check cache first
  const cached = faviconCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    // Fetch the image from Sanity CDN
    const response = await fetch(logoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.status}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Convert to ICO format
    const icoBuffer = await convertToIco(imageBuffer);
    
    // Cache the result
    faviconCache.set(cacheKey, {
      data: icoBuffer,
      timestamp: Date.now()
    });
    
    return icoBuffer;
  } catch (error) {
    console.error('Error processing tenant favicon:', error);
    throw error;
  }
}

/**
 * Gets the default favicon as fallback
 */
export async function getDefaultFavicon(): Promise<Buffer> {
  try {
    // Read the default favicon from the public directory
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const faviconPath = path.join(process.cwd(), 'dance-school-cms', 'public', 'dancemore.png');
    
    try {
      const defaultImage = await fs.readFile(faviconPath);
      return await convertToIco(defaultImage);
    } catch {
      // If dancemore.png doesn't exist, create a simple default
      const defaultBuffer = await sharp({
        create: {
          width: 32,
          height: 32,
          channels: 4,
          background: { r: 59, g: 130, b: 246, alpha: 1 } // Blue background
        }
      })
      .png()
      .toBuffer();
      
      return await convertToIco(defaultBuffer);
    }
  } catch (error) {
    console.error('Error creating default favicon:', error);
    throw error;
  }
}

/**
 * Clears the favicon cache (useful for development)
 */
export function clearFaviconCache(): void {
  faviconCache.clear();
}

/**
 * Gets cache statistics
 */
export function getFaviconCacheStats(): { size: number; keys: string[] } {
  return {
    size: faviconCache.size,
    keys: Array.from(faviconCache.keys())
  };
}
