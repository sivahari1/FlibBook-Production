# Implementation Plan

- [x] 1. Database schema migration for multi-content type support





  - Add contentType, metadata, thumbnailUrl, linkUrl columns to Document table
  - Add contentType, metadata, previewUrl, linkUrl columns to BookShopItem table
  - Add check constraints for content types
  - Create indexes for performance
  - _Requirements: 3.3, 4.3, 5.2, 11.3_

- [x] 2. Create content type definitions and interfaces





  - Define ContentType enum (PDF, IMAGE, VIDEO, LINK)
  - Create ContentMetadata interface with type-specific fields
  - Create EnhancedDocument interface
  - Create BookShopItem interface extensions
  - _Requirements: 3.1, 4.1, 5.1, 11.3_

- [x] 3. Implement role-based access control (RBAC) for admin privileges





  - Create RolePermissions interface
  - Define ROLE_PERMISSIONS constant with admin unlimited privileges
  - Implement checkUploadPermission function
  - Implement checkSharePermission function
  - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.4_

- [x] 4. Build content processing pipeline






- [x] 4.1 Implement ContentProcessor class

  - Create processPDF method with thumbnail generation
  - Create processImage method with thumbnail generation
  - Create processVideo method with thumbnail and metadata extraction
  - _Requirements: 3.3, 3.4, 4.3, 4.4_


- [x] 4.2 Implement LinkProcessor class

  - Create URL validation function
  - Create metadata fetching from Open Graph tags
  - Create preview image storage
  - _Requirements: 5.1, 5.3, 5.5_

- [ ]* 4.3 Write property tests for content processing
  - **Property 9: Image storage persistence**
  - **Property 13: Video storage persistence**
  - **Property 16: Link storage round-trip**
  - **Validates: Requirements 3.3, 4.3, 5.2**

- [x] 5. Create file validation and sanitization utilities



  - Implement file type validation for images (JPG, PNG, GIF, WebP)
  - Implement file type validation for videos (MP4, WebM, MOV)
  - Implement file size validation
  - Implement filename sanitization
  - _Requirements: 3.1, 3.2, 4.1, 4.2_

- [x] 5.1 Write property tests for file validation






  - **Property 7: Image format acceptance**
  - **Property 8: Image format rejection**
  - **Property 11: Video format acceptance**
  - **Property 12: Video format rejection**
  - **Property 15: URL format validation**
  - **Validates: Requirements 3.1, 3.2, 4.1, 4.2, 5.1, 5.5**

- [x] 6. Build enhanced upload API





  - Create POST /api/documents/upload endpoint
  - Implement multi-content type handling
  - Integrate RBAC permission checks
  - Integrate content processing pipeline
  - Return quota information in response
  - _Requirements: 1.1, 1.4, 3.1, 4.1, 5.1, 9.3_

- [x] 6.1 Write property tests for upload API






  - **Property 1: Admin upload quota bypass**
  - **Property 2: Admin quota counter invariance**
  - **Property 26: Content type validation**
  - **Validates: Requirements 1.1, 1.3, 1.4, 9.3**

- [x] 7. Create content type selector component





  - Build ContentTypeSelector UI component
  - Implement type selection with icons
  - Filter allowed types based on user role
  - _Requirements: 9.1_

- [x] 8. Build file uploader component





  - Create FileUploader component for PDF/Image/Video
  - Implement drag-and-drop functionality
  - Show file preview before upload
  - Display upload progress
  - _Requirements: 9.2_

- [x] 9. Build link uploader component








  - Create LinkUploader component
  - Implement URL input with validation
  - Fetch and display link metadata preview
  - Allow manual title/description override
  - _Requirements: 5.1, 5.3, 9.2_

- [x] 10. Create enhanced upload modal





  - Build EnhancedUploadModal component
  - Integrate ContentTypeSelector
  - Integrate FileUploader and LinkUploader
  - Add BookShop upload option for admins
  - Show success/error messages
  - _Requirements: 9.1, 9.2, 9.4, 9.5, 11.1_

- [x] 10.1 Write property tests for upload modal






  - **Property 27: Upload success confirmation**
  - **Validates: Requirements 9.5**

- [x] 11. Build image viewer component





  - Create ImageViewer component
  - Implement zoom functionality
  - Display image metadata (dimensions, file size)
  - Apply watermark overlay
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 11.1 Write property tests for image viewer






  - **Property 18: Image viewer rendering**
  - **Property 19: Image viewer metadata display**
  - **Property 20: Image watermark application**
  - **Validates: Requirements 6.1, 6.3, 6.4**

- [x] 12. Build video player component





  - Create VideoPlayer component with HTML5 video
  - Implement playback controls
  - Display video metadata (duration, dimensions)
  - Apply watermark overlay
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 12.1 Write property tests for video player






  - **Property 21: Video player rendering**
  - **Property 22: Video player metadata display**
  - **Property 23: Video watermark application**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

- [x] 13. Build link preview component





  - Create LinkPreview component
  - Display title, description, domain
  - Show preview image if available
  - Open link in new tab
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 13.1 Write property tests for link preview






  - **Property 24: Link preview rendering**
  - **Property 25: Link opens in new tab**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 14. Create universal content viewer





  - Build UniversalViewer component
  - Route to appropriate viewer based on content type
  - Handle loading and error states
  - Track analytics events
  - _Requirements: 6.1, 7.1, 8.1, 14.1, 14.2, 14.3, 14.4_

