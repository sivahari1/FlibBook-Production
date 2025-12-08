# PDF Blank Pages Fix - Requirements

## Introduction

The PDF to image conversion system is producing blank white images (~3-4 KB) instead of rendered PDF content. The flipbook viewer loads all page URLs successfully but displays only white pages. This is a critical rendering issue in the server-side PDF conversion pipeline using pdfjs-dist in Node.js environment.

## Glossary

- **PDF Conversion**: Server-side process that converts PDF pages to JPEG images using pdfjs-dist
- **Canvas Rendering**: The process of rendering PDF content to a Node.js canvas using node-canvas
- **Supabase Storage**: Cloud storage bucket (document-pages) where converted page images are stored
- **Blank Pages**: Images that are completely white with very small file sizes (~3-4 KB), indicating no content was rendered
- **FlipBook Viewer**: React component that displays the converted page images in a page-turn interface

## Requirements

### Requirement 1: PDF Content Must Render to Canvas

**User Story:** As a system, I want to correctly render PDF pages to canvas buffers, so that the exported images contain actual document content.

#### Acceptance Criteria

1. WHEN pdfjs-dist loads a PDF page THEN the system SHALL create a canvas with correct dimensions based on viewport
2. WHEN rendering a page to canvas THEN the system SHALL await the render promise completion before exporting
3. WHEN the canvas is exported THEN the system SHALL contain visible PDF content, not blank white space
4. WHEN using node-canvas THEN the system SHALL properly configure the 2D context for PDF rendering
5. WHEN pdfjs-dist renders THEN the system SHALL use correct worker configuration for Node.js environment

### Requirement 2: Image Export Must Produce Valid JPEGs

**User Story:** As a system, I want to export canvas content as valid JPEG images with reasonable file sizes, so that users see actual document pages.

#### Acceptance Criteria

1. WHEN exporting canvas to JPEG THEN the system SHALL produce images larger than 10 KB for typical pages
2. WHEN using Sharp for optimization THEN the system SHALL receive valid image data from canvas
3. WHEN converting to JPEG THEN the system SHALL use quality settings that preserve readability (85% quality)
4. WHEN resizing images THEN the system SHALL maintain aspect ratio and content visibility
5. WHEN uploading to storage THEN the system SHALL verify image file size is reasonable (> 10 KB)

### Requirement 3: pdfjs-dist Must Work in Node.js

**User Story:** As a developer, I want pdfjs-dist to work correctly in Node.js environment, so that server-side PDF rendering succeeds.

#### Acceptance Criteria

1. WHEN initializing pdfjs-dist THEN the system SHALL use the legacy build compatible with Node.js
2. WHEN loading PDF documents THEN the system SHALL provide data as Uint8Array format
3. WHEN rendering pages THEN the system SHALL not assume DOM/browser APIs are available
4. WHEN using canvas THEN the system SHALL use node-canvas, not browser Canvas API
5. WHEN pdfjs-dist requires fonts THEN the system SHALL configure useSystemFonts: true

### Requirement 4: Full-Screen Flipbook Display

**User Story:** As a user, I want the flipbook to use my entire screen, so that I can clearly see the document content.

#### Acceptance Criteria

1. WHEN opening flipbook viewer THEN the system SHALL use 100vw width and 100vh height
2. WHEN displaying pages THEN the system SHALL scale images to fit viewport while maintaining aspect ratio
3. WHEN on mobile devices THEN the system SHALL use full screen without unnecessary margins
4. WHEN on desktop THEN the system SHALL center pages and use available space efficiently
5. WHEN zooming THEN the system SHALL maintain content visibility and quality

### Requirement 5: Diagnostic Utility for Verification

**User Story:** As a developer, I want a utility to verify converted pages, so that I can quickly diagnose conversion issues.

#### Acceptance Criteria

1. WHEN running diagnostic script THEN the system SHALL list all pages for a given document ID
2. WHEN checking page files THEN the system SHALL display file size in KB for each page
3. WHEN verifying pages THEN the system SHALL show public URLs for manual inspection
4. WHEN pages are missing THEN the system SHALL clearly indicate which pages failed
5. WHEN file sizes are suspiciously small THEN the system SHALL flag them as potentially blank

## Success Criteria

1. **Visible Content**: Converted page images contain actual PDF content, not blank white pages
2. **Reasonable File Sizes**: Page images are > 50 KB for typical documents (not 3-4 KB)
3. **Successful Conversion**: 100% of PDF pages convert successfully without blank output
4. **Full-Screen Display**: Flipbook uses entire viewport (100vw x 100vh) with responsive scaling
5. **Quick Verification**: Diagnostic utility allows instant verification of page conversion quality

## Out of Scope

- OCR or text extraction from PDFs
- PDF editing or manipulation
- Real-time collaborative viewing
- Advanced PDF features (forms, annotations, etc.)
- PDF compression or optimization beyond image quality

## Dependencies

- pdfjs-dist (legacy build for Node.js compatibility)
- node-canvas for server-side canvas rendering
- Sharp for image optimization
- Supabase Storage for page image storage
- Next.js App Router for API routes

## Constraints

- Must work in Node.js environment (no browser APIs)
- Must handle PDFs up to 100 pages efficiently
- Must produce images at 1200x1600 resolution
- Must maintain backward compatibility with existing documents
- Must not break existing flipbook viewer functionality

## Known Issues

1. **Current Behavior**: PDF pages convert to blank white images (~3-4 KB)
2. **Root Cause**: Canvas rendering not completing before export, or incorrect pdfjs-dist configuration
3. **Impact**: Users see blank pages in flipbook viewer despite successful URL loading
4. **Urgency**: Critical - blocks all PDF preview functionality
