# Requirements Document - jstudyroom Platform Extension

## Introduction

This specification extends the existing FlipBook DRM application into a comprehensive **jstudyroom platform** with three distinct user roles, a book shop system, member self-registration, and a personal virtual bookshelf feature called "My jstudyroom". The platform maintains all existing FlipBook DRM functionality while adding new member-focused features and improving the overall user experience.

## Glossary

- **System**: The jstudyroom platform (extended FlipBook DRM application)
- **Admin**: User with ADMIN role who manages the platform
- **Platform User**: User with PLATFORM_USER role who can upload and share documents
- **Member**: User with MEMBER role who can self-register and access shared documents
- **Book Shop**: Admin-curated catalog of documents available to Members
- **My jstudyroom**: Personal virtual bookshelf for Members (max 10 documents)
- **Book Shop Item**: A document published in the Book Shop with metadata
- **Free Document**: Book Shop document available at no cost
- **Paid Document**: Book Shop document requiring payment
- **Access Request**: Platform User's request for account creation
- **Resend**: Email service provider (support@jstudyroom.dev)

## Requirements

### Requirement 1: Member Self-Registration

**User Story:** As a visitor, I want to self-register as a jstudyroom Member, so that I can access shared documents and the Book Shop.

#### Acceptance Criteria

1.1 WHEN a visitor accesses the registration page, THE System SHALL display a registration form with email, password, and name fields.

1.2 WHEN a visitor submits valid registration data, THE System SHALL create a Member account with MEMBER role and emailVerified set to false.

1.3 WHEN a Member account is created, THE System SHALL send a verification email via Resend to the provided email address.

1.4 WHEN a Member clicks the verification link, THE System SHALL mark the account as verified and redirect to login.

1.5 WHEN a Member attempts to log in with an unverified account, THE System SHALL redirect to the verification reminder page.

1.6 THE System SHALL NOT allow Platform User self-registration through the public registration form.

### Requirement 2: Role-Based Authentication and Routing

**User Story:** As a user, I want to be redirected to the appropriate dashboard based on my role after login, so that I can access relevant features.

#### Acceptance Criteria

2.1 WHEN a user with ADMIN role logs in successfully, THE System SHALL redirect to `/admin`.

2.2 WHEN a user with PLATFORM_USER role logs in successfully, THE System SHALL redirect to `/dashboard`.

2.3 WHEN a user with MEMBER role logs in successfully, THE System SHALL redirect to `/member`.

2.4 WHEN an unauthenticated user attempts to access a protected route, THE System SHALL redirect to `/login`.

2.5 WHEN a user attempts to access a route not permitted for their role, THE System SHALL return a 403 Forbidden error.

### Requirement 3: Member Dashboard

**User Story:** As a Member, I want a dedicated dashboard with access to shared files, My jstudyroom, and the Book Shop, so that I can manage my documents.

#### Acceptance Criteria

3.1 WHEN a Member accesses `/member`, THE System SHALL display a dashboard with three main sections: Files Shared With Me, My jstudyroom, and Book Shop.

3.2 THE System SHALL provide navigation between the three Member dashboard sections.

3.3 WHEN a Member views their dashboard, THE System SHALL display their current document counts (free and paid) in My jstudyroom.

3.4 THE System SHALL display a welcome message with the Member's name.

### Requirement 4: Files Shared With Me

**User Story:** As a Member, I want to view all documents shared specifically with my email, so that I can access content shared by Platform Users.

#### Acceptance Criteria

4.1 WHEN a Member accesses Files Shared With Me, THE System SHALL display all documents shared to their email address.

4.2 THE System SHALL display for each shared document: title, sender name, share date, expiration date (if any), and personal note (if any).

4.3 WHEN a Member clicks on a shared document, THE System SHALL verify the Member's email matches the share recipient before allowing access.

4.4 IF a shared document has expired, THE System SHALL NOT display it in the list.

4.5 WHEN a Member attempts to access a shared document not intended for them, THE System SHALL display "Access Denied".

### Requirement 5: My jstudyroom - Document Limits

**User Story:** As a Member, I want a personal bookshelf with a maximum of 10 documents, so that I can organize my reading materials.

