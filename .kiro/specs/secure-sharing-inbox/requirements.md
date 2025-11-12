# Requirements Document: Secure Sharing & Inbox System

## Introduction

This document specifies the requirements for implementing an enhanced secure sharing system with email-specific sharing capabilities and a centralized inbox for FlipBook DRM. The feature extends the existing link-based sharing to support direct email sharing and provides users with a unified inbox to view documents shared with them.

## Glossary

- **System**: The FlipBook DRM application
- **Document Owner**: A registered user who has uploaded a document to the System
- **Share Creator**: A Document Owner who creates a share link or email share
- **Share Recipient**: A user (registered or unregistered) who receives access to a shared document
- **Link Share**: A shareable URL with optional access controls (password, expiry, view limits)
- **Email Share**: A document share targeted to a specific email address
- **Inbox**: A centralized view showing all documents shared with the current user
- **Share Key**: A unique, cryptographically secure identifier for a link share
- **Signed URL**: A time-limited URL for accessing files from Supabase storage
- **Session**: An authenticated user session managed by NextAuth

## Requirements

### Requirement 1: Link-Based Sharing with Enhanced Controls

**User Story:** As a Document Owner, I want to create shareable links with advanced access controls, so that I can securely distribute my documents with fine-grained permissions.

#### Acceptance Criteria

1. WHEN a Document Owner creates a link share, THE System SHALL generate a unique Share Key using a cryptographically secure random generator with minimum 24 characters
2. WHEN a Document Owner creates a link share, THE System SHALL allow optional password protection where the password is hashed using bcrypt with minimum 12 rounds
3. WHEN a Document Owner creates a link share, THE System SHALL allow setting an expiration date and time in ISO 8601 format
4. WHEN a Document Owner creates a link share, THE System SHALL allow setting a maximum view count as a positive integer
5. WHEN a Document Owner creates a link share, THE System SHALL allow restricting access to a specific email address
6. WHEN a Document Owner creates a link share, THE System SHALL allow enabling or disabling download permissions
7. WHEN a link share is created, THE System SHALL return a complete shareable URL in the format `{baseUrl}/share/{shareKey}`
8. WHEN a non-owner attempts to create a link share, THE System SHALL reject the request with HTTP 403 Forbidden

### Requirement 2: Email-Specific Sharing

**User Story:** As a Document Owner, I want to share documents directly with specific email addresses, so that only intended recipients can access my documents.

#### Acceptance Criteria

1. WHEN a Document Owner shares a document to an email address, THE System SHALL verify the Document Owner owns the document before creating the share
2. WHEN a Document Owner shares to a registered user's email, THE System SHALL link the share to the user's account ID
3. WHEN a Document Owner shares to an unregistered email, THE System SHALL store the email address for future matching after registration
4. WHEN an email share is created, THE System SHALL allow setting an optional expiration date in ISO 8601 format
5. WHEN an email share is created, THE System SHALL allow enabling or disabling download permissions with default value false
6. WHEN an email share is created, THE System SHALL allow adding an optional note with maximum 500 characters
7. WHEN an email share is created successfully, THE System SHALL return a success confirmation
8. WHEN a non-owner attempts to create an email share, THE System SHALL reject the request with HTTP 403 Forbidden

### Requirement 3: Unified Inbox

**User Story:** As a Share Recipient, I want to see all documents shared with me in one place, so that I can easily access and manage shared content.

#### Acceptance Criteria

1. WHEN a user accesses their inbox, THE System SHALL display all documents shared via email where the share email matches the user's email address
2. WHEN a user accesses their inbox, THE System SHALL display all documents shared via email where the share user ID matches the user's ID
3. WHEN displaying inbox items, THE System SHALL show the document title as a clickable link
4. WHEN displaying inbox items, THE System SHALL show the name and email of the Share Creator
5. WHEN displaying inbox items, THE System SHALL show the date and time the share was created
6. WHEN displaying inbox items, THE System SHALL show the expiration date if one is set
7. WHEN displaying inbox items, THE System SHALL indicate whether download is allowed
8. WHEN the inbox is empty, THE System SHALL display a message "No documents shared with you yet"
9. WHEN displaying inbox items, THE System SHALL sort them by creation date in descending order with most recent first

### Requirement 4: Secure Share Access

**User Story:** As a Share Recipient, I want to access shared documents securely with proper authentication, so that my access is verified and tracked.

#### Acceptance Criteria

1. WHEN a user attempts to access a share link, THE System SHALL require an authenticated session before granting access
2. WHEN an unauthenticated user attempts to access a share, THE System SHALL redirect to the login page with callback URL to return after authentication
3. WHEN accessing a link share, THE System SHALL verify the share is active with isActive equals true
4. WHEN accessing a link share, THE System SHALL verify the share has not expired by comparing current time with expiresAt
5. WHEN accessing a link share with restrictToEmail set, THE System SHALL verify the user's email matches the restricted email exactly
6. WHEN accessing a password-protected share without valid password cookie, THE System SHALL prompt for password before granting access
7. WHEN a valid password is provided, THE System SHALL set an HttpOnly cookie with SameSite Lax and maximum age 3600 seconds
8. WHEN accessing a link share with maxViews set, THE System SHALL increment viewCount atomically and deny access if viewCount exceeds maxViews
9. WHEN accessing an email share, THE System SHALL verify the user's ID matches sharedWithUserId OR the user's email matches sharedWithEmail
10. WHEN access is granted, THE System SHALL generate a Supabase signed URL with time-to-live 300 seconds for the document

