# Flipbook Viewer & Media Annotations - Implementation Tasks

## Phase 1: 3D Flipbook Viewer Implementation

### Task 1: Project Setup & Dependencies
**Priority**: High | **Estimate**: 2 hours

- [ ] 1.1 Install flipbook library
  - Run `npm install @stpageflip/react-pageflip`
  - Install PDF processing: `npm install pdf2pic sharp`
  - Install image optimization dependencies
  - Update TypeScript types
  - _Requirements: 1.1, 1.4_

- [ ] 1.2 Configure Next.js for image handling
  - Update next.config.ts for image optimization
  - Configure image domains for Supabase
  - Set up serverless function timeout for conversion
  - _Requirements: 1.4_

### Task 2: PDF to Image Conversion Service
**Priority**: High | **Estimate**: 6 hours

- [ ] 2.1 Create PDF converter utility
  - Create `lib/pdf-converter.ts`
  - Implement PDF to image conversion using pdf2pic
  - Add image optimization pipeline with Sharp
  - Implement error handling and logging
  - _Requirements: 2.1, 2.2_

- [ ] 2.2 Implement caching mechanism
  - Create `lib/page-cache.ts`
  - Check for existing converted pages before processing
  - Store page metadata in database
  - Implement cache invalidation logic
  - _Requirements: 2.3, 2.4, 2.5_

- [ ] 2.3 Create storage upload functions
  - Implement upload to document-pages bucket
  - Generate proper file paths: `{userId}/{documentId}/page-{pageNumber}.jpg`
  - Handle upload errors and retries
  - _Requirements: 2.3_

### Task 3: FlipBook Viewer Component
**Priority**: High | **Estimate**: 8 hours

- [ ] 3.1 Create base FlipBookViewer component
  - Create `components/FlipBookViewer.tsx`
  - Define component props interface
  - Initialize @stpageflip/react-pageflip
  - Implement basic page rendering
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 3.2 Implement navigation controls
  - Add click handlers for left/right edges
  - Implement keyboard navigation (arrow keys)
  - Add touch gesture support for mobile
  - Create page counter display
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

- [ ] 3.3 Add zoom and fullscreen functionality
  - Create zoom in/out buttons
  - Implement zoom state management (50%-300%)
  - Add fullscreen toggle button
  - Handle fullscreen API events
  - Maintain zoom level across pages
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 3.4 Implement responsive design
  - Add breakpoint detection (mobile/tablet/desktop)
  - Switch between single and dual-page modes
  - Apply gradient background and styling
  - Optimize animations for 60fps
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


### Task 4: DRM Integration
**Priority**: Critical | **Estimate**: 4 hours

- [ ] 4.1 Integrate existing DRM protections
  - Apply watermark overlay to flipbook pages
  - Disable right-click context menu
  - Control text selection based on allowTextSelection prop
  - Block download/print keyboard shortcuts
  - Integrate screenshot prevention
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 4.2 Test DRM features
  - Verify watermarks appear on all pages
  - Test right-click prevention
  - Test keyboard shortcut blocking
  - Verify screenshot detection works
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

### Task 5: API Endpoints for Page Conversion
**Priority**: High | **Estimate**: 4 hours

- [ ] 5.1 Create document conversion endpoint
  - Create `app/api/documents/convert/route.ts`
  - Implement POST handler for conversion requests
  - Add conversion queue system
  - Track conversion progress
  - Handle conversion errors
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 5.2 Create page retrieval endpoint
  - Create `app/api/pages/[docId]/[pageNum]/route.ts`
  - Return page image URL with authentication
  - Implement caching headers
  - _Requirements: 2.3, 2.4_

- [ ] 5.3 Create bulk pages endpoint
  - Create `app/api/documents/[id]/pages/route.ts`
  - Return all page URLs for a document
  - Include page metadata (dimensions, etc.)
  - _Requirements: 2.3, 2.4, 2.5_

### Task 6: Replace Existing PDF Viewers
**Priority**: High | **Estimate**: 6 hours

- [ ] 6.1 Update share view page
  - Replace PDF viewer in `app/view/[shareKey]/ViewerClient.tsx`
  - Import and use FlipBookViewer component
  - Pass watermark and user email props
  - Test share link functionality
  - _Requirements: 7.1, 7.5_

- [ ] 6.2 Update document preview page
  - Replace PDF viewer in `app/dashboard/documents/[id]/preview/PreviewClient.tsx`
  - Ensure preview works for document owners
  - Test navigation and controls
  - _Requirements: 7.2, 7.5_

