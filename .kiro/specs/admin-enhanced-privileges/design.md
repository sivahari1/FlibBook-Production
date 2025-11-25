# Design Document

## Introduction

This document outlines the technical design for enhancing admin privileges in the jStudyRoom platform. The feature enables admins to upload unlimited content of multiple types (PDFs, images, videos, links), share without restrictions, and manage BookShop content with multi-media support.

## Architecture

### System Architecture

The enhanced admin privileges feature extends the existing jStudyRoom architecture with multi-content type support:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Admin UI    │  │  Member UI   │  │  Viewer UI   │      │
│  │  - Upload    │  │  - BookShop  │  │  - PDF       │      │
│  │  - Manage    │  │  - Library   │  │  - Image     │      │
│  │  - BookShop  │  │  - Shared    │  │  - Video     │      │
│  └──────────────┘  └──────────────┘  │  - Link      │      │
│                                       └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Role-Based Access Control (RBAC)                    │   │
│  │  - Admin: Unlimited uploads & shares                 │   │
│  │  - Platform User: Limited uploads & shares           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Upload API  │  │  Share API   │  │  BookShop    │      │
│  │  - Multi-    │  │  - Email     │  │  API         │      │
│  │    type      │  │  - Link      │  │  - CRUD      │      │
│  │  - Validate  │  │  - Unlimited │  │  - Multi-    │      │
│  │  - Process   │  │    for Admin │  │    type      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Content     │  │  Quota       │  │  Rendering   │      │
│  │  Processor   │  │  Manager     │  │  Engine      │      │
│  │  - PDF       │  │  - Check     │  │  - PDF       │      │
│  │  - Image     │  │    Role      │  │  - Image     │      │
│  │  - Video     │  │  - Enforce   │  │  - Video     │      │
│  │  - Link      │  │    Limits    │  │  - Link      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │  Supabase    │  │  Metadata    │      │
│  │  - Document  │  │  Storage     │  │  Cache       │      │
│  │  - BookShop  │  │  - PDFs      │  │  - Previews  │      │
│  │  - Share     │  │  - Images    │  │  - Thumbs    │      │
│  │  - User      │  │  - Videos    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced Upload System

#### Upload Modal Component

```typescript
// components/dashboard/EnhancedUploadModal.tsx
interface EnhancedUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: UploadData) => Promise<void>;
  userRole: UserRole;
  showBookShopOption?: boolean;
}

interface UploadData {
  contentType: ContentType;
  file?: File;
  linkUrl?: string;
  title: string;
  description?: string;
  uploadToBookShop?: boolean;
  bookShopData?: BookShopItemData;
}

enum ContentType {
  PDF = 'PDF',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  LINK = 'LINK'
}
```

#### Content Type Selector

```typescript
// components/upload/ContentTypeSelector.tsx
interface ContentTypeSelectorProps {
  selectedType: ContentType;
  onTypeChange: (type: ContentType) => void;
  allowedTypes: ContentType[];
  disabled?: boolean;
}
```

#### File Uploader

```typescript
// components/upload/FileUploader.tsx
interface FileUploaderProps {
  contentType: ContentType;
  onFileSelect: (file: File) => void;
  maxSize: number;
  acceptedFormats: string[];
}
```

#### Link Uploader

```typescript
// components/upload/LinkUploader.tsx
interface LinkUploaderProps {
  onLinkSubmit: (url: string, title: string, description?: string) => void;
  onMetadataFetch: (metadata: LinkMetadata) => void;
}

interface LinkMetadata {
  title: string;
  description?: string;
  previewImage?: string;
  domain: string;
}
```

### 2. Content Viewers

#### Universal Content Viewer

```typescript
// components/viewers/UniversalViewer.tsx
interface UniversalViewerProps {
  content: EnhancedDocument;
  watermark?: WatermarkConfig;
  onAnalytics?: (event: ViewerAnalyticsEvent) => void;
}

interface EnhancedDocument {
  id: string;
  title: string;
  contentType: ContentType;
  fileUrl?: string;
  linkUrl?: string;
  thumbnailUrl?: string;
  metadata: ContentMetadata;
  userId: string;
  createdAt: Date;
}
```

#### Image Viewer

```typescript
// components/viewers/ImageViewer.tsx
interface ImageViewerProps {
  imageUrl: string;
  metadata: ImageMetadata;
  watermark?: WatermarkConfig;
  allowZoom?: boolean;
  allowDownload?: boolean;
}

interface ImageMetadata {
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}
```

#### Video Player

```typescript
// components/viewers/VideoPlayer.tsx
interface VideoPlayerProps {
  videoUrl: string;
  metadata: VideoMetadata;
  watermark?: WatermarkConfig;
  autoplay?: boolean;
  controls?: boolean;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}
```

