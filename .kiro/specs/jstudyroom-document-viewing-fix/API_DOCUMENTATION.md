# JStudyRoom Document Viewing Fix - API Documentation

## Overview

This document provides comprehensive API documentation for the JStudyRoom document viewing system, including all endpoints, request/response formats, error codes, and integration guidelines.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

All API endpoints require authentication via NextAuth session or API key.

```typescript
// Headers required for all requests
{
  "Authorization": "Bearer <session-token>",
  "Content-Type": "application/json"
}
```

## Core API Endpoints

### 1. Document Pages API

#### GET /api/documents/[id]/pages

Retrieves document pages with automatic conversion triggering.

**Parameters:**
- `id` (string, required): Document UUID

**Query Parameters:**
- `force` (boolean, optional): Force page regeneration
- `quality` (string, optional): Image quality ('low', 'medium', 'high')
- `format` (string, optional): Image format ('webp', 'jpeg', 'png')

**Response:**
```typescript
interface PagesResponse {
  success: boolean;
  documentId: string;
  totalPages: number;
  pages: DocumentPage[];
  status: 'ready' | 'converting' | 'failed' | 'queued';
  progress?: number;
  estimatedCompletion?: string;
  message?: string;
  retryOptions?: RetryOption[];
  cacheInfo?: {
    cached: boolean;
    expiresAt: string;
    version: number;
  };
}

interface DocumentPage {
  pageNumber: number;
  imageUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  generatedAt: string;
}

interface RetryOption {
  type: 'manual' | 'automatic';
  label: string;
  action: string;
  estimatedTime?: number;
}
```

**Status Codes:**
- `200`: Success - Pages retrieved or conversion status returned
- `202`: Accepted - Conversion in progress
- `404`: Document not found
- `403`: Access denied
- `500`: Internal server error

**Example Request:**
```bash
curl -X GET "https://your-domain.com/api/documents/123e4567-e89b-12d3-a456-426614174000/pages" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "success": true,
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "totalPages": 25,
  "status": "ready",
  "pages": [
    {
      "pageNumber": 1,
      "imageUrl": "https://storage.example.com/pages/doc123/page-1.webp",
      "thumbnailUrl": "https://storage.example.com/pages/doc123/thumb-1.webp",
      "width": 1200,
      "height": 1600,
      "fileSize": 245760,
      "format": "webp",
      "generatedAt": "2024-12-17T10:30:00Z"
    }
  ],
  "cacheInfo": {
    "cached": true,
    "expiresAt": "2024-12-24T10:30:00Z",
    "version": 1
  }
}
```

#### GET /api/documents/[id]/pages/[pageNum]

Retrieves a specific page with optimized loading.

**Parameters:**
- `id` (string, required): Document UUID
- `pageNum` (number, required): Page number (1-based)

**Query Parameters:**
- `quality` (string, optional): Image quality
- `format` (string, optional): Image format
- `width` (number, optional): Desired width for resizing
- `height` (number, optional): Desired height for resizing

**Response:**
```typescript
interface PageResponse {
  success: boolean;
  page: DocumentPage;
  nextPage?: DocumentPage;
  previousPage?: DocumentPage;
  preloadUrls?: string[];
}
```

### 2. Conversion Status API

#### GET /api/documents/[id]/conversion-status

Real-time conversion progress and status information.

**Parameters:**
- `id` (string, required): Document UUID

**Response:**
```typescript
interface ConversionStatusResponse {
  success: boolean;
  documentId: string;
  status: 'queued' | 'processing' | 'uploading' | 'finalizing' | 'completed' | 'failed';
  progress: number; // 0-100
  stage: string;
  message: string;
  startedAt?: string;
  estimatedCompletion?: string;
  estimatedTimeRemaining?: number;
  retryCount: number;
  maxRetries: number;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  queueInfo?: {
    position: number;
    totalJobs: number;
    averageProcessingTime: number;
  };
}
```

**Status Codes:**
- `200`: Success - Status retrieved
- `404`: Document or conversion job not found
- `403`: Access denied

**Example Response:**
```json
{
  "success": true,
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "processing",
  "progress": 65,
  "stage": "Converting pages",
  "message": "Processing page 16 of 25",
  "startedAt": "2024-12-17T10:25:00Z",
  "estimatedCompletion": "2024-12-17T10:32:00Z",
  "estimatedTimeRemaining": 420,
  "retryCount": 0,
  "maxRetries": 3,
  "queueInfo": {
    "position": 1,
    "totalJobs": 5,
    "averageProcessingTime": 180
  }
}
```

### 3. Manual Conversion API

#### POST /api/documents/[id]/convert

Manually trigger document conversion with priority options.

**Parameters:**
- `id` (string, required): Document UUID