#### Acceptance Criteria

5.1 THE System SHALL enforce a maximum limit of 10 documents per Member in My jstudyroom.

5.2 THE System SHALL enforce a maximum of 5 free documents per Member in My jstudyroom.

5.3 THE System SHALL enforce a maximum of 5 paid documents per Member in My jstudyroom.

5.4 WHEN a Member attempts to add a document exceeding the total limit, THE System SHALL return an error message "You have reached the maximum of 10 documents in My jstudyroom".

5.5 WHEN a Member attempts to add a free document exceeding the free limit, THE System SHALL return an error message "You have reached the maximum of 5 free documents".

5.6 WHEN a Member attempts to add a paid document exceeding the paid limit, THE System SHALL return an error message "You have reached the maximum of 5 paid documents".

### Requirement 6: My jstudyroom - Document Management

**User Story:** As a Member, I want to view, access, and return documents in My jstudyroom, so that I can manage my personal collection.

#### Acceptance Criteria

6.1 WHEN a Member accesses My jstudyroom, THE System SHALL display all documents currently in their collection.

6.2 THE System SHALL display for each document: title, category, type (free/paid), and date added.

6.3 WHEN a Member clicks "View" on a document, THE System SHALL open the document in the FlipBook viewer.

6.4 WHEN a Member clicks "Return" on a document, THE System SHALL remove the document from My jstudyroom and re-enable the "Add to My jstudyroom" button in the Book Shop.

6.5 WHEN a document is returned, THE System SHALL decrement the appropriate counter (free or paid) for that Member.

### Requirement 7: Book Shop - Catalog Display

**User Story:** As a Member, I want to browse a catalog of documents organized by category, so that I can discover content.

#### Acceptance Criteria

7.1 WHEN a Member accesses the Book Shop, THE System SHALL display all published Book Shop items.

7.2 THE System SHALL display for each Book Shop item: title, description, category, type (free/paid), and price (if paid).

7.3 THE System SHALL provide filtering by category.

7.4 THE System SHALL provide search functionality by title or description.

7.5 IF a Member already has a Book Shop item in My jstudyroom, THE System SHALL disable the "Add to My jstudyroom" button for that item.

### Requirement 8: Book Shop - Free Document Addition

**User Story:** As a Member, I want to add free documents to My jstudyroom, so that I can access them without payment.

#### Acceptance Criteria

8.1 WHEN a Member clicks "Add to My jstudyroom" on a free document, THE System SHALL verify the Member has not exceeded the free document limit.

8.2 WHEN a Member clicks "Add to My jstudyroom" on a free document, THE System SHALL verify the Member has not exceeded the total document limit.

8.3 IF limits are not exceeded, THE System SHALL add the document to My jstudyroom and disable the button for that Member.

8.4 IF limits are exceeded, THE System SHALL display an appropriate error message and NOT add the document.

8.5 WHEN a free document is added, THE System SHALL increment the Member's free document count.

### Requirement 9: Book Shop - Paid Document Purchase

**User Story:** As a Member, I want to purchase paid documents and have them automatically added to My jstudyroom, so that I can access premium content.

#### Acceptance Criteria

9.1 WHEN a Member clicks on a paid document, THE System SHALL display a payment modal with document details and price.

9.2 WHEN a Member initiates payment, THE System SHALL integrate with Razorpay payment gateway.

9.3 WHEN payment is successful, THE System SHALL create a Payment record with status "success".

9.4 WHEN payment is successful, THE System SHALL automatically add the document to My jstudyroom.

9.5 WHEN payment is successful, THE System SHALL send a purchase confirmation email via Resend with document details and access link.

9.6 WHEN payment is successful, THE System SHALL increment the Member's paid document count.

9.7 IF payment fails, THE System SHALL display an error message and NOT add the document to My jstudyroom.

9.8 WHEN a Member attempts to purchase a paid document exceeding limits, THE System SHALL prevent the purchase and display an error message.

### Requirement 10: Admin - Book Shop Management

**User Story:** As an Admin, I want to create and manage Book Shop items, so that I can curate content for Members.

