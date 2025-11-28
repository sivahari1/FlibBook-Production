# Flipbook Viewer & Media Annotations - Requirements Document

## Introduction

This specification defines two major enhancements to the jStudyRoom platform:
1. **3D Flipbook Viewer**: Replace the current PDF viewer with a realistic page-turning flipbook experience using @stpageflip/react-pageflip
2. **Media Annotations**: Enable Platform Users to embed audio/video content into selected text within documents, creating enriched, interactive learning materials

These features will maintain all existing DRM protections while providing a more engaging and educational experience for viewers.

## Glossary

- **Flipbook Viewer**: A component that displays document pages with realistic 3D page-turning animations
- **Page Image**: A rasterized image (JPG/PNG) converted from a PDF page for flipbook display
- **Media Annotation**: A user-created link between selected text in a document and an audio or video file
- **Annotation Creator**: A Platform User who adds media annotations to documents
- **Annotation Viewer**: A Member or Reader who views and interacts with media annotations
- **Media Marker**: A visual indicator (icon) displayed near annotated text
- **Media Player Modal**: A popup window that plays audio or video content securely
- **External Media URL**: A link to media hosted on third-party platforms (YouTube, Vimeo, SoundCloud, etc.)
- **Document Pages Bucket**: Supabase Storage bucket containing converted page images
- **Document Media Bucket**: Supabase Storage bucket containing uploaded annotation media files
- **Page Conversion**: The process of converting PDF pages to optimized images for flipbook display

## Requirements

### Requirement 1: Flipbook Library Integration

**User Story:** As a developer, I want to integrate a production-ready flipbook library, so that users can experience realistic page-turning animations.

#### Acceptance Criteria

1. THE FlipBook System SHALL use @stpageflip/react-pageflip as the primary flipbook rendering library
2. WHEN the FlipBookViewer component initializes, THE FlipBook System SHALL configure the library with appropriate dimensions and animation settings
3. THE FlipBook System SHALL support both single-page and double-page display modes based on screen size
4. THE FlipBook System SHALL maintain compatibility with Next.js App Router and React 19

### Requirement 2: PDF to Image Conversion

**User Story:** As a platform user, I want my PDF documents automatically converted to page images, so that they can be displayed in the flipbook viewer.

#### Acceptance Criteria

1. WHEN a Document is uploaded, THE FlipBook System SHALL convert each PDF page to a JPG image with 150 DPI resolution
2. WHEN converting pages, THE FlipBook System SHALL optimize images using Sharp library with 85% quality compression
3. WHEN page conversion completes, THE FlipBook System SHALL store images in the Document Pages Bucket at path `{userId}/{documentId}/page-{pageNumber}.jpg`
4. THE FlipBook System SHALL cache converted pages to avoid redundant processing
5. IF page images already exist for a Document, THEN THE FlipBook System SHALL reuse cached images instead of reconverting

### Requirement 3: Flipbook Navigation Controls

**User Story:** As a viewer, I want intuitive controls to navigate through the flipbook, so that I can easily browse document pages.

#### Acceptance Criteria

1. WHEN a Viewer clicks the left edge of the flipbook, THE FlipBook System SHALL turn to the previous page with animation
2. WHEN a Viewer clicks the right edge of the flipbook, THE FlipBook System SHALL turn to the next page with animation
3. WHEN a Viewer presses the left arrow key, THE FlipBook System SHALL turn to the previous page
4. WHEN a Viewer presses the right arrow key, THE FlipBook System SHALL turn to the next page
5. WHEN a Viewer uses touch gestures on mobile, THE FlipBook System SHALL support swipe left/right for page navigation
6. THE FlipBook System SHALL display a page counter showing current page and total pages

### Requirement 4: Flipbook Zoom and Fullscreen

**User Story:** As a viewer, I want to zoom in on pages and enter fullscreen mode, so that I can read content more comfortably.

#### Acceptance Criteria

