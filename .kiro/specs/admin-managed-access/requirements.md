# Admin-Managed Access Control - Requirements

## Introduction

Transform the FlipBook DRM application from a self-service registration model to an admin-managed access control system where all users must request access and be manually approved by the administrator.

## Glossary

- **System**: The FlipBook DRM web application
- **Admin**: The platform owner (sivaramj83@gmail.com) with full control
- **Platform User**: A user who can upload, manage, and share protected documents
- **Reader User**: A user who can only view documents shared with them
- **Access Request**: A formal request submitted by a visitor to gain access to the platform
- **Landing Page**: The public-facing homepage explaining the product
- **Admin Dashboard**: The administrative interface for managing users and access requests

## Requirements

### Requirement 1: User Role Management

**User Story:** As the system administrator, I want a role-based access control system so that I can manage different types of users with appropriate permissions.

#### Acceptance Criteria

1. THE System SHALL support three distinct user roles: ADMIN, PLATFORM_USER, and READER_USER
2. WHEN a user is created, THE System SHALL assign exactly one role to that user
3. THE System SHALL store the user's role in the database and include it in authentication sessions
4. THE System SHALL default new users to READER_USER role unless explicitly specified otherwise
5. THE System SHALL ensure that the email sivaramj83@gmail.com has ADMIN role

### Requirement 2: Access Request Submission

**User Story:** As a visitor, I want to request access to the platform so that I can explain my use case and be considered for approval.

#### Acceptance Criteria

1. WHEN a visitor accesses the landing page, THE System SHALL display a "Request Access" form
2. THE System SHALL require the visitor to provide: email address and purpose description
3. THE System SHALL allow the visitor to optionally provide: name, number of documents, number of users, desired user type, and additional notes
4. WHEN the visitor submits the form, THE System SHALL validate all required fields
5. WHEN validation passes, THE System SHALL create an AccessRequest record with status "PENDING"
6. WHEN an AccessRequest is created, THE System SHALL send notification emails to support@jstudyroom.dev and sivaramj83@gmail.com
7. WHEN the submission succeeds, THE System SHALL display a confirmation message to the visitor
8. THE System SHALL implement rate limiting to prevent spam submissions

### Requirement 3: Admin Notification

**User Story:** As the administrator, I want to receive email notifications when someone requests access so that I can review and respond promptly.

#### Acceptance Criteria

1. WHEN an AccessRequest is created, THE System SHALL send an email to support@jstudyroom.dev
2. WHEN an AccessRequest is created, THE System SHALL send an email to sivaramj83@gmail.com
3. THE System SHALL include all submitted information in the notification email
4. THE System SHALL include a link to the admin dashboard in the notification email
5. THE System SHALL format the email using HTML with clear, readable layout

### Requirement 4: Admin Dashboard Access

**User Story:** As the administrator, I want a dedicated admin dashboard so that I can manage access requests and users.

#### Acceptance Criteria

1. THE System SHALL provide an admin dashboard accessible at /admin
2. WHEN a user with role ADMIN accesses /admin, THE System SHALL display the admin dashboard
3. WHEN a user without role ADMIN attempts to access /admin, THE System SHALL deny access with 403 status
4. THE System SHALL display two main sections: Access Requests and Users Management
5. THE System SHALL protect all admin API endpoints with role verification

### Requirement 5: Access Request Management

**User Story:** As the administrator, I want to view and manage access requests so that I can approve or reject applicants.

#### Acceptance Criteria

1. THE System SHALL display all AccessRequest records in a table format
2. THE System SHALL allow filtering by status: PENDING, APPROVED, REJECTED, CLOSED
3. THE System SHALL display: creation date, email, purpose summary, document count, user count, requested role, and status
4. WHEN the administrator clicks a request, THE System SHALL display full details
5. THE System SHALL provide actions: "Approve & Create User", "Mark as Rejected", "Mark as Closed"

### Requirement 6: User Creation and Approval

**User Story:** As the administrator, I want to approve access requests and create user accounts so that approved applicants can access the platform.

#### Acceptance Criteria

1. WHEN the administrator approves a request, THE System SHALL display a user creation form
2. THE System SHALL allow the administrator to: confirm email and name, select user role, set initial password, specify price plan, add internal notes
3. WHEN the administrator submits the form, THE System SHALL create a User record with hashed password
4. WHEN a User is created, THE System SHALL update the AccessRequest status to "APPROVED"
5. WHEN a User is created, THE System SHALL send an approval email to the user's email address
6. THE System SHALL include login credentials, role information, and pricing details in the approval email
7. THE System SHALL generate a secure random password if the administrator does not specify one

### Requirement 7: User Management

**User Story:** As the administrator, I want to manage existing users so that I can update their roles, plans, and credentials.

#### Acceptance Criteria

1. THE System SHALL display all User records in a table format
2. THE System SHALL display: email, role, price plan, and creation date for each user
3. THE System SHALL allow the administrator to edit: role, price plan, and internal notes
4. THE System SHALL allow the administrator to reset a user's password
5. WHEN a password is reset, THE System SHALL generate a new secure password
6. WHEN a password is reset, THE System SHALL send an email to the user with the new credentials
7. THE System SHALL allow the administrator to deactivate or delete users

