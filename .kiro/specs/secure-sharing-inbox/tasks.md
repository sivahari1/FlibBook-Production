# Implementation Plan: Secure Sharing & Inbox System

## Overview

This implementation plan breaks down the Secure Sharing & Inbox feature into discrete, manageable tasks. Each task builds incrementally on previous work and includes specific requirements references.

---

## Phase 1: Database Schema & Infrastructure

### Task 1.1: Update Prisma Schema

- Update `prisma/schema.prisma` to add DocumentShare model
- Add restrictToEmail and canDownload fields to ShareLink model
- Update User model relations for email shares
- Update Document model relations
- _Requirements: 1.1, 2.1, 3.1, 3.2_

### Task 1.2: Create and Run Database Migration

- Run `npx prisma migrate dev --name sharing-and-inbox` locally
- Verify migration creates tables and indexes correctly
- Test rollback procedure
- Update `.env.example` with any new environment variables
- _Requirements: 1.1, 2.1, 10.6_

### Task 1.3: Install Required Dependencies

- Install `nanoid` package for secure share key generation
- Install `zod` for input validation (if not already installed)
- Verify `bcryptjs` is installed for password hashing
- Update `package.json` and `package-lock.json`
- _Requirements: 1.1, 8.8_

---

## Phase 2: Shared Utilities & Types

### Task 2.1: Create TypeScript Types

- Create `lib/types/sharing.ts` with interfaces:
  - `LinkShareCreate`
  - `EmailShareCreate`
  - `ShareAccess`
  - `InboxItem`
- Export all types for use across the application
- _Requirements: All_

### Task 2.2: Create Validation Schemas

- Create `lib/validation/sharing.ts` with Zod schemas:
  - `createLinkShareSchema`
  - `createEmailShareSchema`
  - `verifyPasswordSchema`
  - `trackViewSchema`
- Export schemas for API route validation
- _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

### Task 2.3: Create Share Utility Functions

- Create `lib/sharing.ts` with functions:
  - `generateShareKey()` - uses nanoid(24)
  - `hashPassword(password: string)` - bcrypt with 12 rounds
  - `verifyPassword(password: string, hash: string)`
  - `isShareExpired(expiresAt: Date | null)`
  - `canAccessShare(share, user)` - validates all access rules
- Add comprehensive JSDoc comments
- _Requirements: 1.1, 1.2, 4.3, 4.4, 4.5, 5.1, 5.2, 8.8, 8.9_

### Task 2.4: Extend Data Access Layer

- Update `lib/documents.ts` with new functions:
  - `getShareLinkByKey(shareKey: string)`
  - `getEmailSharesForUser(userId: string, email: string)`
  - `getSharesForDocument(documentId: string)`
  - `incrementShareViewCount(shareId: string)`
- Maintain consistent error handling patterns
- _Requirements: 3.1, 3.2, 4.8, 10.5_

---

## Phase 3: API Routes - Share Creation

### Task 3.1: Create POST /api/share/link

- Create `app/api/share/link/route.ts`
- Add route segment config (dynamic, nodejs runtime)
- Implement POST handler with:
  - Session authentication check
  - Input validation with Zod
  - Document ownership verification
  - Share key generation
  - Password hashing if provided
  - Database record creation
  - URL generation and response
- Add comprehensive error handling
- _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 8.1, 8.2, 8.9_

### Task 3.2: Create POST /api/share/email

- Create `app/api/share/email/route.ts`
- Add route segment config (dynamic, nodejs runtime)
- Implement POST handler with:
  - Session authentication check
  - Input validation with Zod
  - Document ownership verification
  - User lookup by email
  - DocumentShare creation with correct user ID or email
  - Email notification stub (console.log for now)
  - Success response
- Add comprehensive error handling
- _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 8.1, 8.2, 8.4_

---

## Phase 4: API Routes - Share Access

### Task 4.1: Create GET /api/inbox

- Create `app/api/inbox/route.ts`
- Add route segment config (dynamic, nodejs runtime)
- Implement GET handler with:
  - Session authentication check
  - Query for DocumentShares where sharedWithUserId OR sharedWithEmail matches
  - Include document and sharedBy user details
  - Sort by createdAt DESC
  - Return formatted response
- Add pagination support (limit 50, offset parameter)
- _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 10.7_

### Task 4.2: Update GET /api/share/[shareKey]

- Update existing `app/api/share/[shareKey]/route.ts`
- Add session requirement check
- Add validation for:
  - Share isActive status
  - Expiration date
  - restrictToEmail if set
  - Password cookie if password is set
  - maxViews limit
- Add atomic view count increment
- Generate signed URL with 5-minute TTL
- Return document metadata and signed URL
- _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 4.9, 4.10, 10.4_

### Task 4.3: Create POST /api/share/[shareKey]/verify-password

