# Preview Content Rendering Fix - Requirements

## Introduction

The document preview system is experiencing critical rendering issues where users see blank pages with only watermarks visible, no actual PDF content is displayed, and the CLIENT_FETCH_ERROR from NextAuth has been resolved but content still doesn't render properly.

## Glossary

- **Preview Content**: The actual document pages (PDF images, videos, images, or links) that should be visible to users
- **Page Conversion**: The process of converting PDF documents into individual page images stored in Supabase Storage
- **Signed URLs**: Temporary authenticated URLs for accessing content from Supabase Storage
- **FlipBook Viewer**: The component that displays PDF pages in a book-like interface
- **Content Rendering**: The process of displaying actual document content in the browser

## Requirements

### Requirement 1: PDF Content Must Be Visible

**User Story:** As a user, I want to see the actual content of my PDF document in the preview, so that I can review what I'm sharing or viewing.

#### Acceptance Criteria

1. WHEN a user opens a PDF preview THEN the system SHALL display all converted page images
2. WHEN page images are loading THEN the system SHALL show a loading indicator
3. WHEN page images fail to load THEN the system SHALL display a specific error message with retry option
4. WHEN no pages exist THEN the system SHALL automatically trigger PDF conversion
5. WHEN conversion completes THEN the system SHALL immediately display the converted pages

### Requirement 2: Automatic PDF Conversion

**User Story:** As a user, I want my PDFs to be automatically converted to viewable pages, so that I don't have to manually trigger conversion.

#### Acceptance Criteria

1. WHEN a PDF is uploaded THEN the system SHALL automatically convert it to page images
2. WHEN conversion is in progress THEN the system SHALL show conversion status
3. WHEN conversion completes THEN the system SHALL store page URLs in the database
4. WHEN conversion fails THEN the system SHALL log the error and allow retry
5. WHEN a preview is opened for an unconverted PDF THEN the system SHALL trigger conversion automatically

### Requirement 3: Proper API Response Handling

**User Story:** As a developer, I want all API routes to return proper JSON responses, so that the client can handle them correctly without CLIENT_FETCH_ERROR.

#### Acceptance Criteria

1. WHEN an API route is called without authentication THEN the system SHALL return 401 JSON response
2. WHEN an API route encounters an error THEN the system SHALL return JSON error response with message
3. WHEN an API route succeeds THEN the system SHALL return JSON success response with data
4. WHEN middleware intercepts a request THEN the system SHALL allow API routes to handle their own authentication
5. WHEN NextAuth makes internal API calls THEN the system SHALL return valid JSON responses

### Requirement 4: Full Viewport Display

**User Story:** As a user, I want the preview to use my entire screen, so that I can see the content clearly without unnecessary whitespace.

#### Acceptance Criteria

1. WHEN preview opens THEN the system SHALL use at least 90% of viewport width
2. WHEN preview opens THEN the system SHALL use at least 95% of viewport height
3. WHEN browser is resized THEN the system SHALL adjust content to fill available space
4. WHEN content is smaller than viewport THEN the system SHALL center it appropriately
5. WHEN viewing on mobile THEN the system SHALL use full screen width

### Requirement 5: Watermark Default Behavior

**User Story:** As a user, I want watermarks to be disabled by default, so that I can preview my content cleanly unless I explicitly enable watermarks.

#### Acceptance Criteria

1. WHEN no watermark parameter is provided THEN the system SHALL display content without watermark
2. WHEN watermark parameter is "false" THEN the system SHALL not display watermark
3. WHEN watermark parameter is "true" THEN the system SHALL display watermark with user's email
4. WHEN watermark is disabled THEN the system SHALL not render any watermark DOM elements
5. WHEN watermark is enabled THEN the system SHALL overlay it without obscuring content

### Requirement 6: Database and Storage Integration

**User Story:** As a system, I want to properly store and retrieve converted page images, so that previews load quickly and reliably.

#### Acceptance Criteria

1. WHEN pages are converted THEN the system SHALL store them in Supabase Storage bucket "document-pages"
2. WHEN pages are stored THEN the system SHALL save their URLs in the database
3. WHEN pages are requested THEN the system SHALL generate signed URLs with 1-hour expiration
4. WHEN signed URLs expire THEN the system SHALL regenerate them on next request
5. WHEN storage bucket doesn't exist THEN the system SHALL create it automatically

## Success Criteria

1. **Content Visibility**: Users can see actual PDF pages, not just blank pages with watermarks
2. **No CLIENT_FETCH_ERROR**: All API calls return proper JSON responses
3. **Automatic Conversion**: PDFs are converted automatically without manual intervention
4. **Full Screen Display**: Preview uses 90%+ of viewport width and 95%+ of height
5. **Watermark Control**: Watermarks are disabled by default and only show when explicitly enabled
6. **Fast Loading**: Converted pages load within 2 seconds
7. **Error Recovery**: Clear error messages with retry options when issues occur

## Out of Scope

- Real-time collaboration features
- Advanced PDF editing capabilities
- OCR or text extraction from PDFs
- PDF compression or optimization
- Multi-user simultaneous viewing

## Dependencies

- Supabase Storage for page image storage
- Supabase Postgres for page URL storage
- NextAuth for authentication
- PDF conversion library (pdf-lib or similar)
- Next.js App Router and Server Components

## Constraints

- Must work with existing authentication system
- Must maintain backward compatibility with existing documents
- Must not break existing share links
- Must work on both desktop and mobile browsers
- Must handle PDFs up to 100 pages efficiently