**Request Body:**
```typescript
interface ConvertRequest {
  priority?: 'high' | 'normal' | 'low';
  force?: boolean; // Force reconversion even if pages exist
  quality?: 'high' | 'medium' | 'low';
  options?: {
    format?: string;
    compression?: number;
    watermark?: boolean;
  };
}
```

**Response:**
```typescript
interface ConvertResponse {
  success: boolean;
  jobId: string;
  documentId: string;
  status: string;
  message: string;
  estimatedCompletion?: string;
  queuePosition?: number;
}
```

**Status Codes:**
- `202`: Accepted - Conversion job created
- `409`: Conflict - Conversion already in progress
- `400`: Bad request - Invalid parameters
- `403`: Access denied
- `429`: Too many requests - Rate limited

### 4. Batch Conversion API

#### POST /api/conversion/batch

Convert multiple documents in a single request.

**Request Body:**
```typescript
interface BatchConvertRequest {
  documentIds: string[];
  priority?: 'high' | 'normal' | 'low';
  maxConcurrent?: number;
  options?: ConversionOptions;
}
```

**Response:**
```typescript
interface BatchConvertResponse {
  success: boolean;
  batchId: string;
  totalDocuments: number;
  estimatedCompletion: string;
  jobs: {
    documentId: string;
    jobId: string;
    status: string;
  }[];
}
```

#### GET /api/conversion/batch/[batchId]

Get batch conversion status.

**Response:**
```typescript
interface BatchStatusResponse {
  success: boolean;
  batchId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'partial';
  progress: number;
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  jobs: ConversionJob[];
  summary: {
    averageProcessingTime: number;
    successRate: number;
    estimatedTimeRemaining?: number;
  };
}
```

### 5. Cache Management API

#### GET /api/conversion/cache

Get cache statistics and status.

**Response:**
```typescript
interface CacheStatusResponse {
  success: boolean;
  statistics: {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    missRate: number;
    evictionCount: number;
  };
  recentActivity: CacheActivity[];
  recommendations: string[];
}
```

#### POST /api/conversion/cache/invalidate

Invalidate cache entries.

**Request Body:**
```typescript
interface CacheInvalidateRequest {
  documentIds?: string[];
  pattern?: string;
  all?: boolean;
}
```

#### POST /api/conversion/cache/warm

Warm cache for specific documents.

**Request Body:**
```typescript
interface CacheWarmRequest {
  documentIds: string[];
  priority?: 'high' | 'normal' | 'low';
}
```

### 6. Monitoring and Analytics API

#### GET /api/monitoring/performance

Get system performance metrics.

**Query Parameters:**
- `timeRange` (string): '1h', '24h', '7d', '30d'
- `metrics` (string[]): Specific metrics to retrieve

**Response:**
```typescript
interface PerformanceResponse {
  success: boolean;
  timeRange: string;
  metrics: {
    documentLoadingSuccessRate: number;
    averageConversionTime: number;
    averageLoadTime: number;
    errorRateByType: Record<string, number>;
    queueDepth: number;
    activeConversions: number;
    cacheHitRate: number;
  };
  trends: {
    metric: string;
    values: { timestamp: string; value: number }[];
  }[];
}
```

#### GET /api/monitoring/alerts

Get active alerts and alert history.

**Response:**
```typescript
interface AlertsResponse {
  success: boolean;
  activeAlerts: Alert[];
  recentAlerts: Alert[];
  alertRules: AlertRule[];
}

interface Alert {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggeredAt: string;
  resolvedAt?: string;
  metadata: Record<string, any>;
}
```

## Error Handling

### Standard Error Response

All API endpoints return errors in a consistent format:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
  retryable?: boolean;
  retryAfter?: number;
}
```

### Error Codes

#### Document Errors
- `DOCUMENT_NOT_FOUND`: Document does not exist
- `DOCUMENT_ACCESS_DENIED`: User lacks permission to access document
- `DOCUMENT_CORRUPTED`: Document file is corrupted or unreadable
- `DOCUMENT_TOO_LARGE`: Document exceeds size limits

#### Conversion Errors
- `CONVERSION_FAILED`: General conversion failure
- `CONVERSION_TIMEOUT`: Conversion took too long
- `CONVERSION_IN_PROGRESS`: Conversion already running
- `CONVERSION_QUEUE_FULL`: Too many conversion jobs queued
- `UNSUPPORTED_FORMAT`: Document format not supported

#### System Errors
- `STORAGE_ERROR`: Storage system unavailable
- `CACHE_ERROR`: Cache system error
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Unexpected system error

### Retry Logic

Implement exponential backoff for retryable errors:

```typescript
const retryableErrors = [
  'STORAGE_ERROR',
  'CACHE_ERROR',
  'INTERNAL_ERROR',
  'CONVERSION_TIMEOUT'
];