#### Acceptance Criteria

10.1 WHEN an Admin accesses the Book Shop management page, THE System SHALL display all Book Shop items with edit and delete options.

10.2 WHEN an Admin creates a Book Shop item, THE System SHALL require: document selection, title, description, category, type (free/paid), and price (if paid).

10.3 WHEN an Admin creates a Book Shop item, THE System SHALL link it to an existing Document in the system.

10.4 WHEN an Admin updates a Book Shop item, THE System SHALL save the changes and update the catalog immediately.

10.5 WHEN an Admin deletes a Book Shop item, THE System SHALL remove it from the catalog but NOT delete the underlying Document.

10.6 THE System SHALL allow Admins to create custom categories for Book Shop items.

### Requirement 11: Admin - Member Management

**User Story:** As an Admin, I want to view and manage Member accounts, so that I can support users and enforce policies.

#### Acceptance Criteria

11.1 WHEN an Admin accesses the Members management page, THE System SHALL display all users with MEMBER role.

11.2 THE System SHALL display for each Member: email, name, registration date, verification status, and document counts.

11.3 WHEN an Admin views a Member's details, THE System SHALL display their My jstudyroom contents and purchase history.

11.4 WHEN an Admin deactivates a Member account, THE System SHALL prevent the Member from logging in.

11.5 WHEN an Admin resets a Member's password, THE System SHALL send a password reset email via Resend.

### Requirement 12: Share Link Access Control

**User Story:** As a Platform User, I want to share documents with specific Members, so that only intended recipients can access them.

#### Acceptance Criteria

12.1 WHEN a Platform User shares a document to a specific email, THE System SHALL create a share record with the recipient email.

12.2 WHEN a recipient accesses a shared document link, THE System SHALL verify they are logged in.

12.3 IF the recipient is not logged in, THE System SHALL redirect to login with a return URL to the shared document.

12.4 WHEN a logged-in user accesses a shared document, THE System SHALL verify their email matches the share recipient email.

12.5 IF the user's email does not match, THE System SHALL display "Access Denied - This document was shared with a different email address".

12.6 IF the user's email matches, THE System SHALL allow viewing the document in the FlipBook viewer.

12.7 WHEN a share link has no specific email restriction, THE System SHALL allow any authenticated user to view the document.

### Requirement 13: Email Notifications

**User Story:** As a user, I want to receive email notifications for important events, so that I stay informed.

#### Acceptance Criteria

13.1 WHEN a Member registers, THE System SHALL send a verification email via Resend from support@jstudyroom.dev.

13.2 WHEN a Member purchases a paid document, THE System SHALL send a purchase confirmation email via Resend.

13.3 WHEN a Platform User's access request is approved, THE System SHALL send an approval email via Resend with login credentials.

13.4 WHEN a document is shared to a specific email, THE System SHALL send a share notification email via Resend.

13.5 WHEN an Admin resets a user's password, THE System SHALL send a password reset email via Resend.

13.6 ALL emails SHALL include plain text fallbacks and be mobile-responsive.

13.7 ALL emails SHALL use the FROM address support@jstudyroom.dev.

### Requirement 14: Password Reset Flow

**User Story:** As a user, I want to reset my password if I forget it, so that I can regain access to my account.

#### Acceptance Criteria

14.1 WHEN a user requests a password reset, THE System SHALL send a reset email with a secure token valid for 1 hour.

14.2 WHEN a user clicks the reset link, THE System SHALL display a password reset form.

14.3 WHEN a user submits a new password, THE System SHALL update the password hash and mark the account as verified if it was already verified.

14.4 WHEN password reset is successful, THE System SHALL redirect to the login page with a success message.

14.5 THE System SHALL NOT redirect to a verification page after successful password reset for already-verified users.

14.6 WHEN a reset token expires, THE System SHALL display an error message and provide a link to request a new reset.

### Requirement 15: Theme Support

**User Story:** As a user, I want to toggle between light and dark modes, so that I can use the platform comfortably in different lighting conditions.

#### Acceptance Criteria

15.1 THE System SHALL provide a theme toggle button in the header.

