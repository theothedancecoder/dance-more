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
        !pathSegments[1].startsWith('studio')) {
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
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