1. WHEN a Viewer clicks the zoom in button, THE FlipBook System SHALL increase the flipbook scale by 25% up to a maximum of 300%
2. WHEN a Viewer clicks the zoom out button, THE FlipBook System SHALL decrease the flipbook scale by 25% down to a minimum of 50%
3. WHEN a Viewer clicks the fullscreen button, THE FlipBook System SHALL enter browser fullscreen mode
4. WHEN in fullscreen mode and the Viewer presses Escape, THE FlipBook System SHALL exit fullscreen mode
5. THE FlipBook System SHALL maintain zoom level when navigating between pages

### Requirement 5: DRM Integration with Flipbook

**User Story:** As a document owner, I want all existing DRM protections to work with the flipbook viewer, so that my content remains secure.

#### Acceptance Criteria

1. WHEN the FlipBookViewer renders, THE FlipBook System SHALL apply watermark overlays to all page images
2. WHEN the FlipBookViewer is active, THE FlipBook System SHALL disable right-click context menus
3. WHEN the FlipBookViewer is active, THE FlipBook System SHALL prevent text selection unless explicitly allowed
4. WHEN the FlipBookViewer is active, THE FlipBook System SHALL block download and print keyboard shortcuts
5. THE FlipBook System SHALL integrate with existing screenshot prevention mechanisms
6. THE FlipBook System SHALL enforce all existing page access restrictions

### Requirement 6: Responsive Flipbook Design

**User Story:** As a viewer on any device, I want the flipbook to adapt to my screen size, so that I have an optimal viewing experience.

#### Acceptance Criteria

1. WHERE the viewport width is less than 768px, THE FlipBook System SHALL display single-page mode
2. WHERE the viewport width is between 768px and 1024px, THE FlipBook System SHALL display optimized dual-page mode
3. WHERE the viewport width is greater than 1024px, THE FlipBook System SHALL display full dual-page mode
4. THE FlipBook System SHALL use a gradient background with modern styling (soft shadows, smooth animations)
5. THE FlipBook System SHALL maintain 60fps animation performance on all supported devices

### Requirement 7: Replace Existing PDF Viewers

**User Story:** As a developer, I want to replace all existing PDF viewers with the new flipbook viewer, so that users have a consistent experience.

#### Acceptance Criteria

1. THE FlipBook System SHALL replace the PDF viewer in the share view page at `/view/[shareKey]`
2. THE FlipBook System SHALL replace the PDF viewer in the document preview page at `/dashboard/documents/[id]/preview`
3. THE FlipBook System SHALL replace the PDF viewer in the member view page at `/member/view/[itemId]`
4. THE FlipBook System SHALL remove or deprecate components using iframe, react-pdf, or PDF.js for document display
5. THE FlipBook System SHALL maintain all existing viewer functionality (watermarks, analytics tracking, access control)

### Requirement 8: Text Selection for Annotations

**User Story:** As a Platform User, I want to select text in documents and add media annotations, so that I can create enriched learning materials.

#### Acceptance Criteria

1. WHEN a Platform User selects text in the flipbook viewer, THE FlipBook System SHALL display a floating toolbar near the selection
2. THE floating toolbar SHALL contain [Add Audio] and [Add Video] buttons
3. WHEN the Platform User clicks outside the selection, THE FlipBook System SHALL hide the floating toolbar
4. THE FlipBook System SHALL capture the selected text content, page number, and character position range
5. WHERE a Member or Reader selects text, THE FlipBook System SHALL NOT display the annotation toolbar

### Requirement 9: Media Upload and URL Input

**User Story:** As a Platform User, I want to upload media files or provide external URLs, so that I can attach audio or video to my annotations.

#### Acceptance Criteria

1. WHEN a Platform User clicks [Add Audio] or [Add Video], THE FlipBook System SHALL open a media upload modal
2. THE media upload modal SHALL provide options to upload a file OR paste an external URL
3. WHEN uploading a file, THE FlipBook System SHALL accept MP3, WAV for audio and MP4, WEBM for video with maximum size of 100MB
4. WHEN providing an external URL, THE FlipBook System SHALL validate the URL format and support YouTube, Vimeo, SoundCloud, and direct media URLs
5. WHEN media is uploaded, THE FlipBook System SHALL store the file in the Document Media Bucket at path `{userId}/{documentId}/annotations/{annotationId}.{ext}`
6. THE FlipBook System SHALL encrypt uploaded media files using the same DRM protection as documents

