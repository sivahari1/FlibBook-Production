# Enhanced Upload API

## Overview

The enhanced upload API endpoint supports multi-content type uploads (PDF, Image, Video, Link) with role-based access control (RBAC) integration.

**Endpoint:** `POST /api/documents/upload`

**Requirements Implemented:**
- 1.1: Admin uploads bypass quota checks
- 1.4: Admin permission checks work correctly
- 3.1: Image format validation (JPG, PNG, GIF, WebP)
- 4.1: Video format validation (MP4, WebM, MOV)
- 5.1: Link URL validation (HTTP/HTTPS)
- 9.3: Content type validation

## Request Format

### Headers
- `Content-Type: multipart/form-data`
- Authentication: Session-based (NextAuth)

### Form Data Fields

#### Required Fields
- `contentType`: One of `PDF`, `IMAGE`, `VIDEO`, `LINK`
- `title`: String (document title)

#### Content-Type Specific Fields

**For PDF, IMAGE, VIDEO:**
- `file`: File object (required)
- `description`: String (optional)

**For LINK:**
- `linkUrl`: String (required, must be valid HTTP/HTTPS URL)
- `description`: String (optional)

## Response Format

### Success Response (201 Created)

```json
{
  "success": true,
  "document": {
    "id": "doc-uuid",
    "title": "Document Title",
    "contentType": "PDF",
    "fileSize": "1024000",
    "storagePath": "pdfs/user-id/doc-uuid.pdf",
    "thumbnailUrl": "pdfs/user-id/thumbnails/doc-uuid.jpg",
    "metadata": {
      "fileSize": 1024000,
      "mimeType": "application/pdf"
    },
    "userId": "user-id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "quotaRemaining": "unlimited" // or number for non-admin users
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

#### 400 Bad Request
```json
{
  "error": "Invalid or missing content type"
}
```

```json
{
  "error": "Title is required"
}
```

```json
{
  "error": "Link URL is required for LINK content type"
}
```

```json
{
  "error": "File is required for PDF content type"
}
```

```json
{
  "error": "Invalid image type. Allowed formats: JPG, PNG, GIF, WebP."
}
```

#### 403 Forbidden
```json
{
  "error": "Document limit reached. Maximum 10 documents allowed.",
  "code": "UPLOAD_PERMISSION_DENIED"
}
```

```json
{
  "error": "Content type IMAGE not allowed for your role.",
  "code": "UPLOAD_PERMISSION_DENIED"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Processing failed: <error message>"
}
```

```json
{
  "error": "Failed to upload document"
}
```

## Role-Based Access Control

### Admin Role
- **Upload Quota:** Unlimited
- **Allowed Content Types:** PDF, IMAGE, VIDEO, LINK
- **Max File Size:** 1GB
- **Quota Counter:** Not incremented (Requirement 1.3)

### Platform User Role
- **Upload Quota:** 10 documents
- **Allowed Content Types:** PDF only
- **Max File Size:** 50MB
- **Quota Counter:** Incremented on each upload

### Member Role
- **Upload Quota:** 0 (cannot upload)
- **Allowed Content Types:** None
- **Max File Size:** 0

## Content Type Processing

### PDF
1. File validation (type, extension, size)
2. Upload to Supabase Storage: `pdfs/{userId}/{documentId}.pdf`
3. Metadata extraction (file size, MIME type)
4. Database record creation

### IMAGE
1. File validation (JPG, JPEG, PNG, GIF, WebP)
2. Upload to Supabase Storage: `images/{userId}/{documentId}.{ext}`
3. Thumbnail generation (300x300, maintain aspect ratio)
4. Thumbnail upload: `images/{userId}/thumbnails/{documentId}.jpg`
5. Metadata extraction (width, height, file size)
6. Database record creation

### VIDEO
1. File validation (MP4, WebM, MOV)
2. Upload to Supabase Storage: `videos/{userId}/{documentId}.{ext}`
3. Metadata extraction (file size, MIME type)
4. Database record creation
5. Note: Video metadata extraction (duration, dimensions) requires ffmpeg integration

### LINK
1. URL validation (HTTP/HTTPS only)
2. Metadata fetching from Open Graph tags
3. Domain extraction
4. Optional preview image storage
5. Database record creation with linkUrl

## Examples

### Upload PDF (Admin)

```javascript
const formData = new FormData();
formData.append('contentType', 'PDF');
formData.append('title', 'My Document');
formData.append('file', pdfFile);

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData
});