- [x] 14.1 Write property tests for universal viewer






  - **Property 44: Content viewer routing**
  - **Validates: Requirements 14.1, 14.2, 14.3, 14.4**

- [x] 15. Enhance dashboard with multi-content type support





  - Update dashboard to display all content types
  - Add content type icons to document cards
  - Display type-specific metadata
  - Show "Unlimited" for admin quota
  - _Requirements: 1.2, 10.1, 10.2, 10.3_

- [x] 15.1 Write property tests for dashboard






  - **Property 3: Admin dashboard displays unlimited capacity**
  - **Property 28: Content grouping by type**
  - **Property 29: Content type icon mapping**
  - **Property 30: Content metadata display**
  - **Validates: Requirements 1.2, 10.1, 10.2, 10.3**

- [x] 16. Implement content filtering and search





  - Add content type filter dropdown
  - Implement cross-type search functionality
  - Update API to support content type filtering
  - _Requirements: 10.4, 10.5_

- [x] 16.1 Write property tests for filtering







  - **Property 31: Content type filtering**
  - **Property 32: Cross-type search**
  - **Validates: Requirements 10.4, 10.5**

- [x] 17. Enhance sharing API for admin unlimited shares





  - Update share creation endpoints
  - Bypass quota checks for admin users
  - Update share counter logic
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 17.1 Write property tests for sharing











  - **Property 4: Admin share creation bypass**
  - **Property 5: Admin share quota counter invariance**
  - **Validates: Requirements 2.1, 2.2, 2.4**

- [x] 18. Update share management UI





  - Display "Unlimited" for admin share capacity
  - Show share count and quota status
  - _Requirements: 2.3_

- [x] 18.1 Write property tests for share management UI






  - **Property 6: Admin share management displays unlimited capacity**
  - **Validates: Requirements 2.3**

- [x] 19. Enhance BookShop form for multi-content type





  - Update BookShopItemForm to support all content types
  - Add content type selector
  - Add file/link upload based on type
  - Support pricing (free or paid)
  - Support visibility (published/draft)
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 19.1 Write property tests for BookShop form








  - **Property 33: BookShop multi-content type support**
  - **Property 34: BookShop pricing flexibility**
  - **Property 35: BookShop visibility states**
  - **Validates: Requirements 11.3, 11.4, 11.5**

- [x] 20. Create BookShop API endpoints for multi-content










  - Update POST /api/admin/bookshop to handle all content types
  - Update PUT /api/admin/bookshop/[id] for updates
  - Update DELETE /api/admin/bookshop/[id] with purchase preservation
  - Add analytics endpoint with content type breakdown
  - _Requirements: 11.3, 12.2, 12.3, 12.4, 12.5_

- [x] 20.1 Write property tests for BookShop API





  - **Property 37: BookShop item deletion visibility**
  - **Property 38: BookShop purchase preservation**
  - **Property 39: BookShop analytics by type**
  - **Validates: Requirements 12.3, 12.4, 12.5**

- [x] 21. Enhance BookShop catalog display for members






  - Update BookShop component to display all content types
  - Add content type badges
  - Display type-specific metadata (duration for videos, dimensions for images, domain for links)
  - Show preview thumbnails
  - _Requirements: 12.1, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 21.1 Write property tests for BookShop catalog







  - **Property 36: BookShop catalog completeness**
  - **Property 40: BookShop content type badges**
  - **Property 41: BookShop video duration display**
  - **Property 42: BookShop image dimensions display**
  - **Property 43: BookShop link domain display**
  - **Validates: Requirements 12.1, 13.1, 13.3, 13.4, 13.5**

- [x] 22. Implement purchased content viewing






  - Update My jStudyRoom to display all content types
  - Route to appropriate viewer based on content type
  - Apply watermarks to all viewed content
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 22.1 Write property tests for purchased content







  - **Property 45: Purchased content watermarking**
  - **Validates: Requirements 14.5**

- [x] 23. Add Supabase storage policies for new content types





  - Create storage buckets for images and videos
  - Set up RLS policies for admin access
  - Set up RLS policies for member access to purchased content
  - _Requirements: 3.3, 4.3_

- [x] 24. Implement thumbnail generation





  - Create thumbnail generation for images
  - Create thumbnail generation for videos (first frame)
  - Store thumbnails in appropriate storage paths
  - _Requirements: 3.4, 4.4_

- [x] 24.1 Write property tests for thumbnail generation






  - **Property 10: Image thumbnail generation**
  - **Property 14: Video metadata extraction**
  - **Validates: Requirements 3.4, 4.4**

- [x] 25. Create error handling utilities





  - Implement UploadError class
  - Define error codes for all upload scenarios
  - Create user-friendly error messages
  - _Requirements: 9.4_

- [x] 26. Update existing upload modal to use enhanced version





  - Replace current UploadModal with EnhancedUploadModal
  - Maintain backward compatibility for existing PDF uploads
  - Update all references in dashboard
  - _Requirements: 9.1, 9.2_

- [x] 27. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