- [ ] 6.3 Update member view page
  - Replace PDF viewer in `app/member/view/[itemId]/MyJstudyroomViewerClient.tsx`
  - Maintain payment verification flow
  - Test purchased content viewing
  - _Requirements: 7.3, 7.5_

- [ ] 6.4 Remove deprecated components
  - Deprecate or remove `components/pdf/PDFViewer.tsx`
  - Remove PDF.js dependencies if no longer needed
  - Update imports across codebase
  - _Requirements: 7.4_

### Task 7: Responsive Design & Mobile Optimization
**Priority**: Medium | **Estimate**: 4 hours

- [ ] 7.1 Implement mobile-first design
  - Test on various mobile devices
  - Optimize touch gesture handling
  - Adjust UI controls for small screens
  - _Requirements: 6.1, 6.4_

- [ ] 7.2 Optimize for tablet viewing
  - Test dual-page mode on tablets
  - Adjust breakpoints if needed
  - Optimize touch interactions
  - _Requirements: 6.2, 6.4_

- [ ] 7.3 Test across screen sizes
  - Test on various desktop resolutions
  - Verify responsive breakpoints work correctly
  - Check animation performance
  - _Requirements: 6.3, 6.4, 6.5_


## Phase 2: Media Annotations Implementation

### Task 8: Database Schema & Migration
**Priority**: High | **Estimate**: 3 hours

- [ ] 8.1 Update Prisma schema
  - Add DocumentAnnotation model to `prisma/schema.prisma`
  - Define fields: id, documentId, userId, pageNumber, selectedText, etc.
  - Add MediaType enum (AUDIO, VIDEO)
  - Add visibility field with default 'public'
  - Define relations to Document and User models
  - _Requirements: 10.1, 10.5_

- [ ] 8.2 Create database indexes
  - Add index on (documentId, pageNumber)
  - Add index on (userId)
  - Add composite index for efficient queries
  - _Requirements: 10.2, 10.3_

- [ ] 8.3 Create and run migration
  - Generate Prisma migration
  - Test migration on development database
  - Verify cascade delete behavior
  - _Requirements: 10.4, 10.5, 20.5_

### Task 9: Supabase Storage Setup
**Priority**: High | **Estimate**: 2 hours

- [ ] 9.1 Create storage buckets
  - Create `document-pages` bucket for page images
  - Create `document-media` bucket for annotation media
  - Configure bucket settings (private, size limits)
  - _Requirements: 19.1, 19.2_

- [ ] 9.2 Configure RLS policies
  - Set up Row Level Security for document-pages
  - Set up Row Level Security for document-media
  - Test access restrictions
  - _Requirements: 19.3_

- [ ] 9.3 Set up CORS and cleanup
  - Configure CORS policies for media streaming
  - Implement automatic cleanup of orphaned files
  - Test file deletion on annotation removal
  - _Requirements: 19.4, 19.5_

### Task 10: Text Selection & Annotation Toolbar
**Priority**: High | **Estimate**: 6 hours

- [ ] 10.1 Implement text selection detection
  - Add selection event listeners to flipbook
  - Capture selected text content
  - Calculate selection position and range
  - Determine page number of selection
  - _Requirements: 8.1, 8.4_

- [ ] 10.2 Create MediaAnnotationToolbar component
  - Create `components/MediaAnnotationToolbar.tsx`
  - Position toolbar near text selection
  - Add [Add Audio] and [Add Video] buttons
  - Implement show/hide logic
  - Add keyboard shortcuts (optional)
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 10.3 Implement role-based toolbar display
  - Check user role before showing toolbar
  - Only show for PLATFORM_USER role
  - Hide for MEMBER and READER roles
  - _Requirements: 8.5, 15.1, 15.2, 15.3_

### Task 11: Media Upload Modal
**Priority**: High | **Estimate**: 6 hours

- [ ] 11.1 Create MediaUploadModal component
  - Create `components/MediaUploadModal.tsx`
  - Design modal UI with tabs for upload/URL
  - Add file upload interface with drag & drop
  - Add external URL input field
  - _Requirements: 9.1, 9.2_

- [ ] 11.2 Implement file validation
  - Validate file types (MP3, WAV, MP4, WEBM)
  - Enforce 100MB file size limit
  - Show validation errors to user
  - _Requirements: 9.3_

