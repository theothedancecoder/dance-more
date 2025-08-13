# Dynamic Favicon System

This document describes the implementation of the dynamic favicon system that automatically uses each tenant's logo as their favicon.

## Overview

The system provides tenant-specific favicons that automatically adapt based on:
- **Subdomain detection**: `danceschool.dancemore.com` → uses `danceschool` tenant's logo
- **Path-based detection**: `dancemore.com/danceschool` → uses `danceschool` tenant's logo
- **Fallback handling**: Uses default favicon when no tenant is detected or no logo exists

## Architecture

### Core Components

1. **`/src/lib/favicon.ts`** - Utility functions for favicon processing
2. **`/src/app/favicon.ico/route.ts`** - Main favicon endpoint (`/favicon.ico`)
3. **`/src/app/api/favicon/route.ts`** - Additional favicon API with debugging
4. **Updated layouts** - Proper favicon metadata configuration

### Key Features

- **Automatic tenant detection** from request headers
- **Image processing** using Sharp to convert logos to ICO format
- **Multiple sizes** support (16x16, 32x32, 48x48, 180x180)
- **Caching** for performance optimization
- **Fallback system** for error handling
- **Debug endpoints** for troubleshooting

## API Endpoints

### `/favicon.ico`
Main favicon endpoint that browsers automatically request.

**Response:**
- Content-Type: `image/x-icon`
- Cache-Control: `public, max-age=3600` (tenant-specific) or `public, max-age=86400` (default)
- Custom headers: `X-Tenant`, `X-School` (for debugging)

### `/api/favicon`
Enhanced favicon API with additional options.

**Query Parameters:**
- `format`: `ico` (default) or `png`
- `size`: `16`, `32`, `48`, `180` (default: 32)
- `debug`: `true` for debugging information

**Examples:**
```
/api/favicon?format=png&size=32
/api/favicon?debug=true
```

## Tenant Detection Logic

The system detects tenants using the following priority:

1. **Subdomain detection**:
   - `tenant.dancemore.com` → `tenant`
   - `tenant.vercel.app` → `tenant`
   - Skips: `www`, `api`, `admin`, `app`

2. **Path-based detection**:
   - `/tenant/page` → `tenant`
   - Skips system routes: `api`, `_next`, `sign-in`, etc.

3. **Localhost handling**:
   - `localhost` → no tenant detection (uses default)

## Image Processing

### Conversion Process
1. Fetch tenant logo from Sanity CDN
2. Resize to multiple standard favicon sizes
3. Convert to ICO format using Sharp
4. Cache processed result

### Supported Input Formats
- PNG, JPEG, WebP, AVIF, TIFF, SVG
- Automatic format detection
- Maintains aspect ratio with center cropping

## Caching Strategy

### In-Memory Cache
- **Duration**: 1 hour for processed favicons
- **Key**: `{tenantSlug}-{logoUrl}`
- **Automatic cleanup**: Expired entries removed on access

### HTTP Cache Headers
- **Tenant-specific**: `max-age=3600` (1 hour)
- **Default favicon**: `max-age=86400` (24 hours)
- **Error fallback**: `max-age=300` (5 minutes)
- **Stale-while-revalidate**: Extended cache with background updates

## Error Handling

### Fallback Chain
1. **Tenant logo processing fails** → Default favicon
2. **Default favicon fails** → Generated blue square
3. **Complete failure** → HTTP 500 with error message

### Logging
- Console logging for debugging
- Tenant detection results
- Processing errors
- Cache statistics

## Testing

### Test Script
Run the test script to verify functionality:

```bash
node test-favicon-system.mjs
```

### Manual Testing
1. **Default favicon**: Visit `http://localhost:3000/favicon.ico`
2. **Debug info**: Visit `http://localhost:3000/api/favicon?debug=true`
3. **Tenant favicon**: 
   - Subdomain: `http://tenant.localhost:3000/favicon.ico`
   - Path: `http://localhost:3000/tenant` (favicon auto-requested)

### Browser Testing
- Check browser dev tools Network tab for favicon requests
- Verify correct Content-Type headers
- Test caching behavior with multiple requests

## Configuration

### Environment Variables
- `NEXT_PUBLIC_BASE_DOMAIN`: Production domain (default: `dancemore.com`)
- `NEXT_PUBLIC_VERCEL_PROJECT_NAME`: Vercel project name for preview domains

### Sanity Schema
Ensure tenant schema includes logo field:
```javascript
defineField({
  name: 'logo',
  title: 'School Logo',
  type: 'image',
  options: {
    hotspot: true,
  },
})
```

## Performance Considerations

### Optimization Strategies
- **Lazy loading**: Favicons processed only when requested
- **Efficient caching**: Reduces repeated processing
- **Sharp optimization**: Fast image processing
- **Proper HTTP headers**: Browser caching

### Monitoring
- Cache hit/miss ratios
- Processing time metrics
- Error rates by tenant
- Memory usage of cache

## Deployment Notes

### Production Checklist
- [ ] Verify Sharp is installed in production environment
- [ ] Test subdomain routing configuration
- [ ] Validate CDN caching behavior
- [ ] Monitor favicon request performance
- [ ] Set up error alerting for favicon failures

### Vercel Deployment
- Sharp works out-of-the-box on Vercel
- Edge runtime not supported (uses Node.js runtime)
- Automatic subdomain routing for preview deployments

## Troubleshooting

### Common Issues

1. **Favicon not updating**:
   - Clear browser cache
   - Check cache headers
   - Verify tenant detection

2. **Sharp errors**:
   - Ensure Sharp is installed
   - Check image format compatibility
   - Verify memory limits

3. **Tenant not detected**:
   - Use debug endpoint to check detection logic
   - Verify hostname/path configuration
   - Check middleware routing

### Debug Commands
```bash
# Test favicon endpoint
curl -I http://localhost:3000/favicon.ico

# Check tenant detection
curl http://localhost:3000/api/favicon?debug=true

# Test with custom host header
curl -H "Host: tenant.localhost:3000" -I http://localhost:3000/favicon.ico
```

## Future Enhancements

### Potential Improvements
- **Redis caching** for distributed deployments
- **WebP favicon support** for modern browsers
- **Animated favicon support** for special events
- **Favicon analytics** tracking
- **A/B testing** for favicon effectiveness
- **Automatic favicon generation** from brand colors when no logo exists

### Browser Support
- **ICO format**: Universal support
- **PNG format**: Modern browsers
- **Multiple sizes**: Automatic selection by browser
- **Apple touch icons**: iOS/macOS support