#### Link Preview

```typescript
// components/viewers/LinkPreview.tsx
interface LinkPreviewProps {
  linkUrl: string;
  metadata: LinkMetadata;
  allowDirectAccess: boolean;
}
```

### 3. Enhanced Dashboard

#### Content Management Dashboard

```typescript
// components/dashboard/EnhancedContentDashboard.tsx
interface ContentDashboardProps {
  userRole: UserRole;
  onUpload: () => void;
  onFilter: (filter: ContentFilter) => void;
}

interface ContentFilter {
  contentType?: ContentType;
  dateRange?: DateRange;
  searchQuery?: string;
}

interface ContentStats {
  totalItems: number;
  byType: Record<ContentType, number>;
  storageUsed: number;
  sharesCreated: number;
  quotaRemaining: number | 'unlimited';
}
```

#### Content Grid

```typescript
// components/dashboard/ContentGrid.tsx
interface ContentGridProps {
  contents: EnhancedDocument[];
  viewMode: 'grid' | 'list';
  filter: ContentFilter;
  onContentClick: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
}
```

### 4. Enhanced BookShop

#### BookShop Management

```typescript
// components/admin/EnhancedBookShopForm.tsx
interface BookShopItemFormProps {
  item?: BookShopItem;
  onSave: (data: BookShopItemData) => Promise<void>;
  onCancel: () => void;
}

interface BookShopItemData {
  title: string;
  description: string;
  contentType: ContentType;
  price: number;
  category: string;
  isPublished: boolean;
  file?: File;
  linkUrl?: string;
  previewImage?: File;
}

interface BookShopItem extends BookShopItemData {
  id: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  metadata: ContentMetadata;
  createdAt: Date;
  updatedAt: Date;
}
```

#### BookShop Display

```typescript
// components/member/EnhancedBookShop.tsx
interface BookShopDisplayProps {
  items: BookShopItem[];
  filter: BookShopFilter;
  onPurchase: (itemId: string) => Promise<void>;
  onPreview: (itemId: string) => void;
}

interface BookShopFilter {
  contentType?: ContentType;
  category?: string;
  priceRange?: [number, number];
  searchQuery?: string;
}
```

### 5. Role-Based Access Control

```typescript
// lib/rbac/admin-privileges.ts
interface RolePermissions {
  upload: {
    maxDocuments: number | 'unlimited';
    allowedContentTypes: ContentType[];
    maxFileSize: number;
  };
  sharing: {
    maxShares: number | 'unlimited';
    allowEmailSharing: boolean;
    allowLinkSharing: boolean;
  };
  bookshop: {
    canManage: boolean;
    canUpload: boolean;
    canSetPricing: boolean;
  };
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMIN: {
    upload: {
      maxDocuments: 'unlimited',
      allowedContentTypes: [
        ContentType.PDF,
        ContentType.IMAGE,
        ContentType.VIDEO,
        ContentType.LINK
      ],
      maxFileSize: 1024 * 1024 * 1024 // 1GB
    },
    sharing: {
      maxShares: 'unlimited',
      allowEmailSharing: true,
      allowLinkSharing: true
    },
    bookshop: {
      canManage: true,
      canUpload: true,
      canSetPricing: true
    }
  },
  PLATFORM_USER: {
    upload: {
      maxDocuments: 10,
      allowedContentTypes: [ContentType.PDF],
      maxFileSize: 50 * 1024 * 1024 // 50MB
    },
    sharing: {
      maxShares: 5,
      allowEmailSharing: true,
      allowLinkSharing: true
    },
    bookshop: {
      canManage: false,
      canUpload: false,
      canSetPricing: false
    }
  }
};

function checkUploadPermission(
  userRole: UserRole,
  currentDocCount: number,
  contentType: ContentType
): { allowed: boolean; reason?: string } {
  const permissions = ROLE_PERMISSIONS[userRole];
  
  // Check document limit
  if (permissions.upload.maxDocuments !== 'unlimited' &&
      currentDocCount >= permissions.upload.maxDocuments) {
    return { allowed: false, reason: 'Document limit reached' };
  }
  
  // Check content type
  if (!permissions.upload.allowedContentTypes.includes(contentType)) {
    return { allowed: false, reason: 'Content type not allowed' };
  }
  
  return { allowed: true };
}
```

## Data Models

### Database Schema Extensions

#### Enhanced Document Model

