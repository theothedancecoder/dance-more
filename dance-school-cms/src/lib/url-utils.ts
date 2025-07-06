/**
 * Utility functions for consistent URL and domain handling across environments
 */

export interface DomainInfo {
  isLocalhost: boolean;
  isVercel: boolean;
  isProduction: boolean;
  tenantSlug: string | null;
  baseDomain: string;
  vercelProjectName: string;
}

/**
 * Extract tenant information from hostname
 */
export function getTenantFromHostname(hostname: string): string | null {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dancemore.com';
  const vercelProjectName = process.env.NEXT_PUBLIC_VERCEL_PROJECT_NAME || 'dance-school-cms';

  // Localhost should bypass tenant detection
  if (hostname.includes('localhost')) {
    return null;
  }

  // Handle Vercel preview domains (tenant.vercel.app or main.vercel.app)
  if (hostname.endsWith('.vercel.app')) {
    const hostWithoutVercel = hostname.replace('.vercel.app', '');
    const parts = hostWithoutVercel.split('.');
    
    // If it's the main app deployment, there is no tenant
    if (hostWithoutVercel === vercelProjectName || parts.length === 1) {
      return null;
    }
    
    // Extract subdomain from tenant.project-name.vercel.app or tenant.vercel.app
    return parts[0];
  }

  // Handle production domains (tenant.dancemore.com)
  if (hostname.endsWith(baseDomain)) {
    const hostWithoutBase = hostname.replace(`.${baseDomain}`, '');
    
    // If it's the main domain or www, there is no tenant
    if (hostWithoutBase === '' || hostWithoutBase === 'www' || hostWithoutBase === baseDomain) {
      return null;
    }
    
    const [subdomain] = hostWithoutBase.split('.');
    return subdomain;
  }

  // For any other domains, try to extract the first part as tenant
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const potentialTenant = parts[0];
    // Skip common non-tenant subdomains
    if (['www', 'api', 'admin', 'app'].includes(potentialTenant)) {
      return null;
    }
    return potentialTenant;
  }

  return null;
}

/**
 * Get domain information for the current environment
 */
export function getDomainInfo(hostname?: string): DomainInfo {
  const currentHostname = hostname || (typeof window !== 'undefined' ? window.location.hostname : '');
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dancemore.com';
  const vercelProjectName = process.env.NEXT_PUBLIC_VERCEL_PROJECT_NAME || 'dance-school-cms';

  const isLocalhost = currentHostname.includes('localhost');
  const isVercel = currentHostname.endsWith('.vercel.app');
  const isProduction = currentHostname.endsWith(baseDomain);
  const tenantSlug = getTenantFromHostname(currentHostname);

  return {
    isLocalhost,
    isVercel,
    isProduction,
    tenantSlug,
    baseDomain,
    vercelProjectName,
  };
}

/**
 * Build the correct URL for a tenant-specific route
 */
export function buildTenantUrl(tenantSlug: string, path: string = '', hostname?: string): string {
  const domainInfo = getDomainInfo(hostname);
  
  // Always use path-based routing for consistency across environments
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/${tenantSlug}${cleanPath}`;
}

/**
 * Check if the current URL context matches the expected tenant
 */
export function isOnCorrectTenantContext(tenantSlug: string, pathname: string, hostname?: string): boolean {
  const domainInfo = getDomainInfo(hostname);
  
  // Check subdomain-based tenant
  if (domainInfo.tenantSlug === tenantSlug) {
    return true;
  }
  
  // Check path-based tenant
  return pathname.startsWith(`/${tenantSlug}`);
}

/**
 * Get the base URL for the current environment
 */
export function getBaseUrl(hostname?: string): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  const currentHostname = hostname || 'localhost:3000';
  const protocol = currentHostname.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${currentHostname}`;
}

/**
 * Extract tenant slug from pathname
 */
export function getTenantFromPathname(pathname: string): string | null {
  const pathSegments = pathname.split('/').filter(Boolean);
  
  if (pathSegments.length === 0) {
    return null;
  }
  
  const firstSegment = pathSegments[0];
  
  // Skip known non-tenant routes
  const skipRoutes = [
    'api', '_next', 'sign-in', 'sign-up', 'studio', '.clerk', 
    'register-school', 'unauthorized', 'dashboard', 'admin', 
    'student', 'my-classes', 'payment', 'classes', 'calendar', 
    'my-subscriptions', 'subscriptions', 'instructor', 'blog', 
    'auth-status', 'check-admin', 'promote-admin', 'debug'
  ];
  
  if (skipRoutes.includes(firstSegment)) {
    return null;
  }
  
  return firstSegment;
}
