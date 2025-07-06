# Routing Fixes for Localhost vs Vercel Deployment Issues

This document outlines the fixes implemented to resolve routing differences between localhost and Vercel deployments in the multi-tenant Next.js dance school CMS.

## Issues Identified

1. **Hardcoded Domain References**: The original `getTenantFromHost` function only handled custom domains, not Vercel's domain structure
2. **Environment-Dependent Middleware Logic**: Different behavior in production vs development
3. **Missing Vercel Configuration**: No rewrites/redirects for proper multi-tenant routing
4. **Client-Side Window Dependencies**: Browser-specific code that could fail during SSR
5. **Inconsistent Tenant Detection**: Multiple methods without proper fallbacks

## Fixes Implemented

### 1. Enhanced Middleware (`src/middleware.ts`)

**Key Changes:**
- Updated `getTenantFromHost` function to handle:
  - `localhost` (bypasses tenant detection)
  - Vercel domains (`tenant.vercel.app` or `project-name.vercel.app`)
  - Production domains (`tenant.dancemore.com`)
  - Custom domains with fallback logic
- Added `NEXT_PUBLIC_VERCEL_PROJECT_NAME` environment variable support
- Improved logging with hostname information
- Better error handling for different environments

**Example Domain Handling:**
```typescript
// Localhost: localhost:3000 → no tenant
// Vercel: tenant.vercel.app → "tenant"
// Vercel: dance-school-cms.vercel.app → no tenant
// Production: tenant.dancemore.com → "tenant"
// Production: dancemore.com → no tenant
```

### 2. Updated TenantContext (`src/contexts/TenantContext.tsx`)

**Key Changes:**
- Consistent tenant detection logic matching middleware
- Better handling of Vercel preview domains
- Improved error handling and fallbacks
- Environment-aware subdomain extraction

### 3. Enhanced AuthRedirect (`src/components/AuthRedirect.tsx`)

**Key Changes:**
- Environment-aware redirect logic
- Proper handling of different domain structures
- Consistent tenant context detection
- Better error handling for production environments

### 4. New Utility Functions (`src/lib/url-utils.ts`)

**Features:**
- `getTenantFromHostname()`: Extract tenant from any hostname
- `getDomainInfo()`: Get comprehensive domain information
- `buildTenantUrl()`: Build correct URLs for tenant routes
- `isOnCorrectTenantContext()`: Check if current context matches tenant
- `getBaseUrl()`: Get environment-appropriate base URL

### 5. Vercel Configuration (`vercel.json`)

**Added:**
- Function timeout configuration
- Security headers
- Redirect rules for www subdomain
- API route preservation

### 6. Environment Variables (`.env.example`)

**Required Variables:**
```env
NEXT_PUBLIC_BASE_DOMAIN=dancemore.com
NEXT_PUBLIC_VERCEL_PROJECT_NAME=dance-school-cms
```

### 7. Next.js Configuration (`next.config.js`)

**Enhancements:**
- Environment variable exposure
- Security headers
- Vercel deployment optimizations
- Package import optimizations

## Deployment Instructions

### 1. Environment Variables Setup

In your Vercel dashboard, add these environment variables:

```env
NEXT_PUBLIC_BASE_DOMAIN=your-domain.com
NEXT_PUBLIC_VERCEL_PROJECT_NAME=your-vercel-project-name
```

**To find your Vercel project name:**
1. Go to your Vercel dashboard
2. Look at your project URL: `https://your-project-name.vercel.app`
3. The project name is the part before `.vercel.app`

### 2. Custom Domain Setup (Optional)

If using custom domains:

1. **Add Domain in Vercel:**
   - Go to Project Settings → Domains
   - Add your domain (e.g., `dancemore.com`)
   - Add wildcard subdomain (`*.dancemore.com`)

2. **DNS Configuration:**
   ```
   Type: CNAME
   Name: *
   Value: cname.vercel-dns.com
   ```

### 3. Testing Different Scenarios

**Localhost Testing:**
```bash
# Path-based routing
http://localhost:3000/tenant-slug/admin
http://localhost:3000/tenant-slug/classes
```

**Vercel Preview Testing:**
```bash
# Main app
https://your-project.vercel.app

# Path-based routing
https://your-project.vercel.app/tenant-slug/admin

# Subdomain (if configured)
https://tenant-slug.vercel.app
```

**Production Testing:**
```bash
# Main domain
https://yourdomain.com

# Tenant subdomain
https://tenant-slug.yourdomain.com

# Path-based fallback
https://yourdomain.com/tenant-slug/admin
```

## Troubleshooting

### Common Issues

1. **Tenant not detected on Vercel:**
   - Check `NEXT_PUBLIC_VERCEL_PROJECT_NAME` matches your actual project name
   - Verify environment variables are set in Vercel dashboard

2. **Subdomain routing not working:**
   - Ensure wildcard domain is configured in Vercel
   - Check DNS settings for wildcard CNAME

3. **Middleware errors:**
   - Check Vercel function logs
   - Verify Sanity connection and API tokens

### Debug Information

The middleware now logs detailed information:
```javascript
console.log('🔍 Middleware user check:', {
  userId,
  userFound: !!user,
  userRole: user?.role,
  userTenant: user?.tenant?.slug,
  requestPath: req.nextUrl.pathname,
  tenantSlug,
  host // Now includes hostname for debugging
});
```

### Testing Checklist

- [ ] Localhost development works with path-based routing
- [ ] Vercel preview deployment works
- [ ] Production deployment with custom domain works
- [ ] Subdomain routing works (if configured)
- [ ] Authentication redirects work correctly
- [ ] API routes respect tenant context
- [ ] Direct URL access works (not just navigation)

## Migration Notes

If upgrading from the previous version:

1. **Add new environment variables** to your Vercel project
2. **Update your local `.env`** file with the new variables
3. **Test thoroughly** in preview deployment before promoting to production
4. **Monitor logs** for any tenant detection issues

## Performance Considerations

- Middleware now includes hostname in logging for better debugging
- URL utility functions are optimized for different environments
- Vercel configuration includes package import optimizations
- Security headers are added for better performance and security

## Security Improvements

- Added security headers in both Vercel config and Next.js config
- Improved error handling to prevent information leakage
- Better validation of tenant access and permissions
- Enhanced CORS and security policy headers
