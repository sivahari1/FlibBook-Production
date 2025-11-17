# Implementation Plan - jstudyroom Platform Extension

## Overview
This implementation plan extends the FlipBook DRM application into the jstudyroom platform with Member self-registration, Book Shop, My jstudyroom, and enhanced features. Tasks build incrementally on the existing admin-managed access system.

---

- [x] 1. Database Schema Updates and Migration



  - Update Prisma schema with new models and fields
  - Create and run database migrations
  - Update seed scripts
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_



- [x] 1.1 Update Prisma schema with new models


  - Add BookShopItem model with all required fields
  - Add MyJstudyroomItem model with unique constraint
  - Add Payment model with Razorpay fields
  - Extend User model with freeDocumentCount and paidDocumentCount
  - Update UserRole enum to include MEMBER (if not already present)
  - Add indexes for performance



  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

- [x] 1.2 Create and test database migration


  - Generate Prisma migration files
  - Review migration SQL for correctness
  - Test migration on development database
  - Create rollback plan
  - _Requirements: 17.6_

- [x] 1.3 Update seed scripts



  - Update admin seed to include support@jstudyroom.dev
  - Create Book Shop seed script with sample categories
  - Test seed scripts
  - _Requirements: 10.6_

---

- [x] 2. Member Self-Registration






  - Enable registration for MEMBER role only
  - Implement email verification flow
  - Update registration UI
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_


- [x] 2.1 Update registration API endpoint


  - Modify `/api/auth/register` to create MEMBER role users
  - Set emailVerified to false on registration
  - Generate verification token
  - Send verification email via Resend
  - Prevent PLATFORM_USER registration through this endpoint
  - _Requirements: 1.1, 1.2, 1.3, 1.6, 13.1_

- [x] 2.2 Update registration page UI



  - Update `/app/(auth)/register/page.tsx` for Member registration
  - Add clear messaging about Member vs Platform User
  - Update form validation
  - Add link to Platform User request form
  - _Requirements: 1.1, 16.4_

- [x] 2.3 Implement verification flow



  - Ensure verification email is sent
  - Test verification link functionality
  - Redirect verified users to login
  - Handle expired tokens
  - _Requirements: 1.3, 1.4, 1.5_

---

- [x] 3. Role-Based Routing Enhancement





  - Update authentication callbacks
  - Implement role-based redirects
  - Add MEMBER dashboard route
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_


- [x] 3.1 Update NextAuth callbacks


  - Modify `lib/auth.ts` to handle MEMBER role
  - Update JWT callback to include role
  - Update session callback
  - Implement role-based redirect logic
  - _Requirements: 2.1, 2.2, 2.3_


- [x] 3.2 Update middleware for role protection


  - Add `/member` route protection
  - Ensure MEMBER cannot access `/admin` or `/dashboard`
  - Ensure PLATFORM_USER cannot access `/member`
  - Return 403 for unauthorized role access
  - _Requirements: 2.4, 2.5_


- [x] 3.3 Create Member dashboard route






  - Create `/app/member/page.tsx`
  - Create `/app/member/layout.tsx` with navigation
  - Verify role on page load
  - Redirect non-members appropriately
  - _Requirements: 2.3, 3.1, 3.2_

---

- [x] 4. Member Dashboard - Files Shared With Me





  - Create shared files view
  - Implement access validation
  - Display share details
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.1 Create shared files API endpoint



  - Create `/api/member/shared` GET endpoint
  - Fetch DocumentShare records for logged-in Member
  - Filter out expired shares
  - Return document details with share metadata
  - _Requirements: 4.1, 4.4_

- [x] 4.2 Create shared files UI component



  - Create `components/member/FilesSharedWithMe.tsx`
  - Display list/table of shared documents
  - Show title, sender, date, expiration, note
  - Add "View" button for each document
  - Handle empty state
  - _Requirements: 4.2_

- [x] 4.3 Implement share access validation



  - Update `/api/share/[shareKey]/access` endpoint
  - Verify user is logged in
  - Check email matches share recipient
  - Return appropriate error messages
  - _Requirements: 4.3, 4.5, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

---

- [x] 5. Book Shop - Data Models and Admin Management






  - Create Book Shop CRUD APIs
  - Build admin management interface
  - Implement category management
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_


