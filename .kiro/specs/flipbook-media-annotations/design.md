# Flipbook Viewer & Media Annotations - Design Document

## Overview

This design document outlines the implementation of two major enhancements to the jStudyRoom platform: a 3D Flipbook Viewer using @stpageflip/react-pageflip and a Media Annotations system. The implementation maintains all existing DRM protections while providing an engaging, interactive document viewing experience with embedded audio/video content.

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Components                      │
├─────────────────────────────────────────────────────────────┤
│ FlipBookViewer.tsx          │ MediaAnnotationToolbar.tsx   │
│ MediaPlayerModal.tsx        │ MediaAnnotationMarker.tsx    │
│ PageImageRenderer.tsx       │ AnnotationOverlay.tsx        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
├─────────────────────────────────────────────────────────────┤
│ /api/documents/convert      │ /api/annotations/add          │
│ /api/annotations/[docId]    │ /api/media/upload             │
│ /api/media/stream/[id]      │ /api/pages/[docId]/[pageNum]  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Data & Storage Layer                        │
├─────────────────────────────────────────────────────────────┤
│ PostgreSQL Database         │ Supabase Storage              │
│ - DocumentAnnotations       │ - document-pages bucket       │
│ - Documents (existing)      │ - document-media bucket       │
│ - Users (existing)          │ - Encrypted media files       │
└─────────────────────────────────────────────────────────────┘
```

## Feature 1: 3D Flipbook Viewer Design

### Component Architecture

#### FlipBookViewer Component
```typescript
interface FlipBookViewerProps {
  documentUrl: string;
  totalPages: number;
  waterMarkText?: string;
  userEmail: string;
  documentId: string;
  allowTextSelection?: boolean;
  onPageChange?: (page: number) => void;
}
```


#### Page Conversion Pipeline
```
PDF Upload → PDF Processing → Page Extraction → Image Conversion → Optimization → Storage → Caching
```

### Implementation Strategy

#### 1. Library Integration
- Use `@stpageflip/react-pageflip` as primary flipbook engine
- Fallback to `react-turnjs` if needed
- Custom wrapper for DRM integration

#### 2. Page Processing Service
```typescript
class PageProcessor {
  async convertPdfToImages(pdfBuffer: Buffer): Promise<string[]>
  async optimizeImage(imagePath: string): Promise<Buffer>
  async uploadToStorage(imageBuffer: Buffer, path: string): Promise<string>
  async cachePageImages(documentId: string, images: Buffer[]): Promise<void>
}
```

#### 3. DRM Integration Points
- Watermark overlay on each page image
- Right-click prevention
- Text selection control
- Screenshot detection integration
- Download/print blocking

### UI/UX Design

#### Visual Elements
- Gradient background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Soft shadows: `box-shadow: 0 20px 40px rgba(0,0,0,0.1)`
- Page curl animation with realistic physics
- Smooth transitions (300ms ease-in-out)

#### Responsive Breakpoints
- Mobile: < 768px (single page view)
- Tablet: 768px - 1024px (optimized dual page)
- Desktop: > 1024px (full dual page experience)

#### Navigation Controls
```typescript
interface NavigationControls {
  prevPage: () => void;
  nextPage: () => void;
  goToPage: (page: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleFullscreen: () => void;
}
```

## Feature 2: Media Annotations Design

### Database Schema

```sql
CREATE TABLE DocumentAnnotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentId UUID NOT NULL REFERENCES Documents(id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  pageNumber INTEGER NOT NULL,
  selectedText TEXT NOT NULL,
  selectionStart INTEGER NOT NULL,
  selectionEnd INTEGER NOT NULL,
  mediaType VARCHAR(10) NOT NULL CHECK (mediaType IN ('audio', 'video')),
  mediaUrl TEXT NOT NULL,
  mediaFileName TEXT,
  isExternalUrl BOOLEAN DEFAULT false,
  visibility VARCHAR(10) DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_document_annotations (documentId, pageNumber),
  INDEX idx_user_annotations (userId),
  INDEX idx_annotation_lookup (documentId, pageNumber, userId)
);
```


### Component Architecture

#### MediaAnnotationToolbar
```typescript
interface MediaAnnotationToolbarProps {
  selectedText: string;
  position: { x: number; y: number };
  onAddAudio: () => void;
  onAddVideo: () => void;
  onClose: () => void;
}
```

#### MediaPlayerModal
```typescript
interface MediaPlayerModalProps {
  mediaType: 'audio' | 'video';
  mediaUrl: string;
  isExternal: boolean;
  watermarkText: string;
  onClose: () => void;
}
```

#### MediaAnnotationMarker
```typescript
interface MediaAnnotationMarkerProps {
  annotation: DocumentAnnotation;
  position: { x: number; y: number };
  onClick: () => void;
}
```

### Annotation Creation Flow

```
1. User selects text in flipbook
2. Selection triggers floating toolbar
3. User clicks [Add Audio] or [Add Video]
4. Modal opens with upload/URL options
5. Media is processed and stored securely
6. Annotation saved to database
7. Marker appears on page
8. Other users see marker when viewing
```

### Media Processing Pipeline

```typescript
class MediaProcessor {
  async uploadMedia(file: File, documentId: string): Promise<string>
  async validateExternalUrl(url: string): Promise<boolean>
  async encryptMediaFile(buffer: Buffer): Promise<Buffer>
  async generateSecureUrl(mediaId: string): Promise<string>
  async streamMedia(mediaId: string, userId: string): Promise<ReadableStream>
}
```

### Security Design

#### Media Protection
- All uploaded media encrypted at rest
- Secure streaming URLs with expiration
- User authentication required for access
- Watermark overlay during playback
- No direct file downloads

#### Access Control Matrix
```typescript
type PermissionMatrix = {
  'PLATFORM_USER': {
    create: true;
    read: true;
    update: 'own';
    delete: 'own';
  };
  'MEMBER': {
    create: false;
    read: true;
    update: false;
    delete: false;
  };
  'READER': {
    create: false;
    read: true;
    update: false;
    delete: false;
  };
}
```


## API Design

### Document Conversion API
```typescript
// POST /api/documents/convert
interface ConvertRequest {
  documentId: string;
  forceRegenerate?: boolean;
}

interface ConvertResponse {
  success: boolean;
  pageCount: number;
  pageUrls: string[];
  processingTime: number;
}
```

### Annotations API
```typescript
// POST /api/annotations/add
interface CreateAnnotationRequest {
  documentId: string;
  pageNumber: number;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  mediaType: 'audio' | 'video';
  mediaFile?: File;
  mediaUrl?: string;
  visibility?: 'public' | 'private';
}

// GET /api/annotations/[documentId]
interface GetAnnotationsResponse {
  annotations: DocumentAnnotation[];
  totalCount: number;
  userPermissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}
```

### Media Streaming API
```typescript
// GET /api/media/stream/[mediaId]
// Returns secure media stream with:
// - Authentication check
// - Access control validation
// - Watermark injection
// - Usage tracking
```

## Performance Optimization

### Page Loading Strategy
```typescript
class PageLoadingStrategy {
  // Preload current + next 2 pages
  preloadPages(currentPage: number, totalPages: number): void
  