```sql
-- Add content type support to existing Document table
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "contentType" TEXT NOT NULL DEFAULT 'PDF';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "linkUrl" TEXT;

-- Add check constraint for content types
ALTER TABLE "Document" ADD CONSTRAINT "Document_contentType_check" 
  CHECK ("contentType" IN ('PDF', 'IMAGE', 'VIDEO', 'LINK'));

-- Add index for content type filtering
CREATE INDEX IF NOT EXISTS "Document_contentType_idx" ON "Document"("contentType");
CREATE INDEX IF NOT EXISTS "Document_metadata_idx" ON "Document" USING GIN("metadata");
```

#### Enhanced BookShop Model

```sql
-- Add content type support to BookShopItem table
ALTER TABLE "BookShopItem" ADD COLUMN IF NOT EXISTS "contentType" TEXT NOT NULL DEFAULT 'PDF';
ALTER TABLE "BookShopItem" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "BookShopItem" ADD COLUMN IF NOT EXISTS "previewUrl" TEXT;
ALTER TABLE "BookShopItem" ADD COLUMN IF NOT EXISTS "linkUrl" TEXT;

-- Add check constraint
ALTER TABLE "BookShopItem" ADD CONSTRAINT "BookShopItem_contentType_check" 
  CHECK ("contentType" IN ('PDF', 'IMAGE', 'VIDEO', 'LINK'));

-- Add indexes
CREATE INDEX IF NOT EXISTS "BookShopItem_contentType_idx" ON "BookShopItem"("contentType");
CREATE INDEX IF NOT EXISTS "BookShopItem_metadata_idx" ON "BookShopItem" USING GIN("metadata");
```

#### Content Metadata Types

```typescript
// lib/types/content.ts
export interface ContentMetadata {
  // Common metadata
  fileSize?: number;
  mimeType?: string;
  
  // Image-specific
  width?: number;
  height?: number;
  
  // Video-specific
  duration?: number;
  bitrate?: number;
  codec?: string;
  
  // Link-specific
  domain?: string;
  title?: string;
  description?: string;
  previewImage?: string;
  fetchedAt?: Date;
}
```

### API Interfaces

#### Upload API

```typescript
// app/api/documents/upload/route.ts
interface UploadRequest {
  contentType: ContentType;
  title: string;
  description?: string;
  file?: FormData;
  linkUrl?: string;
  uploadToBookShop?: boolean;
  bookShopData?: BookShopItemData;
}

interface UploadResponse {
  success: boolean;
  document?: EnhancedDocument;
  bookShopItem?: BookShopItem;
  error?: string;
  quotaRemaining?: number | 'unlimited';
}
```

#### Content Processing Pipeline

```typescript
// lib/content-processor.ts
interface ProcessingResult {
  fileUrl?: string;
  thumbnailUrl?: string;
  metadata: ContentMetadata;
  error?: string;
}

class ContentProcessor {
  async processUpload(
    file: File,
    contentType: ContentType,
    userId: string
  ): Promise<ProcessingResult> {
    switch (contentType) {
      case ContentType.PDF:
        return this.processPDF(file, userId);
      case ContentType.IMAGE:
        return this.processImage(file, userId);
      case ContentType.VIDEO:
        return this.processVideo(file, userId);
      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }
  }

  private async processPDF(file: File, userId: string): Promise<ProcessingResult> {
    // Upload to Supabase Storage
    // Generate thumbnail from first page
    // Extract metadata (page count, etc.)
  }

  private async processImage(file: File, userId: string): Promise<ProcessingResult> {
    // Upload to Supabase Storage
    // Generate thumbnail
    // Extract dimensions and metadata
  }

  private async processVideo(file: File, userId: string): Promise<ProcessingResult> {
    // Upload to Supabase Storage
    // Generate thumbnail from first frame
    // Extract duration and metadata
  }
}

class LinkProcessor {
  async processLink(url: string): Promise<ContentMetadata> {
    // Validate URL
    // Fetch Open Graph metadata
    // Extract title, description, preview image
    // Store preview image if available
  }
}
```

### Storage Organization

