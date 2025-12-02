# Design Document

## Overview

This design addresses a critical bug in the document preview functionality caused by improper handling of async route parameters in Next.js 15. The fix involves updating API routes to properly await the `params` Promise before accessing document IDs and other dynamic route segments.

The root cause is that Next.js 15 changed the `params` object from a synchronous object to an async Promise, requiring all route handlers to await it before accessing properties. The current code attempts to access `params.id` directly, causing Prisma to receive an undefined value and throw a validation error.

## Architecture

### Current Flow (Broken)
1. User clicks preview button → navigates to `/dashboard/documents/[id]/preview`
2. Server component calls `getDocumentForPreview(documentId, userId)` ✓ (works)
3. Client component fetches pages via `/api/documents/[id]/pages`
4. API route accesses `params.id` directly (synchronously) ✗ (fails - params is a Promise)
5. Prisma receives undefined ID → throws validation error
6. User sees "Failed to Load Document" error

### Fixed Flow
1. User clicks preview button → navigates to `/dashboard/documents/[id]/preview`
2. Server component awaits params, calls `getDocumentForPreview(documentId, userId)` ✓
3. Client component fetches pages via `/api/documents/[id]/pages`
4. API route awaits params Promise, then accesses `params.id` ✓
5. Prisma receives valid ID → returns document data ✓
6. User sees document preview with watermark settings ✓

## Components and Interfaces

### API Route Handler
**File:** `app/api/documents/[id]/pages/route.ts`

**Current Signature (Broken):**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
)
```

**Fixed Signature:**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)
```

**Key Changes:**
- Change params type from `{ id: string }` to `Promise<{ id: string }>`
- Add `const { id: documentId } = await params;` at the start of the function
- Replace all references to `params.id` with `documentId`

### Other Affected Routes
The following routes also use dynamic parameters and need the same fix:
- `app/api/documents/[id]/route.ts`
- `app/api/documents/[id]/share/route.ts`
- `app/api/analytics/[documentId]/route.ts`
- `app/api/pages/[docId]/[pageNum]/route.ts`
- `app/api/share/[shareKey]/route.ts`
- `app/api/share/[shareKey]/view/route.ts`
- `app/api/share/[shareKey]/track/route.ts`
- `app/api/share/[shareKey]/verify-password/route.ts`
- `app/api/share/[shareKey]/access/route.ts`
- `app/api/share/link/[id]/revoke/route.ts`
- `app/api/share/email/[id]/revoke/route.ts`
- `app/api/share/email/[id]/view/route.ts`
- `app/api/admin/bookshop/[id]/route.ts`
- `app/api/admin/users/[id]/route.ts`
- `app/api/admin/users/[id]/reset-password/route.ts`
- `app/api/admin/members/[id]/route.ts`
- `app/api/admin/members/[id]/reset-password/route.ts`
- `app/api/admin/members/[id]/toggle-active/route.ts`
- `app/api/admin/access-requests/[id]/route.ts`
- `app/api/member/my-jstudyroom/[id]/route.ts`
- `app/api/annotations/[id]/route.ts`
- `app/api/media/stream/[annotationId]/route.ts`

## Data Models

No database schema changes required. This is purely a code-level fix for parameter handling.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptence Criteria Testing Prework:

1.1. WHEN a user clicks to preview an uploaded document THEN the system SHALL load the document preview page without Prisma validation errors
Thoughts: This is testing that the preview functionality works end-to-end. We can test this by making a request to the preview page with a valid document ID and ensuring no Prisma errors occur. This applies to all documents, not just specific ones.
Testable: yes - property

1.2. WHEN the preview page loads THEN the system SHALL correctly fetch the document ID from route parameters
Thoughts: This is testing that parameter extraction works correctly. We can test this by generating random document IDs, making requests, and verifying the correct ID is extracted and used in queries.
Testable: yes - property

1.3. WHEN the API route processes the request THEN the system SHALL await the params Promise before accessing the document ID
Thoughts: This is testing implementation details about how params are handled. We can verify this by checking that the params object is awaited before any property access.
Testable: yes - property

1.4. WHEN the document pages are fetched THEN the system SHALL return the correct page data for the flipbook viewer
Thoughts: This is testing that the API returns valid page data. We can test this by generating random documents with pages and verifying the response structure matches expectations.
Testable: yes - property

1.5. WHEN any error occurs THEN the system SHALL display a clear, user-friendly error message
Thoughts: This is testing error handling across all error scenarios. We can test this by generating various error conditions and verifying appropriate error messages are returned.
Testable: yes - property