  // Lazy load images with intersection observer
  lazyLoadImages(): void
  
  // Cache frequently accessed pages
  cacheStrategy(pageNumber: number): 'memory' | 'disk' | 'network'
}
```

### Image Optimization
- WebP format with JPEG fallback
- Multiple resolution variants (1x, 2x, 3x)
- Progressive loading
- Compression optimization

### Annotation Loading
- Load annotations per page (not entire document)
- Cache annotation data in memory
- Debounced annotation updates

## Error Handling Strategy

### Flipbook Viewer Errors
```typescript
type FlipbookError = 
  | 'PAGES_NOT_FOUND'
  | 'CONVERSION_FAILED'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'UNSUPPORTED_FORMAT';

interface ErrorRecovery {
  fallbackToStaticViewer(): void;
  retryPageLoad(pageNumber: number): Promise<void>;
  reportError(error: FlipbookError): void;
}
```


### Media Annotation Errors
```typescript
type AnnotationError = 
  | 'MEDIA_UPLOAD_FAILED'
  | 'INVALID_MEDIA_FORMAT'
  | 'QUOTA_EXCEEDED'
  | 'PERMISSION_DENIED'
  | 'NETWORK_TIMEOUT';

interface AnnotationErrorHandling {
  showUserFriendlyMessage(error: AnnotationError): void;
  retryOperation(): Promise<void>;
  fallbackToTextAnnotation(): void;
}
```

## Testing Strategy

### Unit Tests
- Component rendering tests
- Media processing functions
- API endpoint tests
- Database operations

### Integration Tests
- End-to-end flipbook navigation
- Annotation creation flow
- Media playback functionality
- DRM protection validation

### Performance Tests
- Page loading benchmarks
- Memory usage monitoring
- Mobile performance validation
- Large document handling

### Security Tests
- DRM bypass attempts
- Media download prevention
- Access control validation
- Watermark integrity

## Deployment Considerations

### Environment Variables
```env
# Flipbook Configuration
FLIPBOOK_PAGE_QUALITY=85
FLIPBOOK_MAX_PAGES=500
FLIPBOOK_CACHE_TTL=3600

# Media Configuration
MEDIA_MAX_FILE_SIZE=100MB
MEDIA_ALLOWED_FORMATS=mp3,mp4,wav,webm
MEDIA_ENCRYPTION_KEY=...
```

### Storage Buckets
- `document-pages`: Converted page images
- `document-media`: Annotation media files
- Proper RLS policies for security

### CDN Configuration
- Cache page images aggressively
- Secure media streaming
- Geographic distribution

## Migration Strategy

### Phase 1: Flipbook Viewer
1. Install dependencies
2. Create FlipBookViewer component
3. Implement page conversion service
4. Replace existing PDF viewers
5. Test DRM integration

### Phase 2: Media Annotations
1. Create database schema
2. Implement annotation APIs
3. Build annotation UI components
4. Add media processing
5. Integrate with flipbook viewer

### Phase 3: Optimization
1. Performance tuning
2. Mobile optimization
3. Error handling improvements
4. Security hardening
5. User experience polish