- Create `app/api/share/[shareKey]/verify-password/route.ts`
- Add route segment config (dynamic, nodejs runtime)
- Implement POST handler with:
  - Input validation with Zod
  - Share lookup
  - Password comparison with bcrypt
  - Cookie setting on success
  - Error response on failure
- Use Next.js cookies() API
- _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.9_

### Task 4.4: Create POST /api/share/[shareKey]/track

- Create `app/api/share/[shareKey]/track/route.ts`
- Add route segment config (dynamic, nodejs runtime)
- Implement POST handler with:
  - Session authentication check
  - Extract IP from headers (X-Forwarded-For, X-Real-IP)
  - Extract User-Agent from headers
  - Optional geolocation lookup (stub for now)
  - Create ViewAnalytics record
  - Return success response
- Handle errors gracefully without blocking
- _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

---

## Phase 5: UI Components - Share Dialog

### Task 5.1: Create Share Dialog Component

- Create `components/dashboard/ShareDialog.tsx`
- Implement modal with:
  - Two tabs: "Link Share" and "Email Share"
  - Tab switching state management
  - Close button and backdrop click handling
  - Dark mode support
  - Responsive design
- Use existing Modal component as base
- _Requirements: 1.1-1.7, 2.1-2.7_

### Task 5.2: Create Link Share Form

- Create `components/dashboard/LinkShareForm.tsx`
- Implement form with fields:
  - Expiration date/time picker
  - Max views number input
  - Password input with show/hide toggle
  - Restrict to email input
  - Can download checkbox
- Add form validation
- Add submit handler calling POST /api/share/link
- Show generated URL with copy-to-clipboard button
- Show loading and error states
- _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

### Task 5.3: Create Email Share Form

- Create `components/dashboard/EmailShareForm.tsx`
- Implement form with fields:
  - Email address input with validation
  - Expiration date/time picker
  - Can download checkbox
  - Optional note textarea (max 500 chars)
- Add form validation
- Add submit handler calling POST /api/share/email
- Show success message
- Show loading and error states
- _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

### Task 5.4: Add Share Button to Document Card

- Update `components/dashboard/DocumentCard.tsx`
- Add "Share" button with icon
- Add state for ShareDialog open/close
- Pass document ID and title to ShareDialog
- Style button consistently with existing UI
- _Requirements: 1.1, 2.1_

---

## Phase 6: UI Components - Inbox

### Task 6.1: Create Inbox Page

- Create `app/inbox/page.tsx` as server component
- Add route segment config (dynamic, revalidate 0)
- Fetch data from GET /api/inbox
- Pass data to client component
- Handle empty state
- Add page title and description
- _Requirements: 3.1, 3.2, 3.8, 3.9_

### Task 6.2: Create Inbox Client Component

- Create `app/inbox/InboxClient.tsx`
- Implement responsive table/card layout
- Display columns:
  - Document title (link to viewer)
  - Shared by (name and email)
  - Received on (formatted date)
  - Expires (formatted date or "Never")
  - Download allowed (Yes/No badge)
- Add sorting functionality
- Add empty state with illustration
- Add dark mode support
- _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

### Task 6.3: Add Inbox Link to Navigation

- Update `app/dashboard/layout.tsx`
- Add "Inbox" navigation link
- Add inbox icon
- Highlight active route
- Make responsive for mobile
- _Requirements: 3.1_

---

## Phase 7: UI Components - Share Viewer

### Task 7.1: Create Password Verification Modal

- Create `components/share/PasswordModal.tsx`
- Implement modal with:
  - Password input field
  - Show/hide password toggle
  - Submit button
  - Cancel button
  - Loading state
  - Error message display
- Call POST /api/share/[shareKey]/verify-password
- Handle success and error responses
- _Requirements: 4.6, 5.1, 5.2, 5.3, 5.4, 5.5_

### Task 7.2: Update Share Viewer Page

- Update `app/view/[shareKey]/page.tsx`
- Add session requirement with redirect
- Fetch share data from GET /api/share/[shareKey]
- Handle password requirement
- Pass data to client component
- Handle all error states
- _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

### Task 7.3: Update Share Viewer Client Component

- Update `app/view/[shareKey]/ViewerClient.tsx`
- Add password modal state management
- Integrate PasswordModal component
- Add analytics tracking on mount
- Call POST /api/share/[shareKey]/track
- Conditionally show/hide download button based on canDownload
- Add error boundary
- _Requirements: 4.10, 6.1, 6.2, 6.3, 6.7_

---

## Phase 8: Share Management

### Task 8.1: Create Share Management Section

- Create `components/dashboard/ShareManagement.tsx`
- Display active link shares for document
- Display email shares for document
- Show share details (created, expires, views, etc.)
- Add "Revoke" button for each share
- Add confirmation dialog for revoke action
- _Requirements: 7.1, 7.2_

