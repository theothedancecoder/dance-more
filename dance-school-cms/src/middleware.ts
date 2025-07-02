import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/student(.*)',
  '/dashboard(.*)',
  '/api/auth/status(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Handle tenant detection
  const host = req.headers.get('host') || '';
  const url = req.nextUrl.clone();
  
  // Skip middleware for public routes and Clerk authentication
  const publicPaths = [
    '/sign-in',
    '/sign-up',
    '/.clerk',
    '/register-school',
    '/api/webhooks/clerk',
    '/api/tenants/register'
  ];

  if (publicPaths.some(path => url.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Extract tenant identifier
  let tenantIdentifier: string | null = null;
  
  if (host.includes('.') && !host.startsWith('localhost')) {
    // Subdomain approach (e.g., abc.mydanceschool.com)
    const subdomain = host.split('.')[0];
    if (subdomain !== 'www' && subdomain !== 'mydanceschool') {
      tenantIdentifier = subdomain;
    }
  } else {
    // Path-based approach (e.g., mydanceschool.com/abc)
    const pathSegments = url.pathname.split('/');
    if (pathSegments.length > 1 && pathSegments[1] && 
        !pathSegments[1].startsWith('api') && 
        !pathSegments[1].startsWith('_next') &&
        !pathSegments[1].startsWith('sign-') &&
        !pathSegments[1].startsWith('studio') &&
        !pathSegments[1].startsWith('.clerk')) {
      tenantIdentifier = pathSegments[1];
    }
  }
  
  // Create response
  const response = NextResponse.next();
  
  // Set tenant identifier in headers for API routes to access
  if (tenantIdentifier) {
    response.headers.set('x-tenant-id', tenantIdentifier);
  }
  
  // Handle protected routes
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
  
  return response;
})

export const config = {
  matcher: [
    // Match all routes except static files and Clerk auth routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(svg|png|jpg|jpeg|gif|webp|ico)|.clerk|sign-in|sign-up).*)',
    // Match API routes except Clerk webhooks and public endpoints
    '/api/(?!webhooks/clerk|tenants/register).*'
  ],
}