### Requirement 5: Password Verification

**User Story:** As a Share Recipient, I want to enter a password once for password-protected shares, so that I can access the document without repeated authentication.

#### Acceptance Criteria

1. WHEN a user submits a password for a share, THE System SHALL compare the provided password with the stored bcrypt hash
2. WHEN the password matches, THE System SHALL set a cookie named `share_ok_{shareKey}` with HttpOnly true and SameSite Lax
3. WHEN the password matches, THE System SHALL set the cookie maximum age to 3600 seconds
4. WHEN the password does not match, THE System SHALL return HTTP 401 Unauthorized with error message "Invalid password"
5. WHEN the password does not match, THE System SHALL NOT set any cookie
6. WHEN a valid password cookie exists, THE System SHALL grant access without prompting for password again

### Requirement 6: View Analytics Tracking

**User Story:** As a Document Owner, I want to track who views my shared documents and when, so that I can monitor document usage and engagement.

#### Acceptance Criteria

1. WHEN a Share Recipient views a document, THE System SHALL record the viewer's email address from the session
2. WHEN a Share Recipient views a document, THE System SHALL record the IP address from the X-Forwarded-For header or X-Real-IP header
3. WHEN a Share Recipient views a document, THE System SHALL record the User-Agent string from the request headers
4. WHEN a Share Recipient views a document, THE System SHALL attempt to determine the country from the IP address if geolocation service is available
5. WHEN a Share Recipient views a document, THE System SHALL attempt to determine the city from the IP address if geolocation service is available
6. WHEN a Share Recipient views a document, THE System SHALL record the current timestamp in UTC
7. WHEN a Share Recipient views a document, THE System SHALL record the Share Key used for access
8. WHEN recording analytics fails, THE System SHALL log the error but SHALL NOT prevent document access

### Requirement 7: Share Management

**User Story:** As a Document Owner, I want to manage my active shares, so that I can revoke access when needed.

#### Acceptance Criteria

1. WHEN a Document Owner views their document details, THE System SHALL display all active link shares for that document
2. WHEN a Document Owner views their document details, THE System SHALL display all email shares for that document
3. WHEN a Document Owner revokes a link share, THE System SHALL set isActive to false
4. WHEN a Document Owner revokes an email share, THE System SHALL delete the DocumentShare record
5. WHEN a share is revoked, THE System SHALL prevent future access attempts with HTTP 403 Forbidden
6. WHEN a non-owner attempts to revoke a share, THE System SHALL reject the request with HTTP 403 Forbidden

### Requirement 8: Input Validation and Security

**User Story:** As the System, I want to validate all inputs and enforce security policies, so that the application remains secure against attacks.

#### Acceptance Criteria

1. WHEN any API endpoint receives a request, THE System SHALL validate all inputs using Zod schema validation
2. WHEN validation fails, THE System SHALL return HTTP 400 Bad Request with specific error details
3. WHEN a password is provided, THE System SHALL enforce minimum length of 8 characters
4. WHEN an email is provided, THE System SHALL validate it matches RFC 5322 email format
5. WHEN a date is provided, THE System SHALL validate it is in ISO 8601 format
6. WHEN a maxViews value is provided, THE System SHALL validate it is a positive integer between 1 and 10000
7. WHEN a note is provided, THE System SHALL sanitize it to prevent XSS attacks
8. WHEN generating Share Keys, THE System SHALL use cryptographically secure random generation with minimum entropy 128 bits
9. WHEN storing passwords, THE System SHALL hash them using bcrypt with cost factor minimum 12
10. WHEN logging errors, THE System SHALL NOT log passwords, tokens, or other sensitive data in plain text

### Requirement 9: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and how to fix it.

#### Acceptance Criteria

1. WHEN an error occurs, THE System SHALL return a JSON response with structure `{ error: { code: string, message: string } }`
2. WHEN a share is not found, THE System SHALL return HTTP 404 Not Found with message "Share not found"
3. WHEN a share has expired, THE System SHALL return HTTP 403 Forbidden with message "This share has expired"
4. WHEN a share is inactive, THE System SHALL return HTTP 403 Forbidden with message "This share has been revoked"
5. WHEN view limit is exceeded, THE System SHALL return HTTP 403 Forbidden with message "This share has reached its maximum view limit"
6. WHEN email restriction fails, THE System SHALL return HTTP 403 Forbidden with message "This share is restricted to a different email address"
7. WHEN authentication is required, THE System SHALL return HTTP 401 Unauthorized with message "Authentication required"
8. WHEN authorization fails, THE System SHALL return HTTP 403 Forbidden with message "You do not have permission to perform this action"

### Requirement 10: Performance and Scalability

**User Story:** As the System, I want to handle share operations efficiently, so that users experience fast response times even under load.

#### Acceptance Criteria

1. WHEN creating a share, THE System SHALL complete the operation within 500 milliseconds for 95th percentile
2. WHEN accessing the inbox, THE System SHALL return results within 1000 milliseconds for 95th percentile
3. WHEN verifying share access, THE System SHALL complete validation within 300 milliseconds for 95th percentile
4. WHEN generating signed URLs, THE System SHALL complete generation within 200 milliseconds for 95th percentile
5. WHEN incrementing view counts, THE System SHALL use atomic database operations to prevent race conditions
6. WHEN querying shares, THE System SHALL use database indexes on shareKey, documentId, userId, sharedWithEmail, and sharedWithUserId
7. WHEN the inbox contains more than 100 items, THE System SHALL implement pagination with page size 50
