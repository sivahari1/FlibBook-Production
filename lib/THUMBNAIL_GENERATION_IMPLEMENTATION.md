# Thumbnail Generation Implementation

## Overview

This document describes the implementation of thumbnail generation for images, PDFs, and videos in the jStudyRoom platform.

## Requirements

- **3.4**: Generate thumbnails for uploaded images
- **4.4**: Generate thumbnails for uploaded videos (first frame)

## Implementation Details

### Image Thumbnail Generation

**Status**: ✅ Fully Implemented

Images are processed using the `sharp` library to generate thumbnails:

- **Size**: 300x300 pixels (max dimensions, maintains aspect ratio)
- **Format**: JPEG with 80% quality
- **Storage**: Stored in `images/{userId}/thumbnails/{documentId}.jpg`
- **Process**:
  1. Load image using sharp
  2. Extract metadata (dimensions, format)
  3. Upload original image to storage
  4. Generate thumbnail with resize operation
  5. Upload thumbnail to storage

**Code Location**: `lib/content-processor.ts` - `processImage()` method

### PDF Thumbnail Generation

**Status**: ⚠️ Placeholder Implementation

Due to serverless environment limitations, PDF thumbnail generation uses a placeholder approach:

- **Current Implementation**: Generates a solid red (RGB: 239, 68, 68) 300x300 JPEG placeholder
- **Storage**: Stored in `pdfs/{userId}/thumbnails/{documentId}.jpg`

**Production Alternatives**:
1. **Client-side generation**: Use PDF.js in the browser to render first page before upload
2. **AWS Lambda with layers**: Deploy ffmpeg or pdf-lib as Lambda layer
3. **Dedicated service**: Use AWS MediaConvert, Cloudinary, or similar service
4. **pdf-lib + canvas**: Server-side rendering with node-canvas (requires native dependencies)

**Code Location**: `lib/content-processor.ts` - `processPDF()` and `generatePDFPlaceholderThumbnail()` methods

### Video Thumbnail Generation

**Status**: ⚠️ Placeholder Implementation

Due to serverless environment limitations (no ffmpeg), video thumbnail generation uses a placeholder approach:

- **Current Implementation**: Generates a solid blue (RGB: 59, 130, 246) 300x300 JPEG placeholder
- **Storage**: Stored in `videos/{userId}/thumbnails/{documentId}.jpg`

**Production Alternatives**:
1. **Client-side generation**: Capture video frame in browser using HTML5 video element and canvas
2. **AWS Lambda with ffmpeg layer**: Extract first frame server-side
3. **Dedicated service**: Use AWS MediaConvert, Cloudinary, or similar service
4. **ffmpeg command**: `ffmpeg -i video.mp4 -ss 00:00:01 -vframes 1 -vf scale=300:-1 thumbnail.jpg`

**Code Location**: `lib/content-processor.ts` - `processVideo()` and `generateVideoThumbnail()` methods

## Storage Structure

```
supabase-storage/
├── documents/
│   └── pdfs/
│       └── {userId}/
│           ├── {documentId}.pdf
│           └── thumbnails/
│               └── {documentId}.jpg (placeholder)
├── images/
│   └── {userId}/
│       ├── {documentId}.{ext}
│       └── thumbnails/
│           └── {documentId}.jpg (actual thumbnail)
└── videos/
    └── {userId}/
        ├── {documentId}.{ext}
        └── thumbnails/
            └── {documentId}.jpg (placeholder)
```

## Testing

All thumbnail generation functionality is tested in `lib/__tests__/content-processor.test.ts`:

- ✅ Image thumbnail generation
- ✅ Image metadata extraction
- ✅ PDF processing with thumbnail
- ✅ Video processing with thumbnail
- ✅ Error handling for all content types

## Future Enhancements

### For Production Deployment

1. **PDF Thumbnails**:
   - Implement client-side PDF rendering using PDF.js
   - Or deploy Lambda function with pdf-lib layer
   - Extract actual first page as thumbnail

2. **Video Thumbnails**:
   - Implement client-side frame capture before upload
   - Or deploy Lambda function with ffmpeg layer
   - Extract actual frame at 1 second mark
   - Extract video metadata (duration, dimensions, codec)

3. **Optimization**:
   - Add thumbnail caching
   - Implement lazy thumbnail generation
   - Add thumbnail regeneration endpoint for admins

## Dependencies

- `sharp`: Image processing and thumbnail generation
- `@supabase/supabase-js`: Storage upload

## Notes

- Thumbnail generation is non-critical - failures don't block uploads
- Placeholder thumbnails provide visual distinction between content types
- All thumbnails are stored as JPEG for consistency and file size
- Thumbnail generation happens synchronously during upload