- [ ] 11.3 Implement URL validation
  - Validate URL format
  - Support YouTube, Vimeo, SoundCloud URLs
  - Support direct media URLs
  - Show preview if possible
  - _Requirements: 9.4_

- [ ] 11.4 Add upload progress tracking
  - Show upload progress bar
  - Handle upload cancellation
  - Display success/error messages
  - _Requirements: 9.5_


### Task 12: Media Player Modal
**Priority**: High | **Estimate**: 5 hours

- [ ] 12.1 Create MediaPlayerModal component
  - Create `components/MediaPlayerModal.tsx`
  - Design modal UI for media playback
  - Add close button and controls
  - _Requirements: 12.1_

- [ ] 12.2 Implement audio player
  - Add HTML5 audio element
  - Create custom audio controls
  - Handle audio playback events
  - _Requirements: 12.2_

- [ ] 12.3 Implement video player
  - Add HTML5 video element
  - Create custom video controls
  - Handle video playback events
  - _Requirements: 12.3_

- [ ] 12.4 Add watermark overlay
  - Apply watermark to media player
  - Ensure watermark stays visible during playback
  - _Requirements: 12.4_

- [ ] 12.5 Prevent media downloading
  - Disable right-click on player
  - Remove download options
  - Use secure streaming URLs
  - _Requirements: 12.5, 12.6_

### Task 13: External Media Embedding
**Priority**: Medium | **Estimate**: 4 hours

- [ ] 13.1 Implement YouTube embedding
  - Detect YouTube URLs
  - Embed YouTube player with no-download params
  - Handle YouTube API events
  - _Requirements: 13.1_

- [ ] 13.2 Implement Vimeo embedding
  - Detect Vimeo URLs
  - Embed Vimeo player
  - Configure player options
  - _Requirements: 13.2_

- [ ] 13.3 Implement SoundCloud embedding
  - Detect SoundCloud URLs
  - Embed SoundCloud player
  - Configure player options
  - _Requirements: 13.3_

- [ ] 13.4 Handle direct media URLs
  - Detect direct MP3/MP4 URLs
  - Use HTML5 audio/video elements
  - Apply DRM protections
  - _Requirements: 13.4, 13.5_

### Task 14: Annotation Markers
**Priority**: Medium | **Estimate**: 4 hours

- [ ] 14.1 Create MediaAnnotationMarker component
  - Create `components/MediaAnnotationMarker.tsx`
  - Design marker icons (🎵 for audio, 🎬 for video)
  - Position markers on page
  - _Requirements: 11.1, 11.2_

- [ ] 14.2 Implement marker interactions
  - Add hover effects
  - Show tooltip with annotated text preview
  - Handle click to open media player
  - _Requirements: 11.3, 12.1_

- [ ] 14.3 Optimize marker positioning
  - Calculate marker positions to avoid overlap
  - Adjust for page zoom level
  - Handle responsive layout
  - _Requirements: 11.4_

- [ ] 14.4 Implement per-page annotation loading
  - Load annotations only for current page
  - Preload annotations for next page
  - Clear annotations when page changes
  - _Requirements: 11.5, 17.2_

### Task 15: Annotation API Endpoints
**Priority**: High | **Estimate**: 6 hours

- [ ] 15.1 Create annotation creation endpoint
  - Create `app/api/annotations/add/route.ts`
  - Validate user permissions (PLATFORM_USER only)
  - Handle media file upload
  - Save annotation to database
  - Return created annotation
  - _Requirements: 14.1, 15.1_

- [ ] 15.2 Create annotation retrieval endpoint
  - Create `app/api/annotations/[documentId]/route.ts`
  - Filter by page number (query param)
  - Apply visibility rules (public/private)
  - Return user permissions
  - _Requirements: 14.2, 16.2, 16.3_

- [ ] 15.3 Create annotation update endpoint
  - Create `app/api/annotations/[id]/route.ts` (PUT)
  - Verify ownership before update
  - Allow updating visibility and media
  - _Requirements: 14.3, 15.1, 16.5_

- [ ] 15.4 Create annotation deletion endpoint
  - Implement DELETE handler in `app/api/annotations/[id]/route.ts`
  - Verify ownership before deletion
  - Delete associated media files
  - _Requirements: 14.4, 15.1_

