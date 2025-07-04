import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { client } from './lib/sanity'

const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/student(.*)',
  '/dashboard(.*)',
  '/my-classes(.*)',
  '/payment(.*)',
  '/api/admin(.*)',
  '/instructor(.*)',
])

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/register-school(.*)',
  '/unauthorized',
  '/api/webhooks(.*)',
  '/api/tenants/register',
  '/studio(.*)',
  '/.clerk(.*)',
  '/debug(.*)',
  '/api/debug/(.*)', // Allow debug API endpoints
])

async function getUserByClerkId(clerkId: string) {
  const query = `*[_type == "user" && clerkId == $clerkId][0]{
    _id,
    tenant->{_id, "slug": slug.current},
    role
  }`
  const user = await client.fetch(query, { clerkId });

  if (!user) {
    console.warn(`⚠️ No Sanity user found for clerkId: ${clerkId}`);
  }

  return user;
}

function requiresAdminRole(pathSegments: string[]) {
  return pathSegments.includes('admin');
}

// Extract tenant from host (subdomain)
function getTenantFromHost(host: string): string | null {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dancemore.com';

  if (host.includes('localhost') || host === baseDomain) {
    return null;
  }

  const [subdomain] = host.replace(`.${baseDomain}`, '').split('.');

  return subdomain;
}

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl.clone();
  const host = req.headers.get('host') || '';

  // Skip middleware for public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Try to get tenant from subdomain first
  let tenantSlug = getTenantFromHost(host);

  // If no tenant from subdomain, try path-based routing
  if (!tenantSlug) {
    const pathSegments = url.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      const firstSegment = pathSegments[0];
      // Skip known non-tenant routes
      const skipRoutes = [
        'api', '_next', 'sign-in', 'sign-up', 'studio', '.clerk', 
        'register-school', 'unauthorized',
        'dashboard', 'admin', 'student', 'my-classes', 'payment',
        'classes', 'calendar', 'my-subscriptions', 'subscriptions',
        'instructor', 'blog', 'auth-status', 'check-admin', 'promote-admin', 'debug'
      ];
      if (!skipRoutes.includes(firstSegment)) {
        tenantSlug = firstSegment;
      }
    }
  }

    // For protected routes, check authentication first
    if (isProtectedRoute(req)) {
      console.log('Protected route detected, checking auth...');
      console.log('URL path:', req.nextUrl.pathname);
      console.log('Path segments:', req.nextUrl.pathname.split('/').filter(Boolean));
      const { userId } = await auth();
      
      console.log('userId from Clerk:', userId);

    // If not authenticated, let Clerk handle the redirect
    if (!userId) {
      const { userId: protectedUserId } = await auth.protect();
      console.log('UserId from auth.protect():', protectedUserId);
      return NextResponse.next();
    }

    // Get user from Sanity to check their tenant and role
    const user = await getUserByClerkId(userId);
    
    // For non-tenant routes (like /dashboard), just check if user exists
    if (!tenantSlug) {
      if (!user) {
        return NextResponse.redirect(new URL('/register-school', req.url));
      }
      return NextResponse.next();
    }

    // For tenant-specific routes, validate tenant and user's access
    if (tenantSlug) {
      try {
        // Fetch tenant from Sanity
        const tenant = await client.fetch(
          `*[_type == "tenant" && slug.current == $slug && status == "active"][0]`,
          { slug: tenantSlug }
        );

        if (!tenant) {
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }

        // Check if user belongs to this tenant
        console.log('🔍 Tenant validation:', {
          userExists: !!user,
          userTenant: user?.tenant?.slug,
          expectedTenant: tenantSlug,
          userRole: user?.role
        });
        
        if (!user || !user.tenant || user.tenant.slug !== tenantSlug) {
          console.log('❌ User access denied:', {
            reason: !user ? 'No user found' : !user.tenant ? 'No tenant assigned' : 'Tenant mismatch',
            userTenant: user?.tenant?.slug,
            expectedTenant: tenantSlug
          });
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }

        // For admin routes, check admin role
        const pathSegments = url.pathname.split('/').filter(Boolean);
        if (requiresAdminRole(pathSegments) && user.role.toLowerCase() !== 'admin') {
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }

        // Set tenant and user info in headers
        const response = NextResponse.next();
        response.headers.set('x-tenant-id', tenant._id);
        response.headers.set('x-tenant-slug', tenantSlug);
        response.headers.set('x-user-id', user._id);
        response.headers.set('x-user-role', user.role);
        response.headers.set('x-clerk-user-id', userId);
        return response;

      } catch (error) {
        console.error('Middleware error:', error);
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }
  }

  // For non-protected routes with tenant, just validate and set tenant info
  if (tenantSlug) {
    try {
      const tenant = await client.fetch(
        `*[_type == "tenant" && slug.current == $slug && status == "active"][0]`,
        { slug: tenantSlug }
      );

      if (!tenant) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }

      const response = NextResponse.next();
      response.headers.set('x-tenant-id', tenant._id);
      response.headers.set('x-tenant-slug', tenantSlug);
      return response;

    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  return NextResponse.next();
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\..*|_next).*)',
  ],
}
