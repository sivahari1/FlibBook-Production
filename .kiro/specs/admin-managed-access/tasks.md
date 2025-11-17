# Implementation Plan

## Overview
This implementation plan transforms the FlipBook DRM application into an admin-managed access control system with role-based permissions.

---

- [ ] 1. Database Schema and Migration



  - Update Prisma schema with UserRole enum and extended User model
  - Create AccessRequest model
  - Generate and run database migration
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 1.1 Update Prisma schema


  - Add UserRole enum (ADMIN, PLATFORM_USER, READER_USER)
  - Extend User model with role, pricePlan, notes, isActive fields
  - Create AccessRequest model with all required fields
  - Add appropriate indexes for performance
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 1.2 Create and run migration


  - Generate Prisma migration files
  - Review migration SQL
  - Run migration against database
  - Verify schema changes
  - _Requirements: 14.5, 14.6_

- [x] 1.3 Create admin seed script


  - Create prisma/seed-admin.ts script
  - Read ADMIN_SEED_PASSWORD from environment
  - Create admin user (sivaramj83@gmail.com) with ADMIN role
  - Hash password with bcrypt
  - Skip if admin already exists
  - _Requirements: 1.5, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [x] 1.4 Update existing users to PLATFORM_USER role


  - Create migration script to set role for existing users
  - Set all existing users (except admin) to PLATFORM_USER
  - Verify no users have null role
  - _Requirements: 1.4, 14.6_

---

- [x] 2. Authentication and Authorization


  - Update NextAuth configuration for role-based auth
  - Add role to JWT and session
  - Implement role-based redirect logic
  - Create middleware for admin route protection
  - _Requirements: 1.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 2.1 Update NextAuth configuration


  - Modify lib/auth.ts to include role in JWT
  - Add role to session callback
  - Update session type definition
  - Verify password hashing with bcrypt
  - _Requirements: 1.3, 8.3, 8.8_

- [x] 2.2 Implement role-based redirect


  - Update login success handler
  - Redirect ADMIN to /admin
  - Redirect PLATFORM_USER to /dashboard
  - Redirect READER_USER to /inbox
  - _Requirements: 8.4, 8.5, 8.6_

- [x] 2.3 Create admin middleware


  - Create middleware to check ADMIN role
  - Apply to /admin routes
  - Return 403 for non-admin users
  - Log unauthorized access attempts
  - _Requirements: 4.2, 4.3, 4.5, 13.1, 13.2_

- [x] 2.4 Update login page


  - Remove registration link
  - Update UI messaging
  - Add "Request Access" link to landing page
  - Test authentication flow
  - _Requirements: 8.1, 8.2, 8.7_

---

- [x] 3. Email Infrastructure



  - Create email helper functions for Resend
  - Implement access request notification email
  - Implement user approval email
  - Implement password reset email
  - Create HTML email templates
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.6, 7.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 3.1 Create email utility functions


  - Add sendAccessRequestNotification() to lib/email.ts
  - Add sendUserApprovalEmail() to lib/email.ts
  - Add sendPasswordResetByAdmin() to lib/email.ts
  - Use support@jstudyroom.dev as FROM address
  - Handle email failures gracefully
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.7_

- [x] 3.2 Create access request notification email template

  - Create emails/AccessRequestNotification.tsx
  - Include all request details
  - Add link to admin dashboard
  - Use responsive HTML layout
  - Match application branding
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 12.5, 12.6_

- [x] 3.3 Create user approval email template

  - Create emails/UserApprovalEmail.tsx
  - Include welcome message and login credentials
  - Add role description and pricing details
  - Include password change reminder
  - Add support contact information
  - _Requirements: 6.6, 12.5, 12.6_

- [x] 3.4 Create password reset email template

  - Create emails/PasswordResetByAdmin.tsx
  - Include new password and login URL
  - Add security reminder
  - Include support contact
  - _Requirements: 7.6, 12.5, 12.6_

---

- [x] 4. Landing Page and Access Request



  - Create new landing page with value proposition
  - Implement access request form
  - Create access request API endpoint
  - Add rate limiting
  - Send email notifications
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_


- [x] 4.1 Create landing page components

  - Create components/landing/LandingHero.tsx
  - Create components/landing/FeaturesSection.tsx
  - Create components/landing/AccessRequestForm.tsx
  - Update app/page.tsx to use new components
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_


- [x] 4.2 Implement access request form
  - Add form fields (email, name, purpose, etc.)
  - Implement client-side validation
  - Add loading and success states
  - Handle submission errors
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 11.7_



- [x] 4.3 Create access request API endpoint

  - Create app/api/access-request/route.ts
  - Validate request body
  - Create AccessRequest record in database
  - Send email notifications to admin
  - Return success response
  - _Requirements: 2.4, 2.5, 2.6, 2.7, 3.1_