- [ ] 15.5 Create media upload endpoint
  - Create `app/api/media/upload/route.ts`
  - Handle multipart file upload
  - Encrypt media file
  - Store in document-media bucket
  - Return secure media URL
  - _Requirements: 14.5, 9.5, 9.6_

- [ ] 15.6 Create media streaming endpoint
  - Create `app/api/media/stream/[id]/route.ts`
  - Verify user authentication
  - Check access permissions
  - Stream media with proper headers
  - Track usage (optional)
  - _Requirements: 14.6_


### Task 16: Permission System Integration
**Priority**: High | **Estimate**: 3 hours

- [ ] 16.1 Implement role-based permissions
  - Create permission check utility
  - Define permission matrix for each role
  - Apply to annotation creation
  - Apply to annotation modification
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 16.2 Add permission validation to APIs
  - Validate permissions in all annotation endpoints
  - Return 403 Forbidden for unauthorized actions
  - Include permission info in API responses
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 16.3 Update UI based on permissions
  - Show/hide annotation toolbar based on role
  - Show/hide edit/delete buttons based on ownership
  - Display permission errors to users
  - _Requirements: 15.1, 15.2, 15.3_

### Task 17: Integration with FlipBook Viewer
**Priority**: High | **Estimate**: 4 hours

- [ ] 17.1 Add annotation loading to FlipBookViewer
  - Fetch annotations when page loads
  - Pass annotations to marker components
  - Handle annotation updates in real-time
  - _Requirements: 11.5, 17.2_

- [ ] 17.2 Integrate text selection with toolbar
  - Connect selection events to toolbar display
  - Pass selection data to annotation creation
  - Clear selection after annotation created
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 17.3 Position markers on pages
  - Calculate marker positions from selection ranges
  - Render markers on flipbook pages
  - Update positions on zoom/resize
  - _Requirements: 11.1, 11.2, 11.4_

- [ ] 17.4 Handle page change events
  - Load annotations for new page
  - Clear markers from previous page
  - Preload annotations for next page
  - _Requirements: 11.5, 17.2_

### Task 18: Media Processing & Security
**Priority**: Critical | **Estimate**: 5 hours

- [ ] 18.1 Implement media encryption
  - Create encryption utility
  - Encrypt uploaded media files
  - Store encryption keys securely
  - _Requirements: 9.6_

- [ ] 18.2 Create secure streaming URLs
  - Generate temporary signed URLs
  - Set appropriate expiration times
  - Validate URLs on access
  - _Requirements: 12.5_

- [ ] 18.3 Add media access validation
  - Verify user authentication
  - Check document access permissions
  - Log access attempts
  - _Requirements: 12.5, 14.6_

- [ ] 18.4 Implement usage tracking (optional)
  - Track media playback events
  - Store analytics data
  - Generate usage reports
  - _Requirements: 14.6_

- [ ] 18.5 Add watermark injection
  - Apply watermark to media player
  - Ensure watermark cannot be removed
  - Test across different media types
  - _Requirements: 12.4, 13.5_

## Phase 3: Testing & Optimization

### Task 19: Comprehensive Testing
**Priority**: High | **Estimate**: 8 hours

- [ ] 19.1 Unit tests for components
  - Test FlipBookViewer rendering
  - Test MediaAnnotationToolbar
  - Test MediaPlayerModal
  - Test MediaAnnotationMarker
  - _Requirements: All_

- [ ] 19.2 Integration tests for annotation flow
  - Test complete annotation creation flow
  - Test annotation retrieval and display
  - Test annotation editing and deletion
  - Test media upload and playback
  - _Requirements: 8.1-16.5_

- [ ] 19.3 E2E tests for flipbook navigation
  - Test page turning animations
  - Test zoom and fullscreen
  - Test keyboard and touch navigation
  - Test responsive breakpoints
  - _Requirements: 1.1-6.5_

- [ ] 19.4 Performance testing
  - Measure page load times
  - Test with large documents (100+ pages)
  - Monitor memory usage
  - Test on mobile devices
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 19.5 Security testing
  - Test DRM protections
  - Attempt media download bypass
  - Test access control enforcement
  - Verify watermark integrity
  - _Requirements: 5.1-5.6, 9.6, 12.4, 12.5_

- [ ] 19.6 Cross-browser testing
  - Test on Chrome, Firefox, Safari, Edge
  - Test on iOS and Android browsers
  - Verify consistent behavior
  - Fix browser-specific issues
  - _Requirements: All_


