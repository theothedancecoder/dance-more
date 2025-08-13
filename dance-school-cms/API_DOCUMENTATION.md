# Dance School CMS - Public API Documentation

This document describes the public API endpoints available for the Dance School CMS system.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

Public endpoints do not require authentication. All endpoints return JSON responses.

## Rate Limiting

Public endpoints are rate-limited to prevent abuse:
- **Rate Limit**: 100 requests per minute per IP address
- **Headers**: Rate limit information is included in response headers

## Endpoints

### Tenants

#### Get All Active Tenants

```http
GET /api/tenants/public
```

Returns a paginated list of all active dance school tenants.

**Query Parameters:**
- `limit` (optional): Number of results per page (max 50, default 20)
- `offset` (optional): Number of results to skip (default 0)
- `sortBy` (optional): Field to sort by (`schoolName`, `_createdAt`, `_updatedAt`) (default `schoolName`)
- `sortOrder` (optional): Sort order (`asc`, `desc`) (default `asc`)

**Example Request:**
```http
GET /api/tenants/public?limit=10&offset=0&sortBy=schoolName&sortOrder=asc
```

**Example Response:**
```json
{
  "tenants": [
    {
      "_id": "tenant123",
      "schoolName": "Dancecity",
      "slug": {
        "_type": "slug",
        "current": "dancecity"
      },
      "description": "Premier dance school in the city",
      "branding": {
        "primaryColor": "#3B82F6",
        "secondaryColor": "#1F2937",
        "accentColor": "#F59E0B"
      },
      "logo": {
        "_type": "image",
        "asset": {
          "_id": "image-abc123",
          "url": "https://cdn.sanity.io/images/project/dataset/abc123.png",
          "originalFilename": "logo.png",
          "size": 12345,
          "mimeType": "image/png"
        }
      },
      "_createdAt": "2024-01-01T00:00:00Z",
      "_updatedAt": "2024-01-15T12:00:00Z",
      "classCount": 25,
      "upcomingClasses": 15,
      "totalStudents": 150
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  },
  "meta": {
    "sortBy": "schoolName",
    "sortOrder": "asc",
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

#### Search Tenants

```http
GET /api/tenants/public/search
```

Search for dance school tenants by name or description.

**Query Parameters:**
- `q` (required): Search query string
- `limit` (optional): Number of results per page (max 50, default 20)
- `offset` (optional): Number of results to skip (default 0)

**Example Request:**
```http
GET /api/tenants/public/search?q=dance&limit=5
```

**Example Response:**
```json
{
  "tenants": [
    {
      "_id": "tenant123",
      "schoolName": "Dancecity",
      "slug": {
        "_type": "slug",
        "current": "dancecity"
      },
      "description": "Premier dance school in the city",
      "branding": {
        "primaryColor": "#3B82F6",
        "secondaryColor": "#1F2937",
        "accentColor": "#F59E0B"
      },
      "logo": {
        "_type": "image",
        "asset": {
          "_id": "image-abc123",
          "url": "https://cdn.sanity.io/images/project/dataset/abc123.png",
          "originalFilename": "logo.png",
          "size": 12345,
          "mimeType": "image/png"
        }
      },
      "classCount": 25,
      "upcomingClasses": 15
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 5,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Get Specific Tenant

```http
GET /api/tenants/{slug}/public
```

Get detailed information about a specific dance school tenant.

**Path Parameters:**
- `slug` (required): The tenant's unique slug identifier

**Example Request:**
```http
GET /api/tenants/dancecity/public
```

**Example Response:**
```json
{
  "_id": "tenant123",
  "schoolName": "Dancecity",
  "slug": {
    "_type": "slug",
    "current": "dancecity"
  },
  "status": "active",
  "description": "Premier dance school in the city",
  "branding": {
    "primaryColor": "#3B82F6",
    "secondaryColor": "#1F2937",
    "accentColor": "#F59E0B"
  },
  "logo": {
    "_type": "image",
    "asset": {
      "_id": "image-abc123",
      "url": "https://cdn.sanity.io/images/project/dataset/abc123.png",
      "originalFilename": "logo.png",
      "size": 12345,
      "mimeType": "image/png"
    }
  },
  "stripeConnect": {
    "accountId": "acct_123456789",
    "accountStatus": "active",
    "chargesEnabled": true,
    "connectedAt": "2024-01-01T00:00:00Z",
    "country": "NO",
    "lastSyncAt": "2024-01-15T12:00:00Z",
    "onboardingCompleted": true,
    "payoutsEnabled": true
  },
  "settings": {
    "allowPublicRegistration": true
  }
}
```

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request parameters",
  "details": "Limit parameter must be between 1 and 50"
}
```

### 404 Not Found
```json
{
  "error": "Tenant not found or inactive"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch tenant data"
}
```

## Response Headers

All responses include the following headers:

- `Content-Type`: `application/json`
- `X-RateLimit-Limit`: Maximum requests per minute
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when rate limit resets

## Data Types

### Tenant Object

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Unique identifier |
| `schoolName` | string | Display name of the dance school |
| `slug` | object | URL-friendly identifier |
| `status` | string | Tenant status (`active`, `inactive`, `suspended`) |
| `description` | string | School description |
| `branding` | object | Brand colors and styling |
| `logo` | object | School logo image |
| `stripeConnect` | object | Payment processing information |
| `settings` | object | School configuration |
| `classCount` | number | Total number of active classes |
| `upcomingClasses` | number | Number of upcoming class instances |
| `totalStudents` | number | Total enrolled students |

### Pagination Object

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of results |
| `limit` | number | Results per page |
| `offset` | number | Number of results skipped |
| `hasMore` | boolean | Whether more results are available |

## Usage Examples

### JavaScript/TypeScript

```typescript
// Get all tenants
const response = await fetch('/api/tenants/public?limit=10');
const data = await response.json();

// Search tenants
const searchResponse = await fetch('/api/tenants/public/search?q=dance');
const searchData = await searchResponse.json();

// Get specific tenant
const tenantResponse = await fetch('/api/tenants/dancecity/public');
const tenantData = await tenantResponse.json();
```

### cURL

```bash
# Get all tenants
curl -X GET "https://your-domain.com/api/tenants/public?limit=10"

# Search tenants
curl -X GET "https://your-domain.com/api/tenants/public/search?q=dance"

# Get specific tenant
curl -X GET "https://your-domain.com/api/tenants/dancecity/public"
```

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial release of public tenant API
- Added tenant listing, search, and detail endpoints
- Implemented pagination and sorting
- Added rate limiting and error handling
