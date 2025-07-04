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

const isDebugRoute = createRouteMatcher([
  '/debug(.*)',
  '/api/debug/(.*)',
])

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/register-school(.*)',
  '/unauthorized',
  '/api/webhooks(.*)',
  '/api/tenants/register',
  '/api/tenants/validate',
  '/studio(.*)',
  '/.clerk(.*)',
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

  // Block debug routes in production
  if (isDebugRoute(req) && process.env.NODE_ENV === 'production') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  // Skip middleware for public routes and debug routes in development
  if (isPublicRoute(req) || (isDebugRoute(req) && process.env.NODE_ENV === 'development')) {
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
    const { userId } = await auth();
    
    // If not authenticated, handle based on route type
    if (!userId) {
      // For API routes, return 401 instead of redirecting
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // For web routes, redirect to sign in
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
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
          // For API routes, return 403 instead of redirecting
          if (req.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json(
              { error: 'Invalid or inactive tenant' },
              { status: 403 }
            );
          }
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }

        // Check if user belongs to this tenant
        if (!user || !user.tenant || user.tenant.slug !== tenantSlug) {
          // For API routes, return 403 instead of redirecting
          if (req.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json(
              { error: 'User does not have access to this tenant' },
              { status: 403 }
            );
          }
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }

        // For admin routes, check admin role
        const pathSegments = url.pathname.split('/').filter(Boolean);
        if (requiresAdminRole(pathSegments) && user.role.toLowerCase() !== 'admin') {
          // For API routes, return 403 instead of redirecting
          if (req.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json(
              { error: 'Admin access required' },
              { status: 403 }
            );
          }
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
        // For API routes, return 500 instead of redirecting
        if (req.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        }
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