```
supabase-storage/
├── documents/
│   ├── pdfs/
│   │   └── {userId}/
│   │       ├── {documentId}.pdf
│   │       └── thumbnails/
│   │           └── {documentId}.jpg
│   ├── images/
│   │   └── {userId}/
│   │       ├── {documentId}.{ext}
│   │       └── thumbnails/
│   │           └── {documentId}.jpg
│   └── videos/
│       └── {userId}/
│           ├── {documentId}.{ext}
│           └── thumbnails/
│               └── {documentId}.jpg
└── bookshop/
    ├── items/
    │   ├── {itemId}.{ext}
    │   └── previews/
    │       └── {itemId}.jpg
    └── link-previews/
        └── {itemId}.jpg
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Upload and Quota Properties

Property 1: Admin upload quota bypass
*For any* admin user and any document count, uploading a document should succeed without quota validation errors
**Validates: Requirements 1.1, 1.4**

Property 2: Admin quota counter invariance
*For any* admin user, the quota counter value before and after uploading a document should remain unchanged
**Validates: Requirements 1.3**

Property 3: Admin dashboard displays unlimited capacity
*For any* admin user, rendering the dashboard should return "Unlimited" for the document upload capacity field
**Validates: Requirements 1.2**

### Sharing Properties

Property 4: Admin share creation bypass
*For any* admin user and any share count, creating a share (email or link) should succeed without quota validation errors
**Validates: Requirements 2.1, 2.2**

Property 5: Admin share quota counter invariance
*For any* admin user, the share quota counter value before and after creating a share should remain unchanged
**Validates: Requirements 2.4**

Property 6: Admin share management displays unlimited capacity
*For any* admin user, rendering the share management UI should return "Unlimited" for the sharing capacity field
**Validates: Requirements 2.3**

### Image Upload Properties

Property 7: Image format acceptance
*For any* file with extension JPG, JPEG, PNG, GIF, or WebP, the image upload validation should accept the file
**Validates: Requirements 3.1**

Property 8: Image format rejection
*For any* file that is not a valid image format, the image upload validation should reject the file with an error
**Validates: Requirements 3.2**

Property 9: Image storage persistence
*For any* uploaded image, querying Supabase Storage should return the image at the expected path
**Validates: Requirements 3.3**

Property 10: Image thumbnail generation
*For any* uploaded image, a thumbnail file should exist in storage after processing completes
**Validates: Requirements 3.4**

### Video Upload Properties

Property 11: Video format acceptance
*For any* file with extension MP4, WebM, or MOV, the video upload validation should accept the file
**Validates: Requirements 4.1**

Property 12: Video format rejection
*For any* file that is not a valid video format, the video upload validation should reject the file with an error
**Validates: Requirements 4.2**

Property 13: Video storage persistence
*For any* uploaded video, querying Supabase Storage should return the video at the expected path
**Validates: Requirements 4.3**

Property 14: Video metadata extraction
*For any* uploaded video, the stored metadata should contain duration and dimensions fields with valid values
**Validates: Requirements 4.4**


### Link Properties

Property 15: URL format validation
*For any* string, the URL validation function should correctly identify whether it is a valid HTTP or HTTPS URL
**Validates: Requirements 5.1, 5.5**

Property 16: Link storage round-trip
*For any* valid link with title and description, storing and then retrieving it should return the same URL, title, and description
**Validates: Requirements 5.2**

Property 17: Link metadata fetching
*For any* valid URL, after processing, the stored metadata should contain domain, title, and description fields
**Validates: Requirements 5.3**

### Content Viewer Properties

Property 18: Image viewer rendering
*For any* valid image document, the image viewer component should render without errors and display the image
**Validates: Requirements 6.1**

Property 19: Image viewer metadata display
*For any* image document, the rendered viewer should contain the image dimensions and file size in the output
**Validates: Requirements 6.3**

Property 20: Image watermark application
*For any* image view, the rendered output should include a watermark element
**Validates: Requirements 6.4**

Property 21: Video player rendering
*For any* valid video document, the video player component should render an HTML5 video element with controls
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

Property 22: Video player metadata display
*For any* video document, the rendered player should display duration and current time elements
**Validates: Requirements 7.5**

Property 23: Video watermark application
*For any* video view, the rendered output should include a watermark element
**Validates: Requirements 7.6**

Property 24: Link preview rendering
*For any* link document, the rendered preview should contain the title, description, domain, and preview image (if available)
**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

Property 25: Link opens in new tab
*For any* rendered link, the anchor element should have target="_blank" attribute
**Validates: Requirements 8.5**

### Upload Interface Properties

Property 26: Content type validation
*For any* selected content type, the upload validation should apply the correct rules for that type
**Validates: Requirements 9.3**

Property 27: Upload success confirmation
*For any* successful upload, the confirmation message should contain the uploaded content's title and type
**Validates: Requirements 9.5**

### Dashboard Properties

Property 28: Content grouping by type
*For any* set of documents, the dashboard should group them such that all documents of the same type appear together
**Validates: Requirements 10.1**

Property 29: Content type icon mapping
*For any* content document, the displayed icon should correspond to its content type
**Validates: Requirements 10.2**

Property 30: Content metadata display
*For any* content document, the dashboard should display metadata fields appropriate to its content type
**Validates: Requirements 10.3**

Property 31: Content type filtering
*For any* content type filter, the filtered results should contain only documents matching that type
**Validates: Requirements 10.4**

Property 32: Cross-type search
*For any* search query, the results should include documents from all content types (PDF, Image, Video, Link)
**Validates: Requirements 10.5**