- [x] 4.4 Add rate limiting
  - Implement IP-based rate limiting (5 per hour)
  - Store rate limit data (in-memory or Redis)
  - Return 429 when limit exceeded
  - Log rate limit violations
  - _Requirements: 2.8, 13.6_

---

- [x] 5. Admin Dashboard - Access Requests





  - Create admin layout and navigation
  - Implement access requests list page
  - Create access request detail view
  - Add approve/reject/close actions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_


- [x] 5.1 Create admin layout

  - Create app/admin/layout.tsx
  - Add admin navigation sidebar
  - Add admin header with badge
  - Verify ADMIN role on access
  - _Requirements: 4.1, 4.2, 4.3, 4.4_


- [x] 5.2 Create access requests API endpoints

  - Create app/api/admin/access-requests/route.ts (GET)
  - Create app/api/admin/access-requests/[id]/route.ts (GET, PATCH)
  - Verify ADMIN role on all endpoints
  - Implement pagination and filtering
  - _Requirements: 4.5, 5.1, 5.2, 13.1, 13.2_

- [x] 5.3 Create access requests list page


  - Create app/admin/access-requests/page.tsx
  - Create components/admin/AccessRequestsTable.tsx
  - Add status filters (PENDING, APPROVED, etc.)
  - Implement pagination
  - Add row actions (view, approve, reject)
  - _Requirements: 5.1, 5.2, 5.3, 5.4_


- [x] 5.4 Create access request detail view

  - Create components/admin/AccessRequestDetail.tsx
  - Display all request information
  - Add admin notes field
  - Add action buttons (approve, reject, close)
  - _Requirements: 5.4, 5.5_

---

- [x] 6. Admin Dashboard - User Creation





  - Create user creation modal/form
  - Implement user creation API endpoint
  - Generate secure passwords
  - Send approval email to user
  - Update access request status
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_


- [x] 6.1 Create user creation modal


  - Create components/admin/UserCreationModal.tsx
  - Pre-fill from access request data
  - Add role selector (PLATFORM_USER, READER_USER)
  - Add password generator with copy button
  - Add price plan and notes fields
  - _Requirements: 6.1, 6.2, 6.7_

- [x] 6.2 Implement password generation utility


  - Create lib/password-generator.ts
  - Generate secure random passwords (16 chars)
  - Include uppercase, lowercase, numbers, symbols
  - Ensure cryptographically secure
  - _Requirements: 6.7_


- [x] 6.3 Create user creation API endpoint

  - Create app/api/admin/users/create/route.ts
  - Verify ADMIN role
  - Validate request body
  - Check for duplicate email
  - Hash password with bcrypt
  - Create User record
  - Update AccessRequest status to APPROVED
  - Send approval email
  - Return user data and plain password
  - _Requirements: 6.3, 6.4, 6.5, 6.6, 13.1, 13.2, 13.4_

---

- [x] 7. Admin Dashboard - User Management





  - Create users list page
  - Implement user edit functionality
  - Add password reset feature
  - Add user deactivation
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_


- [x] 7.1 Create users management API endpoints

  - Create app/api/admin/users/route.ts (GET)
  - Create app/api/admin/users/[id]/route.ts (PATCH)
  - Create app/api/admin/users/[id]/reset-password/route.ts (POST)
  - Verify ADMIN role on all endpoints
  - Implement pagination and filtering
  - _Requirements: 4.5, 7.1, 7.2, 13.1, 13.2_


- [x] 7.2 Create users list page

  - Create app/admin/users/page.tsx
  - Create components/admin/UsersTable.tsx
  - Display email, role, price plan, created date
  - Add role filter
  - Add search by email
  - Add row actions (edit, reset password, deactivate)
  - _Requirements: 7.1, 7.2, 7.3_


- [x] 7.3 Create user edit modal


  - Create components/admin/UserEditModal.tsx
  - Add role selector
  - Add price plan input
  - Add admin notes textarea
  - Add active/inactive toggle
  - _Requirements: 7.3, 7.7_


- [x] 7.4 Implement password reset functionality

  - Generate new secure password
  - Hash and update in database
  - Send password reset email to user
  - Show success message with password
  - _Requirements: 7.4, 7.5, 7.6, 13.3_

---

- [x] 8. Role-Based Dashboard Access





  - Update dashboard routing based on role
  - Create reader dashboard
  - Hide upload features from reader users
  - Add role checks to document APIs
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 8.1 Create reader dashboard


  - Create app/reader/page.tsx
  - Create components/reader/ReaderDashboard.tsx
  - Display only shared documents
  - Add document viewer links
  - Hide upload and management features
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 8.2 Update platform dashboard for role checks


  - Add role check in app/dashboard/page.tsx
  - Hide upload button for READER_USER
  - Hide share management for READER_USER
  - Show appropriate message for reader users
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.4_