const data = await response.json();
// data.quotaRemaining === 'unlimited' for admin
```

### Upload Image (Admin)

```javascript
const formData = new FormData();
formData.append('contentType', 'IMAGE');
formData.append('title', 'My Image');
formData.append('description', 'A beautiful image');
formData.append('file', imageFile);

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData
});
```

### Upload Link (Admin)

```javascript
const formData = new FormData();
formData.append('contentType', 'LINK');
formData.append('title', 'Useful Resource');
formData.append('linkUrl', 'https://example.com');
formData.append('description', 'A helpful link');

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData
});
```

### Upload PDF (Platform User - Quota Check)

```javascript
const formData = new FormData();
formData.append('contentType', 'PDF');
formData.append('title', 'My Document');
formData.append('file', pdfFile);

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData
});

const data = await response.json();
// data.quotaRemaining will be a number (e.g., 9, 8, 7...)
// If quota exceeded, response.status === 403
```

## Testing

Run the test suite:
```bash
npm test app/api/documents/upload/__tests__/route.test.ts
```

Run manual integration tests:
```bash
npx tsx scripts/test-enhanced-upload.ts
```

## Implementation Notes

1. **Admin Quota Bypass:** Admins bypass all quota checks (Requirement 1.1). The `checkUploadPermission` function returns `{ allowed: true }` for admins regardless of document count.

2. **Quota Counter Invariance:** Admin uploads do not increment the quota counter (Requirement 1.3). The `hasUnlimitedUploads` check prevents storage updates for admins.

3. **Content Type Validation:** All uploads validate content type against allowed types for the user's role (Requirement 9.3).

4. **File Validation:** Images and videos are validated for correct MIME types and extensions (Requirements 3.1, 4.1).

5. **Link Validation:** Links are validated to ensure HTTP/HTTPS protocols only (Requirement 5.1).

6. **Processing Pipeline:** Each content type goes through appropriate processing (ContentProcessor for files, LinkProcessor for links).

7. **Metadata Storage:** All content metadata is stored in the `metadata` JSONB field for flexible querying.

8. **Thumbnail Generation:** Images automatically generate thumbnails. Videos would require ffmpeg integration for thumbnail generation.

## Security Considerations

1. **Authentication Required:** All requests must be authenticated via NextAuth session.
2. **Role Verification:** The `requirePlatformUser` middleware ensures only PLATFORM_USER and ADMIN roles can upload.
3. **Input Sanitization:** All text inputs (title, description) are sanitized using `sanitizeString`.
4. **Filename Sanitization:** All filenames are sanitized to prevent path traversal attacks.
5. **File Type Validation:** MIME types and extensions are validated to prevent malicious uploads.
6. **URL Validation:** Link URLs are validated to prevent XSS and other injection attacks.
7. **File Size Limits:** Role-based file size limits prevent abuse.

## Future Enhancements

1. **Video Metadata Extraction:** Integrate ffmpeg for extracting video duration, dimensions, codec, and bitrate.
2. **Video Thumbnail Generation:** Use ffmpeg to extract first frame as thumbnail.
3. **PDF Thumbnail Generation:** Use pdf-lib or similar to generate PDF thumbnails.
4. **Progress Tracking:** Add upload progress tracking for large files.
5. **Resumable Uploads:** Implement chunked uploads for large files.
6. **Virus Scanning:** Integrate virus scanning for uploaded files.
7. **Image Optimization:** Automatically optimize images for web delivery.
8. **Video Transcoding:** Transcode videos to web-friendly formats.