15.2 WHEN a user toggles the theme, THE System SHALL apply the selected theme (light or dark) to all UI elements.

15.3 THE System SHALL persist the theme preference in localStorage.

15.4 WHEN a user returns to the platform, THE System SHALL apply their saved theme preference.

15.5 THE System SHALL use Tailwind's `dark:` classes for all theme-aware styling.

15.6 THE System SHALL ensure backgrounds, text, cards, and navigation visually change between light and dark modes.

### Requirement 16: Landing Page

**User Story:** As a visitor, I want to understand what jstudyroom offers, so that I can decide whether to register or request access.

#### Acceptance Criteria

16.1 WHEN a visitor accesses the landing page, THE System SHALL display an overview of jstudyroom features.

16.2 THE System SHALL provide separate call-to-action sections for Platform Users and Members.

16.3 THE System SHALL display a Platform User request form on the landing page.

16.4 THE System SHALL provide a link to Member registration.

16.5 THE System SHALL provide a login link for existing users.

16.6 THE System SHALL explain the difference between Platform Users and Members.

### Requirement 17: Database Schema

**User Story:** As a developer, I want a well-structured database schema, so that the system can efficiently store and retrieve data.

#### Acceptance Criteria

17.1 THE System SHALL include a BookShopItem model with fields: id, documentId, title, description, category, isFree, price, isPublished, createdAt, updatedAt.

17.2 THE System SHALL include a MyJstudyroomItem model with fields: id, userId, bookShopItemId, isFree, addedAt.

17.3 THE System SHALL include a Payment model with fields: id, userId, bookShopItemId, amount, currency, status, razorpayOrderId, razorpayPaymentId, createdAt.

17.4 THE System SHALL extend the User model with fields: freeDocumentCount (default 0), paidDocumentCount (default 0).

17.5 THE System SHALL ensure the UserRole enum includes: ADMIN, PLATFORM_USER, MEMBER.

17.6 THE System SHALL maintain referential integrity with appropriate foreign keys and cascade deletes.

### Requirement 18: Security and Validation

**User Story:** As a developer, I want robust security and validation, so that the platform is protected from attacks and data corruption.

#### Acceptance Criteria

18.1 THE System SHALL validate all user inputs on both client and server side.

18.2 THE System SHALL sanitize all user-provided text to prevent XSS attacks.

18.3 THE System SHALL use parameterized queries (Prisma) to prevent SQL injection.

18.4 THE System SHALL enforce role-based access control on all API endpoints.

18.5 THE System SHALL rate-limit sensitive endpoints (registration, login, password reset).

18.6 THE System SHALL hash all passwords with bcrypt (12 rounds minimum).

18.7 THE System SHALL use secure, cryptographically random tokens for verification and password reset.

18.8 THE System SHALL enforce HTTPS in production.

### Requirement 19: Payment Integration

**User Story:** As a Member, I want a secure payment experience, so that I can purchase documents with confidence.

#### Acceptance Criteria

19.1 THE System SHALL integrate with Razorpay payment gateway.

19.2 WHEN a Member initiates payment, THE System SHALL create a Razorpay order with the correct amount.

19.3 THE System SHALL use Razorpay's secure checkout interface.

19.4 WHEN payment is successful, THE System SHALL verify the payment signature.

19.5 WHEN payment is verified, THE System SHALL update the Payment record status to "success".

19.6 IF payment verification fails, THE System SHALL update the Payment record status to "failed" and NOT add the document.

19.7 THE System SHALL log all payment transactions for audit purposes.

### Requirement 20: Performance and Scalability

**User Story:** As a user, I want fast page loads and responsive interactions, so that I have a smooth experience.

#### Acceptance Criteria

20.1 THE System SHALL load the landing page in under 3 seconds on a standard connection.

20.2 THE System SHALL load dashboard pages in under 2 seconds.

20.3 THE System SHALL use database indexes on frequently queried fields (email, userId, bookShopItemId).

20.4 THE System SHALL implement pagination for large lists (Book Shop, shared documents).

20.5 THE System SHALL use Next.js server-side rendering for improved initial load times.

20.6 THE System SHALL optimize images and assets for web delivery.

