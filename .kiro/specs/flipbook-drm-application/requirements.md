# Requirements Document

## Introduction

FlipBook DRM is a secure PDF sharing platform that enables users to upload, manage, and share PDF documents with comprehensive DRM protection, dynamic watermarking, view analytics, and subscription-based access control. The system provides time-limited secure sharing, tracks document views, prevents unauthorized copying, and integrates payment processing for tiered subscription plans.

## Glossary

- **FlipBook System**: The complete web application including frontend, backend API, and database
- **User**: An authenticated individual with an account in the system
- **Document**: A PDF file uploaded and stored by a User
- **Share Link**: A unique, secure URL that provides controlled access to a Document
- **Viewer**: An individual accessing a Document through a Share Link
- **DRM Protection**: Digital Rights Management features that prevent unauthorized copying, downloading, or printing
- **Watermark**: Dynamic text overlay applied to PDF pages containing Viewer identification
- **Analytics Record**: A database entry tracking a single view event of a Document
- **Subscription Tier**: A plan level (Free, Pro, or Enterprise) that determines User storage and feature limits
- **Razorpay**: The payment gateway service used for processing subscription payments
- **Supabase Storage**: The cloud storage service where Document files are stored
- **NextAuth**: The authentication library managing User sessions

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a new user, I want to register for an account with my email and password, so that I can securely access the platform and manage my documents.

#### Acceptance Criteria

1. WHEN a User submits a registration form with valid email and password, THE FlipBook System SHALL create a new User account with hashed password using bcrypt with 12 rounds
2. WHEN a User submits login credentials that match an existing account, THE FlipBook System SHALL create an authenticated session using NextAuth with JWT tokens
3. WHEN a User attempts to access a protected route without authentication, THE FlipBook System SHALL redirect the User to the login page
4. WHEN a User logs out, THE FlipBook System SHALL terminate the session and clear authentication tokens

### Requirement 2: Document Upload and Storage

**User Story:** As an authenticated user, I want to upload PDF documents to the platform, so that I can share them securely with others.

#### Acceptance Criteria

1. WHEN an authenticated User uploads a PDF file up to 50MB, THE FlipBook System SHALL validate the file type as application/pdf
2. WHEN a valid PDF file is uploaded, THE FlipBook System SHALL store the file in Supabase Storage under a user-specific folder path
3. WHEN a Document is successfully stored, THE FlipBook System SHALL create a Document record in the database with title, filename, fileSize, and storagePath
4. WHEN a User's storage usage would exceed their Subscription Tier limit, THE FlipBook System SHALL reject the upload and display an error message
5. WHERE a User has a Free subscription, THE FlipBook System SHALL enforce a maximum of 5 documents and 100MB total storage

### Requirement 3: Document Management Dashboard

**User Story:** As an authenticated user, I want to view and manage all my uploaded documents in a dashboard, so that I can organize and control my content.

#### Acceptance Criteria

1. WHEN an authenticated User accesses the dashboard, THE FlipBook System SHALL display all Documents owned by that User with title, upload date, and file size
2. WHEN a User selects a Document, THE FlipBook System SHALL provide options to create share links, view analytics, or delete the Document
3. WHEN a User deletes a Document, THE FlipBook System SHALL remove the file from Supabase Storage and delete all associated ShareLink and ViewAnalytics records
4. THE FlipBook System SHALL display the User's current storage usage and remaining capacity based on their Subscription Tier

### Requirement 4: Secure Share Link Generation

**User Story:** As a document owner, I want to generate secure, time-limited share links for my documents, so that I can control who accesses my content and for how long.

#### Acceptance Criteria

1. WHEN a User creates a ShareLink for a Document, THE FlipBook System SHALL generate a unique shareKey using a cryptographically secure random string
2. WHERE a User specifies an expiration date, THE FlipBook System SHALL store the expiresAt timestamp and prevent access after that time
3. WHERE a User specifies a password, THE FlipBook System SHALL hash and store the password and require it for ShareLink access
4. WHERE a User specifies a maximum view count, THE FlipBook System SHALL store maxViews and prevent access when viewCount reaches that limit
5. WHEN a User deactivates a ShareLink, THE FlipBook System SHALL set isActive to false and prevent further access through that link

### Requirement 5: PDF Viewer with DRM Protection

**User Story:** As a document owner, I want viewers to see my PDFs with DRM protection enabled, so that my content cannot be easily copied or downloaded.

#### Acceptance Criteria