### Task 20: Performance Optimization
**Priority**: Medium | **Estimate**: 6 hours

- [ ] 20.1 Optimize page loading
  - Implement lazy loading for page images
  - Add intersection observer for preloading
  - Optimize image compression settings
  - _Requirements: 17.3, 17.5_

- [ ] 20.2 Implement caching strategies
  - Cache converted pages with 7-day TTL
  - Cache annotation data in memory
  - Use browser cache for static assets
  - _Requirements: 2.4, 2.5, 17.4_

- [ ] 20.3 Optimize media streaming
  - Implement adaptive bitrate streaming
  - Add media buffering strategies
  - Optimize for mobile networks
  - _Requirements: 17.2_

- [ ] 20.4 Memory usage optimization
  - Clean up unused page images
  - Limit number of cached pages
  - Monitor and fix memory leaks
  - _Requirements: 17.3_

- [ ] 20.5 Mobile performance tuning
  - Reduce animation complexity on mobile
  - Optimize touch event handlers
  - Test on low-end devices
  - _Requirements: 6.5, 17.5_

### Task 21: Error Handling & Recovery
**Priority**: Medium | **Estimate**: 4 hours

- [ ] 21.1 Add comprehensive error handling
  - Handle PDF conversion failures
  - Handle media upload errors
  - Handle network connectivity issues
  - Handle permission denied errors
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [ ] 21.2 Implement fallback mechanisms
  - Fall back to static viewer if flipbook fails
  - Retry failed operations automatically
  - Provide manual retry options
  - _Requirements: 18.1, 18.4_

- [ ] 21.3 Create user-friendly error messages
  - Display specific error messages
  - Provide actionable solutions
  - Log errors for debugging
  - _Requirements: 18.1, 18.2, 18.3_

- [ ] 21.4 Add error reporting
  - Implement error logging service
  - Track error frequency and patterns
  - Set up alerts for critical errors
  - _Requirements: 18.5_

### Task 22: Documentation & Deployment
**Priority**: Medium | **Estimate**: 4 hours

- [ ] 22.1 Create user documentation
  - Write guide for creating annotations
  - Document flipbook navigation controls
  - Create troubleshooting guide
  - _Requirements: All_

- [ ] 22.2 Write technical documentation
  - Document API endpoints
  - Document component interfaces
  - Document database schema
  - Create architecture diagrams
  - _Requirements: All_

- [ ] 22.3 Update deployment scripts
  - Add environment variables
  - Update build configuration
  - Create migration scripts
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 22.4 Create migration guides
  - Document migration process
  - Create rollback procedures
  - Test migration on staging
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 22.5 Add monitoring and logging
  - Set up performance monitoring
  - Configure error tracking
  - Add usage analytics
  - Create dashboards
  - _Requirements: All_

## Implementation Timeline

### Week 1: Flipbook Foundation
- Tasks 1-3 (Setup, conversion, viewer component)
- **Deliverable**: Basic flipbook viewer working

### Week 2: Flipbook Integration
- Tasks 4-7 (DRM, APIs, viewer replacement, responsive)
- **Deliverable**: Flipbook viewer fully integrated with DRM

### Week 3: Annotations Foundation
- Tasks 8-11 (Database, storage, selection, upload modal)
- **Deliverable**: Basic annotation creation working

### Week 4: Annotations Integration
- Tasks 12-18 (Player, markers, APIs, permissions, security)
- **Deliverable**: Full annotation system working

### Week 5: Testing & Polish
- Tasks 19-22 (Testing, optimization, documentation)
- **Deliverable**: Production-ready features

## Success Criteria

### Functional Requirements
- [ ] Flipbook viewer replaces all PDF viewers
- [ ] Smooth page turning animations (60fps)
- [ ] All DRM features maintained
- [ ] Text selection creates annotations
- [ ] Media playback works securely
- [ ] Permissions enforced correctly

### Performance Requirements
- [ ] Page conversion < 5 seconds per document
- [ ] Annotation loading < 1 second
- [ ] Page load time < 2 seconds
- [ ] Smooth animations on all devices

### Security Requirements
- [ ] All DRM tests pass
- [ ] Media cannot be downloaded
- [ ] Watermarks always visible
- [ ] Access controls enforced
- [ ] No security vulnerabilities

### User Experience Requirements
- [ ] Intuitive navigation
- [ ] Responsive design works on all devices
- [ ] Clear error messages
- [ ] Fast and reliable operation