### Requirement 8: Authentication Flow

**User Story:** As a user, I want to log in with credentials provided by the administrator so that I can access the platform.

#### Acceptance Criteria

1. THE System SHALL provide a login page at /login
2. THE System SHALL NOT provide a public registration page
3. WHEN a user submits login credentials, THE System SHALL verify email and password
4. WHEN authentication succeeds for ADMIN role, THE System SHALL redirect to /admin
5. WHEN authentication succeeds for PLATFORM_USER role, THE System SHALL redirect to /dashboard
6. WHEN authentication succeeds for READER_USER role, THE System SHALL redirect to /inbox or reader dashboard
7. WHEN authentication fails, THE System SHALL display an error message
8. THE System SHALL include the user's role in the JWT token and session

### Requirement 9: Role-Based Dashboard Access

**User Story:** As a platform user, I want access to document management features so that I can upload and share documents.

#### Acceptance Criteria

1. WHEN a PLATFORM_USER accesses the dashboard, THE System SHALL display document upload functionality
2. WHEN a PLATFORM_USER accesses the dashboard, THE System SHALL display document management features
3. WHEN a PLATFORM_USER accesses the dashboard, THE System SHALL display sharing and analytics features
4. THE System SHALL NOT display admin controls to PLATFORM_USER
5. THE System SHALL verify PLATFORM_USER role on all document management API endpoints

### Requirement 10: Reader User Experience

**User Story:** As a reader user, I want to view documents shared with me so that I can access content without uploading capabilities.

#### Acceptance Criteria

1. WHEN a READER_USER logs in, THE System SHALL redirect to a reader dashboard
2. THE System SHALL display only documents shared with the READER_USER
3. THE System SHALL allow READER_USER to view shared documents
4. THE System SHALL NOT display upload or document management features to READER_USER
5. THE System SHALL deny READER_USER access to document upload API endpoints
6. THE System SHALL deny READER_USER access to document management API endpoints

### Requirement 11: Landing Page

**User Story:** As a visitor, I want to understand the platform's value proposition so that I can decide whether to request access.

#### Acceptance Criteria

1. THE System SHALL display a landing page at the root URL (/)
2. THE System SHALL explain the platform as a secure FlipBook/DRM platform for sharing PDFs
3. THE System SHALL describe the two user types: platform users and reader users
4. THE System SHALL highlight key benefits and features
5. THE System SHALL display the brand name: "FlipBook DRM – jstudyroom platform"
6. THE System SHALL provide a prominent "Request Access" call-to-action button
7. WHEN the visitor clicks "Request Access", THE System SHALL display or scroll to the access request form

### Requirement 12: Email Integration

**User Story:** As the system, I want to send professional emails via Resend so that users and administrators receive timely notifications.

#### Acceptance Criteria

1. THE System SHALL use support@jstudyroom.dev as the FROM address for all emails
2. THE System SHALL send access request notifications using Resend
3. THE System SHALL send user approval emails using Resend
4. THE System SHALL send password reset emails using Resend
5. THE System SHALL use HTML templates for all emails
6. THE System SHALL align email branding with the application design
7. THE System SHALL handle email sending failures gracefully

### Requirement 13: Security and Access Control

**User Story:** As the system administrator, I want robust security controls so that unauthorized users cannot access restricted features.

#### Acceptance Criteria

1. THE System SHALL verify user role on every admin route request
2. THE System SHALL verify user role on every admin API endpoint request
3. THE System SHALL NOT expose plain passwords in logs
4. THE System SHALL hash all passwords using bcrypt before storage
5. THE System SHALL implement rate limiting on the access request endpoint
6. THE System SHALL log all authentication attempts
7. THE System SHALL log all admin actions

### Requirement 14: Database Schema

**User Story:** As the system, I want a properly structured database schema so that user roles and access requests are stored correctly.

#### Acceptance Criteria

1. THE System SHALL define a UserRole enum with values: ADMIN, PLATFORM_USER, READER_USER
2. THE System SHALL extend the User model to include: role, pricePlan, and notes fields
3. THE System SHALL create an AccessRequest model with fields: email, name, purpose, numDocuments, numUsers, requestedRole, extraMessage, status
4. THE System SHALL set default status to "PENDING" for new AccessRequest records
5. THE System SHALL create database migrations for schema changes
6. THE System SHALL ensure backward compatibility with existing user data

### Requirement 15: Admin Seeding

**User Story:** As the system administrator, I want my admin account to be automatically created so that I can access the admin dashboard immediately.

#### Acceptance Criteria

1. THE System SHALL provide a seeding mechanism for the admin account
2. WHEN the seed script runs, THE System SHALL create a user with email sivaramj83@gmail.com
3. WHEN the seed script runs, THE System SHALL set the user's role to ADMIN
4. THE System SHALL read the admin password from environment variable ADMIN_SEED_PASSWORD
5. THE System SHALL skip creation if the admin user already exists
6. THE System SHALL hash the admin password before storage