2.1. WHEN an API route receives params THEN the system SHALL await the params Promise before accessing any properties
Thoughts: This is the same as 1.3 - testing that params are properly awaited. This is redundant.
Testable: yes - property (redundant with 1.3)

2.2. WHEN multiple API routes use dynamic parameters THEN the system SHALL consistently handle them as Promises
Thoughts: This is testing consistency across all routes. We can test this by checking all routes with dynamic parameters and verifying they all await params.
Testable: yes - property

2.3. WHEN the code is updated THEN the system SHALL maintain backward compatibility with existing functionality
Thoughts: This is testing that the fix doesn't break existing features. We can test this by running existing test suites and verifying all pass.
Testable: yes - property

2.4. WHEN TypeScript compilation occurs THEN the system SHALL have no type errors related to parameter handling
Thoughts: This is testing TypeScript compilation. We can verify this by running the TypeScript compiler and checking for errors.
Testable: yes - example

### Property Reflection:

After reviewing the properties:
- Property 1.3 and 2.1 are identical - both test that params are awaited before access. We should keep only one.
- Property 1.1 is a high-level end-to-end test that subsumes several lower-level properties
- Property 2.3 is very broad and covered by existing test suites
- Property 2.4 is a compilation check, not a runtime property

**Consolidated Properties:**
- Keep 1.1 (end-to-end preview functionality)
- Keep 1.2 (parameter extraction correctness)
- Keep 1.3 (params awaiting - remove 2.1 as duplicate)
- Keep 1.4 (page data structure)
- Keep 1.5 (error message clarity)
- Keep 2.2 (consistency across routes)
- Keep 2.4 as an example test (TypeScript compilation)

### Correctness Properties:

Property 1: Preview loads without Prisma errors
*For any* valid document ID and authenticated user who owns that document, requesting the preview page should successfully load without Prisma validation errors
**Validates: Requirements 1.1**

Property 2: Parameter extraction correctness
*For any* API route with dynamic parameters, the extracted parameter values should match the values in the request URL
**Validates: Requirements 1.2**

Property 3: Params Promise awaiting
*For any* API route handler that receives params, the params Promise should be awaited before accessing any of its properties
**Validates: Requirements 1.3, 2.1**

Property 4: Page data structure validity
*For any* document with cached pages, the API response should contain an array of page objects with pageNumber, pageUrl, and dimensions properties
**Validates: Requirements 1.4**

Property 5: Error message clarity
*For any* error condition (404, 403, 500), the API response should include a success: false flag and a descriptive message field
**Validates: Requirements 1.5**

Property 6: Consistent parameter handling
*For all* API routes with dynamic parameters, the parameter handling pattern (awaiting params Promise) should be consistent
**Validates: Requirements 2.2**

## Error Handling

### Error Scenarios

1. **Document Not Found (404)**
   - Cause: Invalid document ID or document deleted
   - Response: `{ success: false, message: 'Document not found' }`
   - Status: 404

2. **Access Denied (403)**
   - Cause: User doesn't own the document
   - Response: `{ success: false, message: 'Access denied' }`
   - Status: 403

3. **Unauthorized (401)**
   - Cause: No valid session
   - Response: `{ success: false, message: 'Unauthorized' }`
   - Status: 401

4. **Invalid Document Type (400)**
   - Cause: Document is not a PDF
   - Response: `{ success: false, message: 'Only PDF documents have pages' }`
   - Status: 400

5. **Server Error (500)**
   - Cause: Unexpected error during processing
   - Response: `{ success: false, message: error.message }`
   - Status: 500

All errors should be logged to the console with full error details for debugging.

## Testing Strategy

### Unit Tests
- Test parameter extraction from route handlers
- Test error response formatting
- Test document ownership verification
- Test page data transformation

### Property-Based Tests
We will use **fast-check** (JavaScript/TypeScript property-based testing library) for property-based testing.

Each property-based test should run a minimum of 100 iterations to ensure thorough coverage of the input space.

Property tests will be tagged with comments referencing the design document:
- Format: `// Feature: document-preview-fix, Property N: [property description]`

### Integration Tests
- Test full preview flow from page load to document display
- Test error scenarios (missing document, wrong user, etc.)
- Test with various document types and states
- Verify TypeScript compilation succeeds

### Manual Testing
- Click preview button on uploaded document
- Verify preview page loads without errors
- Verify watermark settings work
- Verify flipbook viewer displays correctly
