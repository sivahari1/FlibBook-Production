# Requirements Document

## Introduction

This specification defines the implementation of Row Level Security (RLS) policies for all database tables in the JStudyroom platform. Currently, only Supabase Storage buckets have RLS policies, leaving database tables vulnerable to unauthorized direct access through Supabase's PostgREST API. This creates a security gap where authenticated users could potentially query tables directly and access data they shouldn't see.

## Glossary

- **RLS (Row Level Security)**: PostgreSQL feature that restricts which rows users can access in database queries
- **PostgREST API**: Supabase's automatic REST API that exposes database tables
- **Policy**: A rule that determines which rows a user can SELECT, INSERT, UPDATE, or DELETE
- **auth.uid()**: Supabase function that returns the authenticated user's ID
- **System**: The JStudyroom platform database
- **Admin User**: A user with userRole = 'ADMIN'
- **Member User**: A user with userRole = 'MEMBER'
- **Platform User**: A user with userRole = 'PLATFORM_USER'
- **Document Owner**: The user who created a document (userId field)
- **Shared Document**: A document that has been shared via DocumentShare or ShareLink

## Requirements

### Requirement 1

**User Story:** As a security administrator, I want all database tables to have RLS enabled, so that data access is controlled at the database level and not just the application level.

#### Acceptance Criteria

1. WHEN RLS is enabled on a table, THEN the System SHALL prevent all direct access unless explicitly allowed by a policy
2. WHEN a table has RLS enabled, THEN the System SHALL enforce policies for all operations (SELECT, INSERT, UPDATE, DELETE)
3. WHEN RLS policies are applied, THEN the System SHALL maintain backward compatibility with existing application code
4. WHEN RLS is enabled, THEN the System SHALL allow service role access for administrative operations
5. WHEN policies are created, THEN the System SHALL use auth.uid() to identify the authenticated user

### Requirement 2

**User Story:** As a user, I want to access only my own user data, so that my personal information remains private.

#### Acceptance Criteria

1. WHEN a user queries the users table, THEN the System SHALL return only their own user record
2. WHEN an admin queries the users table, THEN the System SHALL return all user records
3. WHEN a user updates the users table, THEN the System SHALL allow updates only to their own record
4. WHEN a user attempts to delete from the users table, THEN the System SHALL prevent the deletion
5. WHEN an admin updates the users table, THEN the System SHALL allow updates to any user record

### Requirement 3

**User Story:** As a document owner, I want to control access to my documents, so that only authorized users can view or modify them.

#### Acceptance Criteria

1. WHEN a user queries documents, THEN the System SHALL return documents they own, documents shared with them, and documents accessible via share links
2. WHEN a user creates a document, THEN the System SHALL set the userId to the authenticated user's ID
3. WHEN a user updates a document, THEN the System SHALL allow updates only if they are the document owner
4. WHEN a user deletes a document, THEN the System SHALL allow deletion only if they are the document owner
5. WHEN an admin queries documents, THEN the System SHALL return all documents

### Requirement 4

**User Story:** As a user, I want my document pages to be accessible only when I have access to the parent document, so that page-level data remains secure.

#### Acceptance Criteria

1. WHEN a user queries document_pages, THEN the System SHALL return pages only for documents they can access
2. WHEN a user creates document pages, THEN the System SHALL verify they own the parent document
3. WHEN a user updates document pages, THEN the System SHALL verify they own the parent document
4. WHEN a user deletes document pages, THEN the System SHALL verify they own the parent document
5. WHEN document access is revoked, THEN the System SHALL automatically prevent access to associated pages

### Requirement 5

**User Story:** As a user, I want my share links to be private, so that only I can manage my sharing settings.

#### Acceptance Criteria

1. WHEN a user queries share_links, THEN the System SHALL return only share links they created
2. WHEN a user creates a share link, THEN the System SHALL set the userId to the authenticated user's ID
3. WHEN a user updates a share link, THEN the System SHALL allow updates only to their own share links
4. WHEN a user deletes a share link, THEN the System SHALL allow deletion only of their own share links
5. WHEN an admin queries share_links, THEN the System SHALL return all share links

### Requirement 6

**User Story:** As a user, I want my document shares to be private, so that only involved parties can see sharing relationships.

#### Acceptance Criteria

1. WHEN a user queries document_shares, THEN the System SHALL return shares they created or shares where they are the recipient
2. WHEN a user creates a document share, THEN the System SHALL verify they own the document being shared
3. WHEN a user updates a document share, THEN the System SHALL allow updates only if they created the share
4. WHEN a user deletes a document share, THEN the System SHALL allow deletion only if they created the share
5. WHEN a share recipient queries document_shares, THEN the System SHALL include shares where their email matches sharedWithEmail

### Requirement 7

**User Story:** As a user, I want my verification tokens to be private, so that my authentication security is maintained.

#### Acceptance Criteria