async function retryRequest(request: () => Promise<any>, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await request();
    } catch (error) {
      if (!retryableErrors.includes(error.code) || attempt === maxRetries) {
        throw error;
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Rate Limiting

### Limits by Endpoint

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| GET /documents/*/pages | 100 requests | 1 minute |
| POST /documents/*/convert | 10 requests | 1 minute |
| POST /conversion/batch | 5 requests | 1 minute |
| GET /conversion/status | 200 requests | 1 minute |
| Cache operations | 50 requests | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 60
```

## WebSocket API

### Real-time Conversion Updates

Connect to WebSocket for real-time conversion progress:

```typescript
const ws = new WebSocket('wss://your-domain.com/api/websocket/conversion-progress');

ws.onopen = () => {
  // Subscribe to document conversion updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    documentId: '123e4567-e89b-12d3-a456-426614174000'
  }));
};

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Handle progress update
  console.log(`Progress: ${update.progress}%`);
};
```

### WebSocket Message Types

```typescript
// Subscribe to updates
{
  type: 'subscribe',
  documentId: string
}

// Unsubscribe from updates
{
  type: 'unsubscribe',
  documentId: string
}

// Progress update (received)
{
  type: 'progress',
  documentId: string,
  progress: number,
  stage: string,
  message: string,
  estimatedTimeRemaining?: number
}

// Conversion complete (received)
{
  type: 'complete',
  documentId: string,
  totalPages: number,
  processingTime: number
}

// Conversion failed (received)
{
  type: 'error',
  documentId: string,
  error: {
    code: string,
    message: string
  }
}
```

## SDK and Client Libraries

### TypeScript/JavaScript Client

```typescript
import { JStudyRoomAPI } from '@jstudyroom/api-client';

const client = new JStudyRoomAPI({
  baseUrl: 'https://your-domain.com/api',
  apiKey: 'your-api-key'
});

// Get document pages
const pages = await client.documents.getPages('document-id');

// Monitor conversion progress
const progress = client.documents.watchConversion('document-id');
for await (const update of progress) {
  console.log(`Progress: ${update.progress}%`);
}
```

### React Hooks

```typescript
import { useDocumentPages, useConversionStatus } from '@jstudyroom/react-hooks';

function DocumentViewer({ documentId }: { documentId: string }) {
  const { pages, loading, error } = useDocumentPages(documentId);
  const { status, progress } = useConversionStatus(documentId);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {status === 'converting' && (
        <div>Converting... {progress}%</div>
      )}
      {pages.map(page => (
        <img key={page.pageNumber} src={page.imageUrl} alt={`Page ${page.pageNumber}`} />
      ))}
    </div>
  );
}
```

## Testing

### API Testing Examples

```typescript
// Jest test example
describe('Document Pages API', () => {
  test('should return pages for valid document', async () => {
    const response = await request(app)
      .get('/api/documents/valid-doc-id/pages')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
      
    expect(response.body.success).toBe(true);
    expect(response.body.pages).toHaveLength(10);
  });
  
  test('should trigger conversion for document without pages', async () => {
    const response = await request(app)
      .get('/api/documents/no-pages-doc-id/pages')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(202);
      
    expect(response.body.status).toBe('converting');
    expect(response.body.progress).toBeGreaterThanOrEqual(0);
  });
});
```

### Load Testing

```bash
# Artillery load test configuration
artillery run --config artillery.yml --target https://your-domain.com/api
```

## Security

### Authentication
- All endpoints require valid session or API key
- API keys should be rotated regularly
- Rate limiting prevents abuse

### Authorization
- Document access verified against user permissions
- Admin endpoints require elevated privileges
- Audit logging for all operations

### Data Protection
- All data encrypted in transit (HTTPS/WSS)
- Sensitive data encrypted at rest
- PII handling compliant with regulations

## Changelog

### Version 2.1.0 (2024-12-17)
- Added batch conversion API
- Enhanced error handling and retry logic
- Improved WebSocket support
- Added cache management endpoints

### Version 2.0.0 (2024-12-15)
- Complete API redesign for document viewing fix
- Added real-time progress tracking
- Implemented automatic conversion triggering
- Enhanced monitoring and analytics

### Version 1.0.0 (2024-11-01)
- Initial API implementation
- Basic document pages endpoint
- Simple conversion status

## Support

For API support and questions:
- Documentation: https://docs.jstudyroom.com/api
- Support Email: api-support@jstudyroom.com
- GitHub Issues: https://github.com/jstudyroom/api/issues
- Discord: https://discord.gg/jstudyroom-dev