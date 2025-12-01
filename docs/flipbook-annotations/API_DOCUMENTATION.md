# Flipbook & Media Annotations - API Documentation

## Overview

This document provides comprehensive API documentation for the Flipbook Viewer and Media Annotations system.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

All API endpoints require authentication via session cookies. Include credentials in requests:

```typescript
fetch('/api/endpoint', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
```

---

## Document Conversion API

### Convert Document to Pages

Converts a PDF document into flipbook-ready page images.

**Endpoint**: `POST /api/documents/convert`

**Request Body**:
```json
{
  "documentId": "string",
  "quality": "high" | "medium" | "low" (optional, default: "high")
}
```

**Response**:
```json
{
  "success": true,
  "jobId": "string",
  "status": "queued" | "processing" | "completed" | "failed",
  "totalPages": number
}
```

**Status Codes**:
- `200`: Conversion started successfully
- `400`: Invalid request
- `401`: Unauthorized
- `404`: Document not found
- `500`: Server error

---

### Get Document Pages

Retrieves all page URLs for a converted document.

**Endpoint**: `GET /api/documents/:id/pages`

**Parameters**:
- `id` (path): Document ID

**Response**:
```json
{
  "success": true,
  "pages": [
    {
      "pageNumber": number,
      "url": "string",
      "width": number,
      "height": number
    }
  ],
  "totalPages": number
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `404`: Document not found
- `500`: Server error

---

### Get Single Page

Retrieves a specific page image URL.

**Endpoint**: `GET /api/pages/:docId/:pageNum`

**Parameters**:
- `docId` (path): Document ID
- `pageNum` (path): Page number (1-indexed)

**Response**:
```json
{
  "success": true,
  "url": "string",
  "pageNumber": number,
  "width": number,
  "height": number
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `404`: Page not found
- `500`: Server error

---

## Annotations API

### List Annotations

Retrieves annotations for a document with filtering and pagination.

**Endpoint**: `GET /api/annotations`

**Query Parameters**:
- `documentId` (required): Document ID
- `pageNumber` (optional): Filter by page number
- `mediaType` (optional): Filter by media type (`AUDIO` | `VIDEO`)
- `visibility` (optional): Filter by visibility (`public` | `private`)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

**Response**:
```json
{
  "success": true,
  "annotations": [
    {
      "id": "string",
      "documentId": "string",
      "userId": "string",
      "pageNumber": number,
      "selectedText": "string",
      "mediaType": "AUDIO" | "VIDEO",
      "mediaUrl": "string",
      "mediaSource": "upload" | "external",
      "description": "string",
      "visibility": "public" | "private",
      "position": {
        "x": number,
        "y": number
      },
      "createdAt": "string",
      "updatedAt": "string",
      "user": {
        "id": "string",
        "name": "string",
        "email": "string"
      }
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid parameters
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Server error

---

### Create Annotation

Creates a new media annotation.

**Endpoint**: `POST /api/annotations`

**Request Body**:
```json
{
  "documentId": "string",
  "pageNumber": number,
  "selectedText": "string",
  "mediaType": "AUDIO" | "VIDEO",
  "mediaUrl": "string",
  "mediaSource": "upload" | "external",
  "description": "string" (optional),
  "visibility": "public" | "private" (optional, default: "public"),
  "position": {
    "x": number,
    "y": number
  }
}
```

**Response**:
```json
{
  "success": true,
  "annotation": {
    "id": "string",
    "documentId": "string",
    "userId": "string",
    "pageNumber": number,
    "selectedText": "string",
    "mediaType": "AUDIO" | "VIDEO",
    "mediaUrl": "string",
    "mediaSource": "upload" | "external",
    "description": "string",
    "visibility": "public" | "private",
    "position": {
      "x": number,
      "y": number
    },
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

**Status Codes**:
- `201`: Created successfully
- `400`: Invalid request
- `401`: Unauthorized
- `403`: Forbidden (not a platform user)
- `500`: Server error

---

### Get Annotation

Retrieves a single annotation by ID.

**Endpoint**: `GET /api/annotations/:id`

**Parameters**:
- `id` (path): Annotation ID

**Response**:
```json
{
  "success": true,
  "annotation": {
    "id": "string",
    "documentId": "string",
    "userId": "string",
    "pageNumber": number,
    "selectedText": "string",
    "mediaType": "AUDIO" | "VIDEO",
    "mediaUrl": "string",
    "mediaSource": "upload" | "external",
    "description": "string",
    "visibility": "public" | "private",
    "position": {
      "x": number,
      "y": number
    },
    "createdAt": "string",
    "updatedAt": "string",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  }
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not found
- `500`: Server error

---

### Update Annotation

Updates an existing annotation (owner only).

**Endpoint**: `PATCH /api/annotations/:id`

**Parameters**:
- `id` (path): Annotation ID

**Request Body**:
```json
{
  "description": "string" (optional),
  "visibility": "public" | "private" (optional),
  "mediaUrl": "string" (optional)
}
```

**Response**:
```json
{
  "success": true,
  "annotation": {
    "id": "string",
    "documentId": "string",
    "userId": "string",
    "pageNumber": number,
    "selectedText": "string",
    "mediaType": "AUDIO" | "VIDEO",
    "mediaUrl": "string",
    "mediaSource": "upload" | "external",
    "description": "string",
    "visibility": "public" | "private",
    "position": {
      "x": number,
      "y": number
    },
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

**Status Codes**:
- `200`: Updated successfully
- `400`: Invalid request
- `401`: Unauthorized
- `403`: Forbidden (not owner)
- `404`: Not found
- `500`: Server error

---

### Delete Annotation

Deletes an annotation (owner only).

**Endpoint**: `DELETE /api/annotations/:id`

**Parameters**:
- `id` (path): Annotation ID

**Response**:
```json
{
  "success": true,
  "message": "Annotation deleted successfully"
}
```

**Status Codes**:
- `200`: Deleted successfully
- `401`: Unauthorized
- `403`: Forbidden (not owner)
- `404`: Not found
- `500`: Server error

---

## Media Upload API

### Upload Media File

Uploads an audio or video file for annotations.

**Endpoint**: `POST /api/media/upload`

**Request**: `multipart/form-data`

**Form Fields**:
- `file`: Media file (MP3, WAV, MP4, WEBM, max 100MB)
- `documentId`: Document ID
- `mediaType`: `AUDIO` | `VIDEO`

**Response**:
```json
{
  "success": true,
  "mediaUrl": "string",
  "mediaType": "AUDIO" | "VIDEO",
  "fileSize": number,
  "duration": number (optional)
}
```

**Status Codes**:
- `200`: Uploaded successfully
- `400`: Invalid file or parameters
- `401`: Unauthorized
- `403`: Forbidden
- `413`: File too large
- `500`: Server error

---

### Stream Media

Streams media content with access control.

**Endpoint**: `GET /api/media/stream/:annotationId`

**Parameters**:
- `annotationId` (path): Annotation ID

**Response**: Media file stream with appropriate headers

**Headers**:
- `Content-Type`: `audio/*` or `video/*`
- `Content-Length`: File size
- `Accept-Ranges`: `bytes`
- `Cache-Control`: `private, max-age=3600`

**Status Codes**:
- `200`: Success
- `206`: Partial content (range request)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not found
- `500`: Server error

---

## Error Reporting API

### Report Error

Reports client-side errors for monitoring.

**Endpoint**: `POST /api/errors/report`

**Request Body**:
```json
{
  "error": {
    "message": "string",
    "stack": "string",
    "code": "string" (optional)
  },
  "context": {
    "component": "string",
    "action": "string",
    "documentId": "string" (optional),
    "pageNumber": number (optional)
  },
  "userAgent": "string",
  "url": "string"
}
```

**Response**:
```json
{
  "success": true,
  "errorId": "string"
}
```

**Status Codes**:
- `200`: Reported successfully
- `400`: Invalid request
- `500`: Server error

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Annotation Creation**: 100 requests per hour per user
- **Media Upload**: 50 requests per hour per user
- **General API**: 1000 requests per hour per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} (optional)
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `FILE_TOO_LARGE`: File exceeds size limit
- `INVALID_FILE_TYPE`: Unsupported file format
- `CONVERSION_FAILED`: PDF conversion error
- `UPLOAD_FAILED`: Media upload error
- `INTERNAL_ERROR`: Server error

---

## Webhooks (Future)

Webhook support for real-time updates:

- `annotation.created`: New annotation created
- `annotation.updated`: Annotation modified
- `annotation.deleted`: Annotation removed
- `document.converted`: Document conversion completed

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Create annotation
const response = await fetch('/api/annotations', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    documentId: 'doc-123',
    pageNumber: 5,
    selectedText: 'Important text',
    mediaType: 'AUDIO',
    mediaUrl: 'https://example.com/audio.mp3',
    mediaSource: 'external',
    description: 'Explanation of the concept'
  })
});

const data = await response.json();
```

### Upload Media

```typescript
const formData = new FormData();
formData.append('file', audioFile);
formData.append('documentId', 'doc-123');
formData.append('mediaType', 'AUDIO');

const response = await fetch('/api/media/upload', {
  method: 'POST',
  credentials: 'include',
  body: formData
});

const data = await response.json();
```

---

## Versioning

API Version: `v1`

Future versions will be accessible via:
```
/api/v2/annotations
```

---

## Support

For API support:
- Email: api-support@jstudyroom.com
- Documentation: /docs/api
- Status Page: /status

Last Updated: December 1, 2024
