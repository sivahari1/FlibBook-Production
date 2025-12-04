# Preview Content Rendering Fix - Implementation Tasks

## Task 1: Verify and Fix NextAuth API Route

- [ ] 1.1 Confirm NextAuth API route exists at `app/api/auth/[...nextauth]/route.ts`
  - Verify it exports GET and POST handlers
  - Ensure it uses authOptions from lib/auth
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 1.2 Test NextAuth endpoints return JSON
  - Test `/api/auth/session` returns JSON
  - Test `/api/auth/providers` returns JSON
  - Verify no HTML responses from auth routes
  - _Requirements: 3.3, 3.4, 3.5_

## Task 2: Fix Middleware to Allow API Routes

- [ ] 2.1 Update middleware.ts to not redirect API calls
  - Allow all `/api/` routes to handle their own auth
  - Only redirect page requests to login
  - Test that API routes return JSON, not HTML redirects
  - _Requirements: 3.4_

## Task 3: Create Database Migration for DocumentPage Model

- [ ] 3.1 Create Prisma migration for DocumentPage model
  - Add DocumentPage model to schema.prisma
  - Include documentId, pageNumber, storagePath, width, height fields
  - Add unique constraint on (documentId, pageNumber)
  - Add index on documentId
  - _Requirements: 6.2_

- [ ] 3.2 Run migration and verify database schema
  - Execute `npx prisma migrate dev`
  - Verify table created in Supabase
  - Test inserting sample data
  - _Requirements: 6.2_

## Task 4: Create Supabase Storage Bucket

- [ ] 4.1 Create "document-pages" storage bucket
  - Create bucket in Supabase dashboard or via API
  - Set public access policy for authenticated users
  - Configure CORS if needed
  - _Requirements: 6.1_

- [ ] 4.2 Test bucket access and upload
  - Upload test image to bucket
  - Generate signed URL
  - Verify image loads in browser
  - _Requirements: 6.1, 6.3_

## Task 5: Implement PDF Conversion Service

- [ ] 5.1 Create pdf-converter.ts service
  - Install pdf-lib or pdfjs-dist dependency
  - Implement convertPdfToPages function
  - Download PDF from Supabase Storage
  - Convert each page to PNG image
  - _Requirements: 2.1, 2.2_

- [ ] 5.2 Upload converted pages to storage
  - Upload each page image to "document-pages" bucket
  - Use path format: `{documentId}/page-{pageNumber}.png`
  - Generate and return page URLs
  - _Requirements: 6.1, 6.2_

- [ ] 5.3 Store page URLs in database
  - Insert DocumentPage records for each page
  - Store storagePath, width, height
  - Handle duplicate page numbers
  - _Requirements: 6.2_

- [ ] 5.4 Add error handling and logging
  - Catch conversion errors
  - Log detailed error messages
  - Return user-friendly error messages
  - _Requirements: 2.4_

## Task 6: Implement Page Cache Service

- [ ] 6.1 Create page-cache.ts service
  - Implement getCachedPageUrls function
  - Implement hasCachedPages function
  - Implement cachePageUrls function
  - _Requirements: 6.2, 6.3_

- [ ] 6.2 Add signed URL generation
  - Generate signed URLs for each page
  - Set 1-hour expiration
  - Handle URL generation errors
  - _Requirements: 6.3, 6.4_

## Task 7: Fix Document Pages API Route

- [ ] 7.1 Update GET handler in app/api/documents/[id]/pages/route.ts
  - Add proper session authentication
  - Return 401 JSON for unauthenticated requests
  - Verify document ownership
  - _Requirements: 3.1, 3.2_

- [ ] 7.2 Implement page retrieval logic
  - Check for cached pages using hasCachedPages
  - If pages exist, return them with signed URLs
  - If no pages, trigger conversion automatically
  - Return converted pages
  - _Requirements: 1.1, 1.4, 2.5_

- [ ] 7.3 Add comprehensive error handling
  - Handle document not found (404)
  - Handle conversion failures (500)
  - Handle storage access errors (500)
  - Return JSON error responses with messages
  - _Requirements: 1.3, 3.2_

## Task 8: Fix Document Conversion API Route

- [ ] 8.1 Update POST handler in app/api/documents/convert/route.ts
  - Add proper session authentication
  - Validate documentId parameter
  - Verify document ownership
  - _Requirements: 3.1, 3.2_

- [ ] 8.2 Implement conversion trigger logic
  - Call convertPdfToPages service
  - Return success response with page URLs
  - Handle conversion errors
  - _Requirements: 2.1, 2.3, 2.4_

## Task 9: Fix PreviewViewerClient Component

- [ ] 9.1 Update page fetching logic
  - Use initialPages if provided from server
  - Only fetch from API if no initial pages
  - Handle empty page arrays correctly
  - _Requirements: 1.1, 1.2_

- [ ] 9.2 Improve loading and error states
  - Show clear loading indicator during conversion
  - Display specific error messages
  - Add retry button for failed loads
  - _Requirements: 1.2, 1.3_

- [ ] 9.3 Fix page data transformation
  - Ensure pages are in correct format for FlipBook
  - Handle both `url` and `imageUrl` properties
  - Set default dimensions if missing
  - _Requirements: 1.1_

## Task 10: Fix FlipBookContainerWithDRM Component

