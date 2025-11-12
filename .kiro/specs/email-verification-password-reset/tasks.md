# Implementation Plan: Email Verification and Password Reset

- [x] 1. Database schema and migration setup





  - Update Prisma schema with email verification fields and VerificationToken model
  - Create and run database migration
  - Add script to mark existing users as verified
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. Token management system




- [x] 2.1 Create token utilities module


  - Implement `generateVerificationToken()` function with crypto.randomBytes
  - Implement `validateToken()` function with SHA-256 hashing
  - Implement `invalidateUserTokens()` function
  - Implement `cleanupExpiredTokens()` function
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_



- [x] 2.2 Write token management tests





  - Test token generation and uniqueness
  - Test token validation and expiration
  - Test token cleanup functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Email service integration






- [x] 3.1 Set up Resend and React Email

  - Install Resend SDK and React Email packages
  - Create email service module with Resend integration
  - Configure environment variables for Resend API
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


- [x] 3.2 Create email templates

  - Create VerificationEmail component with React Email
  - Create PasswordResetEmail component with React Email
  - Add FlipBook DRM branding and styling
  - Include plain text fallbacks
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_


- [x] 3.3 Implement email sending functions

  - Create `sendVerificationEmail()` function
  - Create `sendPasswordResetEmail()` function
  - Add error handling and logging
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 3.4 Test email service


  - Test email template rendering
  - Test email sending with mock data
  - Verify error handling
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 4. Email verification API routes




- [x] 4.1 Create verify-email endpoint


  - Implement POST `/api/auth/verify-email` route
  - Validate token and mark user as verified
  - Handle expired and invalid tokens
  - Return appropriate success/error responses
  - _Requirements: 1.3, 1.5_

- [x] 4.2 Create resend-verification endpoint


  - Implement POST `/api/auth/resend-verification` route
  - Invalidate old tokens and generate new one
  - Send new verification email
  - Implement rate limiting (1 per 60 seconds)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Password reset API routes






- [x] 5.1 Create forgot-password endpoint

  - Implement POST `/api/auth/forgot-password` route
  - Generate reset token for valid email
  - Send password reset email
  - Implement rate limiting (3 per hour)
  - Don't reveal if email exists
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_


- [x] 5.2 Create reset-password endpoint

  - Implement POST `/api/auth/reset-password` route
  - Validate reset token
  - Validate new password strength
  - Update user password and invalidate token
  - Invalidate all user sessions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Update registration flow




- [x] 6.1 Modify registration API


  - Update `/api/auth/register` to create unverified users
  - Generate verification token after user creation
  - Send verification email
  - Return success message with instructions
  - _Requirements: 1.1, 1.2, 7.1, 7.2_

- [x] 6.2 Update registration form


  - Add message about email verification after registration
  - Display email address where verification was sent
  - Add "Resend verification email" option
  - _Requirements: 7.1, 7.2_

- [x] 7. Update authentication flow






- [x] 7.1 Modify NextAuth configuration

  - Update auth callbacks to check email verification status
  - Redirect unverified users to verification pending page
  - Allow verified users to proceed normally
  - _Requirements: 10.1, 10.3_


- [x] 7.2 Create verification pending page

  - Create `/verify-email` page for unverified users
  - Display user's email address
  - Add "Resend Verification Email" button
  - Show success/error messages
  - _Requirements: 10.2, 7.1, 7.2_

- [x] 8. Create email verification pages




- [x] 8.1 Create verify page


  - Create `/verify` page that accepts token parameter
  - Call verify-email API with token
  - Display success message and redirect to dashboard
  - Handle expired/invalid token errors
  - Provide resend option on error
  - _Requirements: 1.3, 1.5, 7.3, 7.4_

- [x] 9. Create password reset pages







- [x] 9.1 Create forgot password page

  - Create `/forgot-password` page with email input form
  - Call forgot-password API
  - Display confirmation message
  - Handle validation errors
  - _Requirements: 3.1, 3.2, 3.3, 7.3_


- [x] 9.2 Create reset password page

  - Create `/reset-password` page that accepts token parameter
  - Display password reset form with strength indicator
  - Call reset-password API
  - Display success message and redirect to login
  - Handle expired/invalid token errors
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.4_

- [x] 10. Update login page





- [x] 10.1 Add forgot password link

  - Add "Forgot Password?" link to login form
  - Link to `/forgot-password` page
  - _Requirements: 10.4_

- [x] 10.2 Handle unverified user login

  - Show message for unverified users after login attempt
  - Redirect to verification pending page
  - _Requirements: 10.1, 10.2_

- [x] 11. Rate limiting implementation




- [x] 11.1 Set up rate limiting infrastructure


  - Install and configure rate limiting library (Upstash or in-memory)
  - Create rate limit utilities
  - Configure limits for different endpoints
  - _Requirements: 2.4, 2.5, 3.5_


- [x] 11.2 Apply rate limiting to endpoints

  - Add rate limiting to resend-verification endpoint
  - Add rate limiting to forgot-password endpoint
  - Return appropriate error messages when rate limited
  - _Requirements: 2.4, 2.5, 3.5_

- [-] 12. Security enhancements



- [x] 12.1 Add security logging


  - Log all verification attempts
  - Log all password reset attempts
  - Log rate limit violations
  - Log suspicious activity
  - _Requirements: 10.5_

- [x] 12.2 Implement token cleanup job





  - Create cron job or scheduled task for token cleanup
  - Delete expired tokens older than 7 days
  - Log cleanup statistics
  - _Requirements: 6.5_

- [x] 13. Update user interface components




- [x] 13.1 Create reusable UI components


  - Create PasswordStrengthIndicator component
  - Create EmailSentMessage component
  - Create TokenExpiredMessage component
  - Update Button component for loading states
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 13.2 Add user feedback mechanisms


  - Add toast notifications for success/error messages
  - Add loading states to all forms
  - Add inline validation for email and password fields
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 14. Documentation and deployment





- [x] 14.1 Update environment configuration


  - Add Resend API key to .env.example
  - Document email service setup in README
  - Update Vercel environment variable guide
  - _Requirements: 5.4_

- [x] 14.2 Create migration guide



  - Document database migration steps
  - Create script to mark existing users as verified
  - Document Resend setup process
  - Add troubleshooting guide
  - _Requirements: 8.1, 8.2_

- [x] 14.3 Update user documentation


  - Add email verification instructions to user guide
  - Add password reset instructions
  - Update FAQ with common questions
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 15. Testing and validation





- [x] 15.1 Integration testing


  - Test complete registration and verification flow
  - Test resend verification email flow
  - Test password reset flow
  - Test rate limiting on all endpoints
  - _Requirements: All_


- [x] 15.2 Security testing






  - Test token expiration handling
  - Test token reuse prevention
  - Test rate limiting effectiveness
  - Test email enumeration prevention
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 15.3 Email delivery testing






  - Test email delivery in development
  - Test email delivery in production
  - Verify email templates render correctly
  - Test spam score of emails
  - _Requirements: 5.1, 5.2, 9.1, 9.2, 9.3, 9.4, 9.5_