### Requirement 10: Annotation Database Storage

**User Story:** As a system administrator, I want annotations stored in a structured database, so that they can be efficiently retrieved and managed.

#### Acceptance Criteria

1. THE FlipBook System SHALL create a DocumentAnnotations table with fields: id, documentId, userId, pageNumber, selectedText, selectionStart, selectionEnd, mediaType, mediaUrl, mediaFileName, isExternalUrl, createdAt, updatedAt
2. THE FlipBook System SHALL create an index on (documentId, pageNumber) for efficient page-based queries
3. THE FlipBook System SHALL create an index on (userId) for user annotation queries
4. WHEN a Document is deleted, THE FlipBook System SHALL cascade delete all associated DocumentAnnotations
5. WHEN a User is deleted, THE FlipBook System SHALL cascade delete all annotations created by that User

### Requirement 11: Media Annotation Rendering

**User Story:** As a viewer, I want to see visual indicators for annotated text, so that I know where media content is available.

#### Acceptance Criteria

1. WHEN a page with annotations is displayed, THE FlipBook System SHALL render media marker icons near the annotated text
2. THE FlipBook System SHALL use a 🎵 icon for audio annotations and a 🎬 icon for video annotations
3. WHEN a Viewer hovers over a media marker, THE FlipBook System SHALL display a tooltip with the first 50 characters of the annotated text
4. THE FlipBook System SHALL position markers to avoid overlapping with document content
5. THE FlipBook System SHALL load annotations for the current page only to optimize performance

### Requirement 12: Secure Media Playback

**User Story:** As a viewer, I want to play annotation media in a secure popup, so that I can access the content without downloading files.

#### Acceptance Criteria

1. WHEN a Viewer clicks a media marker, THE FlipBook System SHALL open a Media Player Modal
2. THE Media Player Modal SHALL display an inline audio player for audio annotations
3. THE Media Player Modal SHALL display an inline video player for video annotations
4. WHILE media is playing, THE FlipBook System SHALL maintain watermark overlay on the modal
5. THE FlipBook System SHALL prevent direct media URL access and disable download options in the player
6. WHEN the Viewer closes the modal, THE FlipBook System SHALL stop media playback

### Requirement 13: External Media Embedding

**User Story:** As a viewer, I want to play external media from platforms like YouTube, so that I can access rich content without file uploads.

#### Acceptance Criteria

1. WHERE an annotation uses a YouTube URL, THE FlipBook System SHALL embed the YouTube player with appropriate parameters to disable download
2. WHERE an annotation uses a Vimeo URL, THE FlipBook System SHALL embed the Vimeo player
3. WHERE an annotation uses a SoundCloud URL, THE FlipBook System SHALL embed the SoundCloud player
4. WHERE an annotation uses a direct media URL, THE FlipBook System SHALL use HTML5 audio/video elements
5. THE FlipBook System SHALL apply the same DRM protections to external media embeds as to uploaded files

### Requirement 14: Annotation API Endpoints

**User Story:** As a developer, I want RESTful API endpoints for annotation management, so that the frontend can create, read, update, and delete annotations.

#### Acceptance Criteria

1. THE FlipBook System SHALL provide POST /api/annotations/add endpoint to create new annotations
2. THE FlipBook System SHALL provide GET /api/annotations/[documentId] endpoint to retrieve all annotations for a document
3. THE FlipBook System SHALL provide PUT /api/annotations/[id] endpoint to update an existing annotation
4. THE FlipBook System SHALL provide DELETE /api/annotations/[id] endpoint to remove an annotation
5. THE FlipBook System SHALL provide POST /api/media/upload endpoint to handle media file uploads
6. THE FlipBook System SHALL provide GET /api/media/stream/[id] endpoint to stream media files securely