### Task 8.2: Create Revoke Share API Endpoints

- Create `app/api/share/link/[id]/revoke/route.ts`
- Implement PATCH handler to set isActive = false
- Add ownership verification
- Create `app/api/share/email/[id]/revoke/route.ts`
- Implement DELETE handler to remove DocumentShare
- Add ownership verification
- _Requirements: 7.3, 7.4, 7.5, 7.6_

### Task 8.3: Integrate Share Management into Document Details

- Update `app/dashboard/documents/[id]/page.tsx`
- Add ShareManagement component
- Fetch shares data
- Handle revoke actions
- Show success/error feedback
- _Requirements: 7.1, 7.2, 7.3, 7.4_

---

## Phase 9: Testing & Quality Assurance

### Task 9.1: Write Unit Tests for Utilities

- Create `lib/__tests__/sharing.test.ts`
- Test share key generation uniqueness
- Test password hashing and verification
- Test expiration checking
- Test access validation logic
- Achieve 90%+ code coverage
- _Requirements: 8.8, 8.9_

### Task 9.2: Write API Route Tests

- Create `app/api/share/__tests__/link.test.ts`
- Test successful link creation
- Test validation errors
- Test authorization failures
- Create `app/api/share/__tests__/email.test.ts`
- Test successful email share creation
- Test user lookup logic
- Create `app/api/__tests__/inbox.test.ts`
- Test inbox data retrieval
- Test filtering logic
- _Requirements: All API requirements_

### Task 9.3: Write E2E Tests

- Create `e2e/sharing.spec.ts`
- Test complete link share flow
- Test complete email share flow
- Test password-protected share
- Test expired share rejection
- Test email restriction enforcement
- Test inbox functionality
- _Requirements: All requirements_

### Task 9.4: Security Audit

- Review all API routes for authorization checks
- Verify input sanitization
- Check for SQL injection vulnerabilities
- Verify password handling (no plaintext logging)
- Test rate limiting
- Review error messages for information leakage
- _Requirements: 8.1-8.10_

---

## Phase 10: Documentation & Deployment

### Task 10.1: Update README

- Add "Sharing & Inbox" section to README.md
- Document link sharing features
- Document email sharing features
- Document inbox functionality
- Add screenshots/GIFs
- Document environment variables
- _Requirements: All_

### Task 10.2: Create Migration Guide

- Create `MIGRATION_SHARING.md`
- Document database migration steps
- Document environment variable updates
- Document testing procedures
- Document rollback procedures
- _Requirements: All_

### Task 10.3: Update Environment Variables in Vercel

- Verify all required environment variables are set
- Add any new variables needed
- Test in preview environment
- Deploy to production
- _Requirements: All_

### Task 10.4: Performance Testing

- Load test share creation endpoints
- Load test inbox endpoint
- Load test share access endpoint
- Verify database query performance
- Optimize slow queries
- Add database indexes if needed
- _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

### Task 10.5: Monitoring Setup

- Add logging for share operations
- Set up error tracking for new routes
- Create dashboard for share metrics
- Set up alerts for high error rates
- Monitor signed URL generation time
- _Requirements: All_

---

## Optional Enhancements (Nice-to-Have)

### Task 11.1: Email Notifications

- Integrate Resend or similar email service
- Create email templates for share invitations
- Send email when document is shared
- Add unsubscribe functionality
- _Requirements: 2.7_

### Task 11.2: Rate Limiting

- Implement rate limiting middleware
- Limit share creation to 30 per minute per user
- Add rate limit headers to responses
- Show rate limit errors to users
- _Requirements: 8.1_

### Task 11.3: Share Analytics Dashboard

- Create analytics page for shares
- Show share creation trends
- Show most shared documents
- Show share access patterns
- Add charts and visualizations
- _Requirements: 6.1-6.7_

### Task 11.4: Bulk Email Sharing

- Add multi-email input to email share form
- Validate all emails
- Create shares in batch
- Show progress indicator
- Handle partial failures
- _Requirements: 2.1-2.7_

---

## Summary

**Total Tasks**: 40 core tasks + 4 optional enhancements

**Estimated Timeline**:
- Phase 1-2: 1-2 days (Database & Infrastructure)
- Phase 3-4: 2-3 days (API Routes)
- Phase 5-7: 3-4 days (UI Components)
- Phase 8: 1-2 days (Share Management)
- Phase 9: 2-3 days (Testing)
- Phase 10: 1-2 days (Documentation & Deployment)

**Total Estimated Time**: 10-16 days for complete implementation

**Dependencies**:
- Phases must be completed in order
- Testing can be done in parallel with development
- Documentation can be written incrementally

**Success Criteria**:
- All acceptance criteria met
- 90%+ test coverage
- No security vulnerabilities
- Performance targets achieved
- Documentation complete