- [x] 5.1 Create Book Shop API endpoints (Admin)


  - Create `/api/admin/bookshop` POST endpoint (create item)
  - Create `/api/admin/bookshop/[id]` PATCH endpoint (update item)
  - Create `/api/admin/bookshop/[id]` DELETE endpoint (delete item)
  - Create `/api/admin/bookshop` GET endpoint (list all items)
  - Create `/api/admin/bookshop/categories` GET endpoint
  - Verify ADMIN role on all endpoints
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_


- [x] 5.2 Create Book Shop management UI


  - Create `/app/admin/bookshop/page.tsx`
  - Create `components/admin/BookShopTable.tsx`
  - Display all Book Shop items with edit/delete actions
  - Add "Create New Item" button
  - Implement search and filter by category
  - _Requirements: 10.1_


- [x] 5.3 Create Book Shop item form


  - Create `components/admin/BookShopItemForm.tsx`
  - Add fields: document selector, title, description, category, type, price
  - Implement form validation
  - Handle create and update modes
  - Show success/error messages
  - _Requirements: 10.2, 10.3, 10.4_

---

- [x] 6. Book Shop - Member Catalog View






  - Create public/member Book Shop API
  - Build catalog browser UI
  - Implement search and filtering
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


- [x] 6.1 Create Book Shop catalog API endpoint


  - Create `/api/bookshop` GET endpoint (public/member access)
  - Return only published items
  - Include document details
  - Check if user already has item in My jstudyroom
  - Support filtering by category
  - Support search by title/description
  - _Requirements: 7.1, 7.2, 7.3, 7.4_


- [x] 6.2 Create Book Shop catalog UI


  - Create `/app/member/bookshop/page.tsx`
  - Create `components/member/BookShop.tsx`
  - Display items in grid/list view
  - Show title, description, category, type, price
  - Add category filter dropdown
  - Add search input
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6.3 Create Book Shop item card



  - Create `components/member/BookShopItemCard.tsx`
  - Display item details
  - Show "Free" or "Paid (₹xxx)" badge
  - Add "Add to My jstudyroom" button
  - Disable button if already in My jstudyroom
  - Handle click events for free vs paid
  - _Requirements: 7.2, 7.5_

---

- [x] 7. My jstudyroom - Core Functionality






  - Implement document limit logic
  - Create My jstudyroom APIs
  - Build My jstudyroom UI
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 7.1 Create My jstudyroom utility functions


  - Create `lib/my-jstudyroom.ts`
  - Implement `canAddDocument()` function with limit checks
  - Implement `addDocumentToMyJstudyroom()` function
  - Implement `removeDocumentFromMyJstudyroom()` function
  - Include transaction handling for count updates
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.5_


- [x] 7.2 Create My jstudyroom API endpoints


  - Create `/api/member/my-jstudyroom` GET endpoint (list items)
  - Create `/api/member/my-jstudyroom` POST endpoint (add item)
  - Create `/api/member/my-jstudyroom/[id]` DELETE endpoint (return item)
  - Verify MEMBER role
  - Enforce document limits
  - Return appropriate error messages
  - _Requirements: 6.1, 6.4, 6.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 7.3 Create My jstudyroom UI component



  - Create `/app/member/my-jstudyroom/page.tsx`
  - Create `components/member/MyJstudyroom.tsx`
  - Display list/table of documents
  - Show title, category, type, date added
  - Add "View" and "Return" buttons
  - Show document count indicators (X/5 free, Y/5 paid, Z/10 total)
  - Handle empty state
  - _Requirements: 6.1, 6.2, 6.3, 6.4_


- [x] 7.4 Implement add to My jstudyroom (free documents)


  - Handle "Add to My jstudyroom" click for free documents
  - Call API to add document
  - Check limits before adding
  - Update UI on success
  - Show error messages on failure
  - Disable button after adding
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

---

- [x] 8. Payment Integration






  - Integrate Razorpay
  - Implement payment flow
  - Handle payment verification

  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

- [x] 8.1 Create payment API endpoints


  - Create `/api/payment/create-order` POST endpoint
  - Create `/api/payment/verify` POST endpoint
  - Integrate with Razorpay SDK
  - Create Payment record on order creation
  - Verify payment signature on completion
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_