### Requirement 15: Annotation Permission System

**User Story:** As a system administrator, I want role-based permissions for annotations, so that only authorized users can create or modify them.

#### Acceptance Criteria

1. WHERE a User has role PLATFORM_USER, THE FlipBook System SHALL allow creating, reading, updating own, and deleting own annotations
2. WHERE a User has role MEMBER, THE FlipBook System SHALL allow reading annotations only
3. WHERE a User has role READER, THE FlipBook System SHALL allow reading annotations only
4. WHERE a User has role ADMIN, THE FlipBook System SHALL allow full access to all annotations
5. WHEN a non-Platform User attempts to create an annotation, THE FlipBook System SHALL return a 403 Forbidden error

### Requirement 16: Annotation Visibility Controls

**User Story:** As a Platform User, I want to control who can see my annotations, so that I can manage content visibility.

#### Acceptance Criteria

1. WHEN creating an annotation, THE Platform User SHALL have the option to set visibility to "public" or "private"
2. WHERE an annotation is marked "private", THE FlipBook System SHALL display it only to the creator
3. WHERE an annotation is marked "public", THE FlipBook System SHALL display it to all viewers with document access
4. THE FlipBook System SHALL default new annotations to "public" visibility
5. THE Platform User SHALL be able to change annotation visibility after creation

### Requirement 17: Performance and Caching

**User Story:** As a viewer, I want fast page loading and smooth interactions, so that I have a responsive experience.

#### Acceptance Criteria

1. THE FlipBook System SHALL complete page conversion in less than 5 seconds per document
2. THE FlipBook System SHALL load annotations for a page in less than 1 second
3. THE FlipBook System SHALL preload the next 2 pages while viewing the current page
4. THE FlipBook System SHALL cache converted page images with a 7-day TTL
5. THE FlipBook System SHALL use lazy loading for page images to reduce initial load time

### Requirement 18: Error Handling and Recovery

**User Story:** As a viewer, I want clear error messages and recovery options, so that I can resolve issues quickly.

#### Acceptance Criteria

1. IF page conversion fails, THEN THE FlipBook System SHALL display an error message and provide a retry button
2. IF media upload fails, THEN THE FlipBook System SHALL display the specific error (file too large, invalid format, network error) and allow retry
3. IF annotation loading fails, THEN THE FlipBook System SHALL log the error and continue displaying the document without annotations
4. IF the flipbook library fails to initialize, THEN THE FlipBook System SHALL fall back to a static page viewer
5. THE FlipBook System SHALL log all errors to the server for debugging and monitoring

### Requirement 19: Storage Bucket Configuration

**User Story:** As a system administrator, I want properly configured storage buckets, so that page images and media files are stored securely.

#### Acceptance Criteria

1. THE FlipBook System SHALL create a "document-pages" Supabase Storage bucket for page images
2. THE FlipBook System SHALL create a "document-media" Supabase Storage bucket for annotation media
3. THE FlipBook System SHALL configure Row Level Security (RLS) policies to restrict access to authenticated users
4. THE FlipBook System SHALL set appropriate CORS policies for media streaming
5. THE FlipBook System SHALL implement automatic cleanup of orphaned files when documents or annotations are deleted

### Requirement 20: Migration and Backward Compatibility

**User Story:** As a system administrator, I want existing documents to work with the new flipbook viewer, so that users don't lose access to their content.

#### Acceptance Criteria

1. WHEN an existing Document is first viewed in the flipbook viewer, THE FlipBook System SHALL automatically trigger page conversion
2. THE FlipBook System SHALL maintain the existing Document database schema without breaking changes
3. THE FlipBook System SHALL support viewing documents that haven't been converted yet using a fallback viewer
4. THE FlipBook System SHALL provide a migration script to pre-convert all existing documents
5. THE FlipBook System SHALL update the Prisma schema to include the DocumentAnnotations model without affecting existing models
