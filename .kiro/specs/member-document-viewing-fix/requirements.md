# Requirements Document

## Introduction

This feature addresses critical technical issues preventing member document viewing in the Flipbook project. The system currently fails due to Prisma import errors in route handlers and CORS errors when the browser attempts to fetch Supabase Storage URLs with credentials. These issues prevent members from accessing their purchased content in MyJstudyroom, creating a broken user experience.

## Glossary

- **Route Handler**: Next.js 15 App Router API route files that handle HTTP requests
- **Prisma Client**: Database ORM client used for database operations
- **CORS (Cross-Origin Resource Sharing)**: Browser security mechanism that blocks cross-origin requests with credentials
- **Supabase Storage**: Cloud storage service used for storing document page images
- **Member Viewer**: The document viewing interface accessible to authenticated members
- **MyJstudyroom**: Member's personal collection of purchased documents
- **API Proxy Endpoint**: Internal API route that fetches resources server-side to avoid CORS issues
- **Signed URL**: Time-limited URL for accessing private storage resources

## Requirements

### Requirement 1

**User Story:** As a developer, I want Prisma imports to work correctly in all route handlers, so that database operations can be performed without build errors.

#### Acceptance Criteria

1. WHEN any route handler imports Prisma THEN the system SHALL resolve the import from '@/lib/prisma' without errors
2. WHEN the project builds THEN the system SHALL not produce "Module not found" errors for Prisma imports
3. WHEN tsconfig.json is configured THEN the system SHALL include proper path mapping for '@/*' to './*'
4. WHEN lib/prisma.ts exists THEN the system SHALL export a default PrismaClient singleton instance
5. WHEN route handlers use Prisma THEN the system SHALL use the correct import syntax: `import prisma from "@/lib/prisma"`

### Requirement 2

**User Story:** As a member, I want to view my purchased documents without CORS errors, so that I can access the content I've paid for.

#### Acceptance Criteria

1. WHEN a member opens a document viewer THEN the system SHALL load all page images without CORS errors
2. WHEN the browser requests page images THEN the system SHALL NOT include credentials in cross-origin requests
3. WHEN page images are loaded THEN the system SHALL use an internal API proxy to fetch images server-side
4. WHEN the API proxy fetches images THEN the system SHALL verify member access before returning image data
5. WHEN images are served THEN the system SHALL include appropriate Content-Type and cache headers

### Requirement 3

**User Story:** As a member, I want the document viewer to work on both localhost and production, so that I have consistent access across environments.

#### Acceptance Criteria

1. WHEN accessing the viewer on localhost THEN the system SHALL load images without CORS errors
2. WHEN accessing the viewer on production THEN the system SHALL load images without CORS errors
3. WHEN the API proxy runs THEN the system SHALL work with both development and production Supabase configurations
4. WHEN images are cached THEN the system SHALL include appropriate cache headers for performance
5. WHEN the viewer loads THEN the system SHALL display 200 status responses for all image requests

### Requirement 4

**User Story:** As a system administrator, I want secure image access controls, so that only authorized members can view document pages.

#### Acceptance Criteria

1. WHEN a member requests a page image THEN the system SHALL verify the member is authenticated
2. WHEN verifying access THEN the system SHALL confirm the member owns or has purchased the document
3. WHEN access is denied THEN the system SHALL return appropriate HTTP error codes (401, 403)
4. WHEN serving images THEN the system SHALL use server-side Supabase client with service role permissions
5. WHEN images are requested THEN the system SHALL validate itemId and pageNumber parameters

### Requirement 5

**User Story:** As a developer, I want the member viewer architecture to be maintainable, so that future updates don't break the viewing functionality.

#### Acceptance Criteria

1. WHEN implementing the API proxy THEN the system SHALL follow RESTful URL patterns
2. WHEN handling errors THEN the system SHALL provide clear error messages for debugging
3. WHEN the viewer client updates THEN the system SHALL remove direct Supabase Storage URL fetching
4. WHEN the proxy endpoint is created THEN the system SHALL include proper TypeScript types
5. WHEN the implementation is complete THEN the system SHALL maintain backward compatibility with existing viewer features
