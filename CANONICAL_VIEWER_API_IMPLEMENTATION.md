# Canonical Viewer API Implementation

## Overview

This implementation provides a robust, secure PDF page viewing pipeline that fixes the "blank pages" issue by creating a canonical API for document viewing. The solution ensures consistent behavior across all dashboards while maintaining DRM protection and role-based authorization.

## Architecture

### 1. Server-Only Supabase Client (`lib/supabase/server.ts`)
- Uses service role key for full storage access
- Bypasses bucket privacy settings and RLS policies
- Provides secure server-side storage operations
- Never exposes storage credentials to client

### 2. Authorization Helper (`lib/authz/canViewDocument.ts`)
- Implements role-based access control:
  - **Admin**: Can view any document
  - **Platform User**: Can view owned documents and shared content
  - **Member**: Can view MyJstudyroom items and approved shares
- Returns detailed authorization results with document metadata
- Supports both direct access and share link access

### 3. Canonical Viewer APIs

#### Pages List API (`/api/viewer/documents/[id]/pages`)
- Returns lightweight JSON with available page numbers
- Enforces authorization before revealing page structure
- Returns appropriate HTTP status codes:
  - `200`: Success with pages list
  - `401`: Authentication required
  - `403`: Access denied
  - `404`: Document not found
  - `409`: Document exists but pages not generated

#### Page Image API (`/api/viewer/documents/[id]/pages/[pageNum]`)
- Streams binary image data directly from private storage
- Uses server credentials to access private buckets
- Sets DRM-safe cache headers (`private, max-age=0, no-store`)
- Returns proper Content-Type headers for images
- Never exposes direct storage URLs to client

#### Diagnostics API (`/api/viewer/diagnose/[id]`)
- Comprehensive health check for troubleshooting
- Tests authorization, database integrity, and storage access
- Provides actionable recommendations for fixing issues
- Masks sensitive information in responses

## Security Features

### DRM Protection
- Buckets remain private at all times
- No direct storage URLs exposed to client
- Server-side streaming prevents URL extraction
- Cache headers prevent browser caching
- X-Frame-Options prevents embedding

### Authorization
- Session validation on every request
- Role-based access control
- Document ownership verification
- Share link validation with expiration
- Email restriction support

### Error Handling
- Structured error responses with appropriate HTTP codes
- No information leakage in error messages
- Comprehensive logging for debugging
- Graceful degradation for missing data

## Client-Side Updates

### SimpleDocumentViewer
- Updated to use canonical API for page loading
- Maintains backward compatibility with direct PDF URLs
- Integrated debug panel for development
- Enhanced error handling with specific messages

### UnifiedViewer
- Modified to use canonical API for PDF documents
- Removes dependency on direct storage URLs
- Consistent behavior across all content types

### Debug Panel
- Development-only diagnostic tool
- Real-time health monitoring
- Issue identification and recommendations
- Collapsible interface with detailed checks

## Database Schema Requirements

The implementation assumes the following database structure:

```sql
-- Documents table
Document {
  id: String (primary key)
  title: String
  userId: String (owner)
  filename: String
  mimeType: String
  // ... other fields
}

-- Document pages table
DocumentPage {
  id: String (primary key)
  documentId: String (foreign key)
  pageNumber: Int (1-based)
  pageUrl: String (storage path)
  fileSize: Int
  format: String (jpeg/png)
  // ... other fields
}
```

## Storage Structure

Expected Supabase storage structure:
```
document-pages/
├── {documentId}/
│   ├── page-1.jpg
│   ├── page-2.jpg
│   └── ...
```

## Environment Variables

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... # Server-only key
```

## Usage Examples

### Basic Document Viewing
```typescript
// Load pages list
const response = await fetch(`/api/viewer/documents/${documentId}/pages`);
const data = await response.json();

// Display pages using canonical URLs
data.pages.forEach(page => {
  const imageUrl = `/api/viewer/documents/${documentId}/pages/${page.pageNumber}`;
  // Use imageUrl in <img> tags or viewer components
});
```

### Error Handling
```typescript
const response = await fetch(`/api/viewer/documents/${documentId}/pages`);

if (!response.ok) {
  switch (response.status) {
    case 401:
      // Redirect to login
      break;
    case 403:
      // Show access denied message
      break;
    case 404:
      // Show document not found
      break;
    case 409:
      // Show "pages being generated" message
      break;
    default:
      // Show generic error
  }
}
```

### Diagnostics
```typescript
// Run diagnostics for troubleshooting
const diagnostics = await fetch(`/api/viewer/diagnose/${documentId}`);
const report = await diagnostics.json();

console.log('Document health:', report.summary.healthy);
console.log('Issues:', report.summary.issues);
console.log('Recommendations:', report.recommendations);
```

## Testing

Use the provided test script to verify the implementation:

```bash
npx tsx scripts/test-canonical-viewer-api.ts
```

The test script will:
1. Find a test PDF document
2. Test the pages API endpoint
3. Test individual page streaming
4. Run diagnostics
5. Check database integrity

## Troubleshooting

### Common Issues

1. **Blank Pages**
   - Check if DocumentPage records exist in database
   - Verify storage paths are correct
   - Test storage accessibility with diagnostics API

2. **403 Access Denied**
   - Verify user authentication
   - Check document ownership or share permissions
   - Review role-based access rules

3. **404 Not Found**
   - Confirm document exists in database
   - Check if pages have been generated
   - Verify storage bucket configuration

4. **Storage Access Errors**
   - Verify SUPABASE_SERVICE_ROLE_KEY is set
   - Check bucket permissions in Supabase dashboard
   - Ensure storage paths match database records

### Debug Panel

The integrated debug panel (development mode only) provides:
- Real-time health status
- Authorization check results
- Database page counts
- Storage accessibility tests
- Actionable recommendations

## Performance Considerations

- Lightweight pages API returns minimal JSON
- Binary streaming for optimal image delivery
- DRM-safe cache headers prevent unnecessary requests
- Server-side authorization caching where appropriate
- Structured logging for performance monitoring

## Migration Guide

To migrate existing viewers to use the canonical API:

1. **Remove direct storage URLs** from client-side code
2. **Update page loading** to use `/api/viewer/documents/[id]/pages`
3. **Update image sources** to use `/api/viewer/documents/[id]/pages/[pageNum]`
4. **Add error handling** for new HTTP status codes
5. **Test authorization** for all user roles
6. **Verify DRM compliance** with new cache headers

## Monitoring

The implementation includes comprehensive logging:
- Request/response times
- Authorization decisions
- Storage access attempts
- Error conditions
- Performance metrics

Monitor these logs to ensure optimal performance and security.

## Future Enhancements

Potential improvements for future versions:
- Range request support for large images
- Image resizing with query parameters
- CDN integration for global distribution
- Advanced caching strategies
- Real-time page generation status
- Batch page loading optimization

## Conclusion

This canonical viewer API implementation provides a secure, robust foundation for PDF document viewing that:
- ✅ Fixes blank page issues
- ✅ Maintains DRM protection
- ✅ Enforces role-based authorization
- ✅ Provides consistent behavior across dashboards
- ✅ Includes comprehensive error handling
- ✅ Offers debugging and diagnostic tools
- ✅ Supports future enhancements

The implementation is production-ready and provides a solid foundation for reliable document viewing in the JStudyRoom platform.