- [x] 8.2 Create payment modal component


  - Create `components/member/PaymentModal.tsx`
  - Display document details and price
  - Integrate Razorpay checkout
  - Handle payment success/failure
  - Show loading states
  - _Requirements: 9.1, 9.2_


- [x] 8.3 Implement payment verification and document addition


  - Verify Razorpay signature server-side
  - Check document limits before adding
  - Add document to My jstudyroom on success
  - Update Payment record status
  - Increment paid document count
  - Send confirmation email
  - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_


- [x] 8.4 Create purchase confirmation email


  - Create email template for purchase confirmation
  - Include document details and access link
  - Send via Resend
  - _Requirements: 9.5, 13.2_

---

- [x] 9. Enhanced Share Link Access Control






  - Update share link validation
  - Implement email-based access control
  - Handle login redirects
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_


- [x] 9.1 Update share link creation


  - Ensure `restrictToEmail` field is set when sharing to specific email
  - Update share creation APIs
  - _Requirements: 12.1_


- [x] 9.2 Implement share access validation


  - Update `/app/view/[shareKey]/page.tsx`
  - Check if user is logged in
  - Redirect to login with return URL if not logged in
  - Verify email matches restrictToEmail if set
  - Show "Access Denied" for email mismatch
  - Allow access if no email restriction
  - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_


- [x] 9.3 Update share notification emails


  - Include login instructions in share emails
  - Explain access requirements
  - _Requirements: 13.4_

---

- [x] 10. Password Reset Flow Fix






  - Fix post-reset redirect
  - Ensure verified status maintained
  - Remove unnecessary verification steps
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_


- [x] 10.1 Update password reset API


  - Modify `/api/auth/reset-password` route
  - Maintain emailVerified status after reset
  - Do not set emailVerified to false
  - _Requirements: 14.3, 14.5_


- [x] 10.2 Update password reset page


  - Modify `/app/(auth)/reset-password/page.tsx`
  - Redirect to login with success message after reset
  - Do not redirect to verification page
  - Show clear success message
  - _Requirements: 14.4, 14.5_


- [x] 10.3 Test password reset flow


  - Test with verified user
  - Test with unverified user
  - Verify correct redirects
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

---

- [x] 11. Theme Implementation Fix






  - Fix ThemeProvider setup
  - Ensure dark mode works correctly
  - Update all components for theme support
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [x] 11.1 Fix ThemeProvider in root layout



  - Ensure `components/theme/ThemeProvider.tsx` wraps entire app
  - Verify next-themes is properly configured
  - Set default theme (system or light)
  - _Requirements: 15.3, 15.4_

- [x] 11.2 Update ThemeToggle component



  - Ensure toggle button is visible in header
  - Use sun/moon icons
  - Test theme switching
  - Verify localStorage persistence
  - _Requirements: 15.1, 15.2, 15.3_

- [x] 11.3 Audit and fix dark mode styles



  - Review all components for dark: classes
  - Ensure backgrounds change (bg-white dark:bg-gray-900)
  - Ensure text changes (text-gray-900 dark:text-white)
  - Ensure cards and borders change
  - Test navigation and sidebar
  - _Requirements: 15.5, 15.6_

---

- [x] 12. Landing Page Updates






  - Update landing page content
  - Add Member CTA
  - Clarify Platform User vs Member
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_


- [x] 12.1 Update landing page content


  - Modify `/app/page.tsx`
  - Update hero section with jstudyroom branding
  - Explain platform features
  - Differentiate Platform User and Member roles
  - _Requirements: 16.1, 16.6_


- [x] 12.2 Add Member registration CTA


  - Create `components/landing/MemberCTA.tsx`
  - Add prominent "Become a Member" section
  - Link to registration page
  - Explain Member benefits
  - _Requirements: 16.2, 16.4_

- [x] 12.3 Update Platform User request section



  - Keep existing AccessRequestForm
  - Update messaging to clarify it's for Platform Users
  - Add explanation of approval process
  - _Requirements: 16.3_

---