1. WHEN a user queries verification_tokens, THEN the System SHALL return only tokens associated with their user ID
2. WHEN the System creates a verification token, THEN the System SHALL set the userId to the target user's ID
3. WHEN a user attempts to update verification_tokens, THEN the System SHALL prevent the update
4. WHEN a user attempts to delete verification_tokens, THEN the System SHALL prevent the deletion
5. WHEN a token expires, THEN the System SHALL maintain the policy restrictions regardless of expiration status

### Requirement 8

**User Story:** As a user, I want my subscription data to be private, so that my payment information remains confidential.

#### Acceptance Criteria

1. WHEN a user queries subscriptions, THEN the System SHALL return only their own subscription records
2. WHEN a user creates a subscription, THEN the System SHALL set the userId to the authenticated user's ID
3. WHEN a user attempts to update subscriptions, THEN the System SHALL prevent the update
4. WHEN a user attempts to delete subscriptions, THEN the System SHALL prevent the deletion
5. WHEN an admin queries subscriptions, THEN the System SHALL return all subscription records

### Requirement 9

**User Story:** As a user, I want my payment records to be private, so that my transaction history is secure.

#### Acceptance Criteria

1. WHEN a user queries payments, THEN the System SHALL return only their own payment records
2. WHEN a user creates a payment, THEN the System SHALL set the userId to the authenticated user's ID
3. WHEN a user attempts to update payments, THEN the System SHALL prevent the update
4. WHEN a user attempts to delete payments, THEN the System SHALL prevent the deletion
5. WHEN an admin queries payments, THEN the System SHALL return all payment records

### Requirement 10

**User Story:** As a user, I want my study room items to be private, so that my purchased content remains confidential.

#### Acceptance Criteria

1. WHEN a user queries my_jstudyroom_items, THEN the System SHALL return only items they own
2. WHEN a user adds to my_jstudyroom_items, THEN the System SHALL set the userId to the authenticated user's ID
3. WHEN a user attempts to update my_jstudyroom_items, THEN the System SHALL prevent the update
4. WHEN a user deletes from my_jstudyroom_items, THEN the System SHALL allow deletion only of their own items
5. WHEN an admin queries my_jstudyroom_items, THEN the System SHALL return all items

### Requirement 11

**User Story:** As a user, I want view analytics to be accessible only to document owners, so that viewing statistics remain private.

#### Acceptance Criteria

1. WHEN a user queries view_analytics, THEN the System SHALL return analytics only for documents they own
2. WHEN the System creates view analytics, THEN the System SHALL allow creation for any authenticated user
3. WHEN a user attempts to update view_analytics, THEN the System SHALL prevent the update
4. WHEN a user attempts to delete view_analytics, THEN the System SHALL prevent the deletion
5. WHEN an admin queries view_analytics, THEN the System SHALL return all analytics records

### Requirement 12

**User Story:** As a user, I want my annotations to be controlled by visibility settings, so that I can choose who sees my notes.

#### Acceptance Criteria

1. WHEN a user queries document_annotations, THEN the System SHALL return annotations they created and public annotations on documents they can access
2. WHEN a user creates an annotation, THEN the System SHALL set the userId to the authenticated user's ID
3. WHEN a user updates an annotation, THEN the System SHALL allow updates only to annotations they created
4. WHEN a user deletes an annotation, THEN the System SHALL allow deletion only of annotations they created
5. WHEN visibility is set to public, THEN the System SHALL allow all users with document access to view the annotation

### Requirement 13

**User Story:** As an admin, I want to view all access requests, so that I can manage platform access effectively.

#### Acceptance Criteria

1. WHEN a user creates an access request, THEN the System SHALL allow creation for any authenticated or anonymous user
2. WHEN a user queries access_requests, THEN the System SHALL return only requests they created
3. WHEN an admin queries access_requests, THEN the System SHALL return all access requests
4. WHEN an admin updates an access request, THEN the System SHALL allow the update
5. WHEN a user attempts to update their own access request, THEN the System SHALL prevent the update

### Requirement 14

**User Story:** As an admin, I want to view all error logs, so that I can monitor system health and debug issues.

#### Acceptance Criteria

1. WHEN the System creates an error log, THEN the System SHALL allow creation for any authenticated user
2. WHEN a user queries error_logs, THEN the System SHALL return only logs associated with their user ID
3. WHEN an admin queries error_logs, THEN the System SHALL return all error logs
4. WHEN a user attempts to update error_logs, THEN the System SHALL prevent the update
5. WHEN a user attempts to delete error_logs, THEN the System SHALL prevent the deletion

### Requirement 15

**User Story:** As an admin, I want to manage bookshop items, so that I can control the platform's content catalog.

#### Acceptance Criteria

1. WHEN a user queries book_shop_items, THEN the System SHALL return only published items
2. WHEN an admin queries book_shop_items, THEN the System SHALL return all items including unpublished
3. WHEN an admin creates a book_shop_item, THEN the System SHALL allow the creation
4. WHEN an admin updates a book_shop_item, THEN the System SHALL allow the update
5. WHEN a non-admin attempts to create or update book_shop_items, THEN the System SHALL prevent the operation