1. WHEN a Viewer accesses a valid ShareLink, THE FlipBook System SHALL render the PDF using PDF.js with page-by-page rendering
2. WHILE a Viewer is viewing a Document, THE FlipBook System SHALL disable right-click context menus and text selection
3. WHILE a Viewer is viewing a Document, THE FlipBook System SHALL block keyboard shortcuts for copy (Ctrl+C), print (Ctrl+P), and save (Ctrl+S)
4. IF a Viewer opens browser DevTools, THEN THE FlipBook System SHALL display a warning message about unauthorized access
5. WHEN a PDF page is rendered, THE FlipBook System SHALL use signed URLs with 1-hour expiration to prevent direct file downloads

### Requirement 6: Dynamic Watermarking

**User Story:** As a document owner, I want each viewer to see a watermark with their email and timestamp on every page, so that I can trace any unauthorized distribution.

#### Acceptance Criteria

1. WHEN a Viewer accesses a Document through a ShareLink, THE FlipBook System SHALL prompt for the Viewer's email address before displaying content
2. WHEN each PDF page is rendered, THE FlipBook System SHALL overlay a watermark containing the Viewer's email and current timestamp
3. THE FlipBook System SHALL apply the watermark to all pages of the Document with semi-transparent styling
4. THE FlipBook System SHALL position the watermark diagonally across the page to prevent easy removal

### Requirement 7: View Analytics Tracking

**User Story:** As a document owner, I want to see detailed analytics about who viewed my documents and when, so that I can understand my content's reach and usage.

#### Acceptance Criteria

1. WHEN a Viewer accesses a Document through a ShareLink, THE FlipBook System SHALL create a ViewAnalytics record with documentId, shareKey, viewerEmail, ipAddress, and userAgent
2. WHEN a ViewAnalytics record is created, THE FlipBook System SHALL increment the viewCount on the associated ShareLink
3. WHEN a User views analytics for a Document, THE FlipBook System SHALL display a timeline chart of views with timestamps
4. WHEN a User views analytics for a Document, THE FlipBook System SHALL display unique viewer count, total views, and viewer details including email and location
5. WHERE geolocation data is available from the IP address, THE FlipBook System SHALL store country and city information in the ViewAnalytics record

### Requirement 8: Subscription Management

**User Story:** As a user, I want to upgrade my subscription to Pro or Enterprise plans, so that I can access more storage and features.

#### Acceptance Criteria

1. WHEN a User selects a subscription plan, THE FlipBook System SHALL display plan details including storage limits, document limits, and pricing
2. WHEN a User initiates a Pro subscription purchase, THE FlipBook System SHALL create a Razorpay order for ₹999 with 30-day duration
3. WHEN a User initiates an Enterprise subscription purchase, THE FlipBook System SHALL create a Razorpay order for ₹4999 with 30-day duration
4. WHEN a Razorpay payment is completed successfully, THE FlipBook System SHALL create a Subscription record with status "active" and update the User's subscription field
5. WHEN a Subscription endDate is reached, THE FlipBook System SHALL set the subscription status to "expired" and revert the User to the Free tier
6. WHERE a User has a Pro subscription, THE FlipBook System SHALL enforce a maximum of 10GB storage with unlimited documents
7. WHERE a User has an Enterprise subscription, THE FlipBook System SHALL enforce unlimited storage and unlimited documents

### Requirement 9: API Security and Validation

**User Story:** As a system administrator, I want all API endpoints to be secure and validate inputs, so that the application is protected from attacks and data corruption.

#### Acceptance Criteria

1. WHEN any API endpoint receives a request, THE FlipBook System SHALL validate that the User is authenticated using NextAuth session verification
2. WHEN an API endpoint receives file upload data, THE FlipBook System SHALL validate file size, MIME type, and file extension
3. WHEN an API endpoint receives user input, THE FlipBook System SHALL sanitize and validate all parameters to prevent SQL injection and XSS attacks
4. WHEN a User attempts to access or modify a resource, THE FlipBook System SHALL verify that the User owns the resource or has permission to access it
5. IF an API request fails validation, THEN THE FlipBook System SHALL return an appropriate HTTP error code (400, 401, 403, or 404) with a descriptive error message

### Requirement 10: Production Deployment Configuration

**User Story:** As a developer, I want the application to be configured for production deployment on Vercel, so that it can be accessed by users reliably and securely.

#### Acceptance Criteria

1. WHEN the application is deployed to production, THE FlipBook System SHALL use HTTPS for all connections
2. WHEN the application runs in production, THE FlipBook System SHALL use environment variables for all sensitive configuration including database URLs and API keys
3. THE FlipBook System SHALL configure CORS policies to allow requests only from the application domain
4. THE FlipBook System SHALL set secure HTTP-only cookies for session management in production
5. WHEN the application is built for production, THE FlipBook System SHALL optimize assets and enable Next.js production optimizations