- [x] 13. Admin Enhancements





  - Add Book Shop management to admin dashboard
  - Add Member management view
  - Add payment tracking
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 13.1 Add Book Shop to admin navigation


  - Update `/app/admin/layout.tsx`
  - Add "Book Shop" navigation link
  - _Requirements: 10.1_

- [x] 13.2 Create Member management page



  - Create `/app/admin/members/page.tsx`
  - Create `components/admin/MembersTable.tsx`
  - Display all MEMBER role users
  - Show email, name, registration date, verification status, document counts
  - Add view details action
  - _Requirements: 11.1, 11.2_

- [x] 13.3 Create Member details view



  - Create `components/admin/MemberDetails.tsx`
  - Show Member information
  - Display My jstudyroom contents
  - Display purchase history
  - Add deactivate/activate action
  - Add password reset action
  - _Requirements: 11.3, 11.4, 11.5_

- [x] 13.4 Create payments view



  - Create `/app/admin/payments/page.tsx`
  - Display all payments with status
  - Show user, document, amount, date
  - Add filtering by status
  - _Requirements: 19.7_

---

- [x] 14. Email Templates






  - Create new email templates
  - Update existing templates
  - Test all email flows
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [x] 14.1 Create purchase confirmation email template



  - Create template in `lib/email.ts` or separate file
  - Include document title, category, price
  - Include link to My jstudyroom
  - Include access instructions
  - _Requirements: 13.2_

- [x] 14.2 Update share notification email



  - Update existing share email template
  - Add login instructions for Members
  - Explain access requirements
  - _Requirements: 13.4_

- [x] 14.3 Test all email flows



  - Test Member verification email
  - Test purchase confirmation email
  - Test share notification email
  - Test password reset email
  - Test Platform User approval email
  - Verify all use support@jstudyroom.dev
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

---

- [x] 15. Security and Validation






  - Implement input validation
  - Add rate limiting
  - Audit role-based access
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8_


- [x] 15.1 Implement input validation


  - Add validation schemas for all forms
  - Validate on client and server
  - Sanitize user inputs
  - _Requirements: 18.1, 18.2_


- [x] 15.2 Add rate limiting


  - Add rate limiting to registration endpoint
  - Add rate limiting to payment endpoints
  - Use existing rate-limit.ts infrastructure
  - _Requirements: 18.5_

- [x] 15.3 Audit role-based access control



  - Review all API endpoints for role checks
  - Ensure MEMBER can only access member endpoints
  - Ensure PLATFORM_USER cannot access member endpoints
  - Ensure ADMIN has appropriate access
  - _Requirements: 18.4_

---

- [x] 16. Testing and Quality Assurance






  - Write unit tests
  - Write integration tests
  - Perform end-to-end testing

  - _Requirements: All_

- [x] 16.1 Write unit tests for business logic



  - Test canAddDocument() function
  - Test validateShareAccess() function
  - Test payment verification logic
  - Test document limit calculations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 16.2 Write integration tests for APIs






  - Test Book Shop CRUD endpoints
  - Test My jstudyroom endpoints
  - Test payment endpoints
  - Test share access validation
  - _Requirements: All API requirements_

- [x] 16.3 Perform end-to-end testing






  - Test Member registration and verification
  - Test adding free documents to My jstudyroom
  - Test purchasing paid documents
  - Test returning documents
  - Test share access with email restrictions
  - Test role-based routing
  - Test dark mode toggle
  - _Requirements: All_

---

- [x] 17. Documentation and Deployment






  - Update README
  - Create user guides
  - Prepare deployment
  - Deploy to production

  - _Requirements: All_

- [x] 17.1 Update documentation


  - Update README with jstudyroom features
  - Document new user roles
  - Document Book Shop and My jstudyroom
  - Update API documentation
  - _Requirements: All_


- [x] 17.2 Create user guides


  - Create Member user guide
  - Update Admin user guide with Book Shop management
  - Create troubleshooting guide updates
  - _Requirements: All_


- [x] 17.3 Prepare deployment


  - Review environment variables
  - Test database migrations
  - Create deployment checklist
  - Plan rollback strategy
  - _Requirements: All_


- [x] 17.4 Deploy to production


  - Run database migrations
  - Deploy application to Vercel
  - Verify all features work
  - Monitor for errors
  - Test payment flow in production
  - _Requirements: All_