- [ ] 10.1 Change showWatermark default to false
  - Update default parameter from `true` to `false`
  - Only use watermark when explicitly enabled
  - Remove userEmail fallback when watermark disabled
  - _Requirements: 5.1, 5.2, 5.4_

- [ ] 10.2 Fix watermark text logic
  - Only set effectiveWatermark when showWatermark is true
  - Use watermarkText if provided, otherwise userEmail
  - Pass undefined when watermark disabled
  - _Requirements: 5.3, 5.5_

- [ ] 10.3 Improve viewport utilization
  - Update dimension calculations to use 90% width
  - Use h-screen for full viewport height
  - Reduce padding for more content space
  - _Requirements: 4.1, 4.2, 4.3_

## Task 11: Fix Server-Side Page Fetching

- [ ] 11.1 Update app/dashboard/documents/[id]/view/page.tsx
  - Fetch pages on server-side using getCachedPageUrls
  - Pass initialPages to PreviewViewerClient
  - Handle cases where no pages exist yet
  - _Requirements: 1.1, 1.5_

- [ ] 11.2 Add conversion status checking
  - Check if pages exist before rendering
  - Trigger conversion if needed
  - Pass conversion status to client
  - _Requirements: 2.1, 2.2, 2.5_

## Task 12: Add Automatic Conversion on Upload

- [ ] 12.1 Update document upload API route
  - Trigger PDF conversion after successful upload
  - Run conversion asynchronously (don't block response)
  - Log conversion status
  - _Requirements: 2.1_

- [ ] 12.2 Add conversion status to document model
  - Add conversionStatus field (pending, processing, completed, failed)
  - Update status during conversion
  - Display status in UI if needed
  - _Requirements: 2.2, 2.3_

## Task 13: Testing and Validation

- [ ] 13.1 Test PDF upload and conversion
  - Upload new PDF
  - Verify automatic conversion triggers
  - Check pages stored in database
  - Verify images in storage bucket
  - _Requirements: 2.1, 2.3, 6.1, 6.2_

- [ ] 13.2 Test preview rendering
  - Open preview for converted document
  - Verify pages display correctly
  - Check watermark behavior (disabled by default)
  - Test full viewport display
  - _Requirements: 1.1, 4.1, 5.1_

- [ ] 13.3 Test error scenarios
  - Test with corrupted PDF
  - Test with missing document
  - Test with expired session
  - Verify error messages display correctly
  - _Requirements: 1.3, 2.4, 3.1_

- [ ] 13.4 Test API responses
  - Verify all API routes return JSON
  - Test authentication errors return 401 JSON
  - Test not found errors return 404 JSON
  - Verify no CLIENT_FETCH_ERROR in console
  - _Requirements: 3.1, 3.2, 3.3_

## Task 14: Performance Optimization

- [ ] 14.1 Optimize conversion speed
  - Convert pages in parallel (max 5 concurrent)
  - Use appropriate image quality settings
  - Add progress tracking
  - _Requirements: 2.2_

- [ ] 14.2 Optimize page loading
  - Implement lazy loading for pages
  - Preload next/previous pages
  - Cache signed URLs client-side
  - _Requirements: 1.1_

## Task 15: Documentation and Cleanup

- [ ] 15.1 Document conversion process
  - Add comments to conversion service
  - Document API endpoints
  - Create troubleshooting guide
  - _Requirements: All_

- [ ] 15.2 Clean up console logs
  - Remove debug console.logs
  - Keep essential error logging
  - Add structured logging
  - _Requirements: All_

## Task 16: Final Checkpoint

- [ ] 16.1 End-to-end testing
  - Upload PDF → Verify conversion → Open preview → Verify content visible
  - Test with multiple PDFs
  - Test on different browsers
  - Test on mobile devices
  - _Requirements: All_

- [ ] 16.2 Verify all success criteria
  - Content visibility ✓
  - No CLIENT_FETCH_ERROR ✓
  - Automatic conversion ✓
  - Full screen display ✓
  - Watermark control ✓
  - Fast loading ✓
  - Error recovery ✓
  - Ensure all tests pass, ask the user if questions arise.

## Implementation Priority

### Critical (Do First)
1. Task 1: Fix NextAuth API Route
2. Task 2: Fix Middleware
3. Task 7: Fix Document Pages API Route
4. Task 9: Fix PreviewViewerClient Component
5. Task 10: Fix FlipBookContainerWithDRM Component

### High Priority (Do Next)
6. Task 3: Database Migration
7. Task 4: Storage Bucket
8. Task 5: PDF Conversion Service
9. Task 6: Page Cache Service
10. Task 11: Server-Side Page Fetching

### Medium Priority (Polish)
11. Task 8: Conversion API Route
12. Task 12: Automatic Conversion on Upload
13. Task 13: Testing
14. Task 14: Performance Optimization
15. Task 15: Documentation

## Estimated Timeline

- **Critical Tasks**: 2-3 hours
- **High Priority Tasks**: 4-5 hours
- **Medium Priority Tasks**: 3-4 hours
- **Total**: 9-12 hours

## Dependencies

- NextAuth must be working (Task 1)
- Middleware must allow API routes (Task 2)
- Database schema must be updated (Task 3)
- Storage bucket must exist (Task 4)
- Conversion service must work before testing (Task 5)