- [x] 8.3 Add role checks to document APIs


  - Update app/api/documents/route.ts (POST) - require PLATFORM_USER or ADMIN
  - Update app/api/documents/[id]/route.ts (PATCH, DELETE) - require PLATFORM_USER or ADMIN
  - Update app/api/share/*/route.ts - require PLATFORM_USER or ADMIN
  - Return 403 for unauthorized roles
  - _Requirements: 9.5, 10.5, 10.6, 13.1, 13.2_

- [x] 8.4 Update navigation based on role


  - Show admin link only for ADMIN
  - Show upload features only for PLATFORM_USER and ADMIN
  - Show reader dashboard for READER_USER
  - Update dashboard layout
  - _Requirements: 9.4, 10.4_

---

- [x] 9. Disable Public Registration





  - Remove or disable registration page
  - Update navigation to remove registration links
  - Add redirects from old registration URL
  - Update login page messaging
  - _Requirements: 8.2_


- [x] 9.1 Disable registration page

  - Update app/(auth)/register/page.tsx to show "Request Access" message
  - Or redirect to landing page
  - Remove registration API endpoint or add admin-only check
  - _Requirements: 8.2_


- [x] 9.2 Update navigation and links

  - Remove "Sign Up" links from navigation
  - Update login page to show "Request Access" link
  - Add link to landing page
  - _Requirements: 8.2_

---

- [x] 10. Security Hardening



  - Add role verification middleware
  - Implement audit logging
  - Add rate limiting to auth endpoints
  - Sanitize all inputs
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_


- [x] 10.1 Create role verification utilities
  - Create lib/role-check.ts with helper functions
  - Add requireAdmin() middleware
  - Add requirePlatformUser() middleware
  - Add hasRole() utility function
  - _Requirements: 13.1, 13.2_


- [x] 10.2 Implement audit logging

  - Create lib/audit-log.ts
  - Log all admin actions (user creation, password resets, etc.)
  - Log authentication attempts
  - Log unauthorized access attempts
  - Store in database or external service
  - _Requirements: 13.6, 13.7_



- [x] 10.3 Add rate limiting to auth endpoints
  - Add rate limiting to login endpoint (10 per hour per IP)
  - Add rate limiting to password reset (5 per hour per IP)
  - Use existing rate-limit.ts infrastructure
  - _Requirements: 13.6_


- [x] 10.4 Input sanitization


  - Sanitize all user inputs in access request form
  - Sanitize admin notes and user-provided text
  - Use existing sanitization.ts utilities
  - Prevent XSS and injection attacks
  - _Requirements: 13.5_

---

- [x] 11. Testing and Validation





  - Test access request submission flow
  - Test admin approval workflow
  - Test role-based authentication
  - Test email notifications
  - Test all three user roles
  - _Requirements: All_

- [x] 11.1 Test access request flow


  - Submit access request from landing page
  - Verify database record created
  - Verify admin receives email
  - Test rate limiting
  - Test validation errors
  - _Requirements: 2.1-2.8_

- [x] 11.2 Test admin approval workflow

  - Login as admin
  - View access requests
  - Approve request and create user
  - Verify user created in database
  - Verify approval email sent
  - Test password generation
  - _Requirements: 6.1-6.7_

- [x] 11.3 Test user management

  - Edit user details
  - Reset user password
  - Deactivate user
  - Verify emails sent
  - _Requirements: 7.1-7.7_

- [x] 11.4 Test role-based authentication

  - Login as ADMIN - verify redirect to /admin
  - Login as PLATFORM_USER - verify redirect to /dashboard
  - Login as READER_USER - verify redirect to /inbox
  - Test unauthorized access to admin routes
  - _Requirements: 8.1-8.8_

- [x] 11.5 Test role-based features

  - Verify READER_USER cannot upload documents
  - Verify READER_USER cannot access document APIs
  - Verify PLATFORM_USER can upload and share
  - Verify ADMIN has full access
  - _Requirements: 9.1-9.5, 10.1-10.6_

---

- [x] 12. Documentation and Deployment





  - Update README with new onboarding flow
  - Create admin user guide
  - Set environment variables
  - Run migrations in production
  - Monitor for errors
  - _Requirements: All_


- [x] 12.1 Update documentation

  - Update README.md with new access model
  - Document admin workflows
  - Document user roles and permissions
  - Create troubleshooting guide
  - _Requirements: All_


- [x] 12.2 Prepare deployment

  - Set ADMIN_SEED_PASSWORD environment variable
  - Verify all Resend configuration
  - Review database migration plan
  - Create rollback plan
  - _Requirements: 15.4_


- [x] 12.3 Deploy to production

  - Run database migrations
  - Run admin seed script
  - Verify admin login
  - Test access request submission
  - Monitor error logs
  - _Requirements: All_


- [x] 12.4 Post-deployment verification

  - Test complete flow end-to-end
  - Verify all emails are sent
  - Check for any errors in logs
  - Verify old registration page is disabled
  - Test all three user roles
  - _Requirements: All_
