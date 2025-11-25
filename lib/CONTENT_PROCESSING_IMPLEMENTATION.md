# Content Processing Pipeline Implementation

## Overview

This document describes the implementation of the content processing pipeline for the jStudyRoom platform's admin enhanced privileges feature. The pipeline handles processing of multiple content types: PDFs, images, videos, and links.

## Implementation Status

✅ **Task 4.1: ContentProcessor Class** - COMPLETED
✅ **Task 4.2: LinkProcessor Class** - COMPLETED

## Components Implemented

### 1. ContentProcessor Class (`lib/content-processor.ts`)

The ContentProcessor class handles processing of file-based content types (PDF, Image, Video).

**Key Features:**
- **PDF Processing** (Requirements 3.3, 3.4)
  - Uploads PDF files to Supabase Storage
  - Extracts file size and MIME type metadata
  - Prepares for future thumbnail generation from first page

- **Image Processing** (Requirements 3.3, 3.4)
  - Uploads original images to Supabase Storage
  - Extracts dimensions (width, height) using Sharp library
  - Generates thumbnails (max 300x300, maintains aspect ratio)
  - Stores thumbnails separately for preview purposes

- **Video Processing** (Requirements 4.3, 4.4)
  - Uploads video files to Supabase Storage
  - Extracts basic metadata (file size, MIME type)
  - Prepares for future metadata extraction (duration, dimensions, codec) using ffmpeg
  - Prepares for future thumbnail generation from first frame

**Methods:**
- `processUpload(file, contentType, userId)` - Main entry point that routes to appropriate processor
- `processPDF(file, userId)` - Handles PDF file processing
- `processImage(file, userId)` - Handles image processing with thumbnail generation
- `processVideo(file, userId)` - Handles video file processing

**Storage Organization:**
```
documents/
├── pdfs/{userId}/{documentId}.pdf
├── images/{userId}/{documentId}.{ext}
│   └── thumbnails/{documentId}.jpg
└── videos/{userId}/{documentId}.{ext}
```

### 2. LinkProcessor Class (`lib/link-processor.ts`)

The LinkProcessor class handles URL validation and metadata fetching for link content types.

**Key Features:**
- **URL Validation** (Requirements 5.1, 5.5)
  - Validates URL format using native URL API
  - Only allows HTTP and HTTPS protocols
  - Rejects invalid URLs and unsafe protocols (ftp, file, javascript, etc.)

- **Metadata Fetching** (Requirements 5.3)
  - Fetches page HTML content
  - Extracts Open Graph metadata (og:title, og:description, og:image)
  - Falls back to standard HTML meta tags and title
  - Decodes HTML entities in extracted text
  - Handles multiple meta tag attribute orders

- **Preview Image Storage** (Requirements 5.3)
  - Downloads preview images from URLs
  - Stores preview images in Supabase Storage
  - Handles storage errors gracefully
  - Returns original URL if storage fails

**Methods:**
- `processLink(url, userId?)` - Main entry point for link processing
- `isValidUrl(urlString)` - Public method to validate URL format
- `extractDomain(urlString)` - Extracts domain from URL
- `fetchMetadata(url)` - Fetches Open Graph and HTML metadata
- `storePreviewImage(imageUrl, userId)` - Downloads and stores preview images

**Storage Organization:**
```
documents/
└── link-previews/{userId}/{imageId}.jpg
```

## Testing

Comprehensive test suites have been implemented for both processors:

### ContentProcessor Tests (`lib/__tests__/content-processor.test.ts`)
- ✅ Routes to correct processor based on content type
- ✅ Processes PDFs with metadata extraction
- ✅ Processes images with thumbnail generation
- ✅ Processes videos with metadata extraction
- ✅ Handles processing errors gracefully
- ✅ Validates file size and MIME type extraction
- ✅ Tests error scenarios for each content type

**Test Results:** 11 tests passing

### LinkProcessor Tests (`lib/__tests__/link-processor.test.ts`)
- ✅ Validates HTTP and HTTPS URLs
- ✅ Rejects invalid URL formats and unsafe protocols
- ✅ Processes valid URLs and extracts metadata
- ✅ Extracts Open Graph tags (title, description, image)
- ✅ Falls back to HTML title tag
- ✅ Handles fetch errors and HTTP errors gracefully
- ✅ Stores preview images when userId provided
- ✅ Decodes HTML entities in extracted text
- ✅ Handles malformed HTML and edge cases

**Test Results:** 23 tests passing

**Total Tests:** 34 tests passing ✅

## Dependencies

- **sharp** - Image processing and thumbnail generation
- **@supabase/supabase-js** - File storage
- **native fetch API** - HTTP requests for metadata fetching
- **native URL API** - URL validation

## Future Enhancements

### PDF Processing
- Implement thumbnail generation from first page using pdf-lib or similar
- Extract page count and document metadata

### Video Processing
- Integrate ffmpeg/ffprobe for metadata extraction:
  - Duration
  - Dimensions (width, height)
  - Codec information
  - Bitrate
- Generate thumbnail from first frame or specific timestamp

### Link Processing
- Add caching for frequently accessed URLs
- Implement retry logic for failed metadata fetches
- Support additional metadata formats (Twitter Cards, Schema.org)

## Error Handling

Both processors implement comprehensive error handling:
- All errors are caught and logged
- Graceful degradation when optional features fail (e.g., thumbnail generation)
- Meaningful error messages returned to callers
- No crashes on invalid input

## Security Considerations

- URL validation prevents unsafe protocols (javascript:, file:, etc.)
- Fetch requests include timeout to prevent hanging
- User-Agent header included in metadata requests
- File uploads use secure Supabase Storage with proper paths
- Preview images are validated before storage

## Requirements Coverage

### Requirement 3.3 - Image Storage ✅
Images are securely stored in Supabase Storage with proper path organization.

### Requirement 3.4 - Image Thumbnails ✅
Thumbnails are generated for all uploaded images using Sharp library.

### Requirement 4.3 - Video Storage ✅
Videos are securely stored in Supabase Storage with proper path organization.

### Requirement 4.4 - Video Metadata ✅
Basic metadata extraction is implemented; advanced metadata (duration, dimensions) prepared for ffmpeg integration.

### Requirement 5.1 - URL Validation ✅
Comprehensive URL validation ensures only HTTP/HTTPS URLs are accepted.

### Requirement 5.3 - Link Metadata ✅
Open Graph and HTML metadata extraction is fully implemented.

### Requirement 5.5 - Protocol Support ✅
HTTP and HTTPS protocols are supported; unsafe protocols are rejected.

## Usage Examples

### Processing an Image
```typescript
const processor = new ContentProcessor();
const file = new File([buffer], 'photo.jpg', { type: 'image/jpeg' });
const result = await processor.processUpload(file, ContentType.IMAGE, 'user123');

console.log(result.fileUrl); // Storage path to original image
console.log(result.thumbnailUrl); // Storage path to thumbnail
console.log(result.metadata.width); // Image width
console.log(result.metadata.height); // Image height
```

### Processing a Link
```typescript
const processor = new LinkProcessor();
const result = await processor.processLink('https://example.com', 'user123');

console.log(result.domain); // 'example.com'
console.log(result.title); // Extracted title
console.log(result.description); // Extracted description
console.log(result.previewImage); // Storage path or URL
```

## Next Steps

The content processing pipeline is now ready for integration with:
1. Upload API endpoints (Task 6)
2. File validation utilities (Task 5)
3. Enhanced upload modal (Task 10)
4. Content viewers (Tasks 11-13)

---

**Implementation Date:** November 24, 2025
**Status:** ✅ Complete and Tested
