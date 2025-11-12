# Implementation Plan

- [x] 1. Set up core infrastructure and utilities





  - Create Prisma client singleton in lib/db.ts
  - Create Supabase storage utilities in lib/storage.ts for file upload, download, and signed URL generation
  - Create validation utilities in lib/validation.ts for file type, size, and email validation
  - Create general utilities in lib/utils.ts for shareKey generation and formatting
  - _Requirements: 1.1, 2.1, 9.2, 9.3_

- [x] 2. Implement authentication system





  - Configure NextAuth in lib/auth.ts with Credentials provider and Prisma adapter
  - Create API route at app/api/auth/[...nextauth]/route.ts
  - Implement password hashing and verification with bcryptjs
  - Configure session strategy with JWT and user data callbacks
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.1_

- [x] 3. Build authentication UI components and pages





  - Create reusable UI components (Button, Input, Card, Modal) in components/ui/
  - Create RegisterForm component with email/password validation
  - Create LoginForm component with error handling
  - Create registration page at app/(auth)/register/page.tsx
  - Create login page at app/(auth)/login/page.tsx
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 4. Implement document upload API and storage





  - Create POST /api/documents route for file upload
  - Implement file validation (PDF type, 50MB max size)
  - Implement subscription tier limit checking (storage and document count)
  - Upload file to Supabase Storage with user-specific path
  - Create Document record in database with metadata
  - Update User storageUsed field
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.2_

- [x] 5. Implement document management API endpoints





  - Create GET /api/documents route to list user's documents
  - Create GET /api/documents/[id] route for single document details
  - Create DELETE /api/documents/[id] route with storage cleanup
  - Implement ownership verification for all document operations
  - _Requirements: 3.1, 3.2, 3.3, 9.4_

- [x] 6. Build dashboard UI for document management





  - Create dashboard layout at app/dashboard/layout.tsx with navigation
  - Create main dashboard page at app/dashboard/page.tsx
  - Create DocumentList component to display user documents
  - Create DocumentCard component with document metadata and action buttons
  - Create UploadButton and UploadModal components for file upload
  - Display storage usage and subscription tier limits
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7. Implement share link generation API





  - Create POST /api/documents/[id]/share route
  - Generate cryptographically secure shareKey (32 bytes, base64url)
  - Store ShareLink with optional expiresAt, password hash, and maxViews
  - Return share URL with shareKey
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Build share link management UI





  - Create ShareLinkModal component for creating share links
  - Add form fields for expiration date, password, and max views
  - Display existing share links for a document
  - Add deactivate button for share links
  - Copy share URL to clipboard functionality
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. Implement share link validation and viewer access API





  - Create GET /api/share/[shareKey] route to validate share link
  - Check isActive, expiresAt, and maxViews constraints
  - Verify password if required
  - Return document metadata and signed storage URL
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 5.5_

- [x] 10. Build PDF viewer with DRM protection





  - Create PDFViewer component using pdfjs-dist library
  - Implement page-by-page rendering with PDFPage component
  - Create DRMProtection component to disable right-click and text selection
  - Block keyboard shortcuts (Ctrl+C, Ctrl+P, Ctrl+S, F12)
  - Create DevToolsDetector component with warning display
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Implement dynamic watermarking





  - Create Watermark component with SVG overlay
  - Prompt for viewer email before displaying PDF
  - Apply watermark with viewer email and timestamp to each page
  - Style watermark with diagonal rotation and semi-transparency
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 12. Create public viewer page





  - Create viewer page at app/view/[shareKey]/page.tsx
  - Implement share link validation flow
  - Show password prompt if required
  - Show email prompt for watermark
  - Render PDFViewer with DRM protection and watermark
  - _Requirements: 5.1, 6.1_

- [x] 13. Implement view analytics tracking API





  - Create POST /api/share/[shareKey]/view route
  - Extract IP address and user agent from request headers
  - Create ViewAnalytics record with viewer details
  - Increment ShareLink viewCount
  - Optionally integrate IP geolocation for country/city data
  - _Requirements: 7.1, 7.2, 7.5_

- [x] 14. Implement analytics retrieval API





  - Create GET /api/analytics/[documentId] route
  - Return all ViewAnalytics records for the document
  - Calculate total views and unique viewers
  - Aggregate views by date for timeline chart
  - Verify document ownership before returning data
  - _Requirements: 7.3, 7.4, 9.4_

- [x] 15. Build analytics dashboard UI









  - Create document analytics page at app/dashboard/documents/[id]/page.tsx
  - Display total views and unique viewer count
  - Create AnalyticsChart component for view timeline visualization
  - Display viewer table with email, timestamp, location, and IP
  - _Requirements: 7.3, 7.4_




- [x] 16. Implement subscription management API





  - Create lib/razorpay.ts with Razorpay client and signature verification
  - Create POST /api/subscription/create-order route for Razorpay order creation



  - Create POST /api/subscription/verify-payment route with signature verification
  - Create Subscription record and update User subscription field on successful payment
  - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [x] 17. Build subscription management UI



  - Create subscription page at app/dashboard/subscription/page.tsx
  - Create PlanCard component displaying plan details and pricing
  - Create RazorpayButton component to trigger payment flow
  - Integrate Razorpay checkout modal
  - Display current subscription status and expiration date
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 18. Implement subscription tier enforcement





  - Add middleware to check subscription limits on document upload
  - Enforce Free tier limits (100MB storage, 5 documents)
  - Enforce Pro tier limits (10GB storage, unlimited documents)
  - Enforce Enterprise tier limits (unlimited storage and documents)
  - Display appropriate error messages when limits are exceeded
  - _Requirements: 2.4, 2.5, 8.6, 8.7_

- [x] 19. Create landing page and navigation





  - Design landing page at app/page.tsx with feature highlights
  - Add navigation links to login, register, and dashboard
  - Update root layout with metadata and global styles
  - Add logout functionality to dashboard navigation
  - _Requirements: 1.3, 1.4_

- [x] 20. Implement production security and deployment configuration





  - Add input sanitization to all API routes
  - Configure CORS policies in next.config.ts
  - Set secure cookie options for production
  - Add error logging and monitoring setup
  - Create deployment documentation with environment variable checklist
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_
