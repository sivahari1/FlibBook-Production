# Implementation Plan

- [x] 1. Fix primary document pages API route





  - Update `/api/documents/[id]/pages/route.ts` to await params Promise
  - Change params type signature to `Promise<{ id: string }>`
  - Extract document ID after awaiting params
  - Test the fix with document preview
  - _Requirements: 1.1, 1.2, 1.3, 2.1_

- [x] 1.1 Write property test for params awaiting


  - **Property 3: Params Promise awaiting**
  - **Validates: Requirements 1.3, 2.1**

- [x] 1.2 Write property test for parameter extraction


  - **Property 2: Parameter extraction correctness**
  - **Validates: Requirements 1.2**

- [x] 2. Fix document-related API routes





  - Update `/api/documents/[id]/route.ts` to await params
  - Update `/api/documents/[id]/share/route.ts` to await params
  - Update `/api/analytics/[documentId]/route.ts` to await params
  - Update `/api/pages/[docId]/[pageNum]/route.ts` to await params (multiple params)
  - _Requirements: 2.1, 2.2_

- [x] 3. Fix share-related API routes





  - Update `/api/share/[shareKey]/route.ts` to await params
  - Update `/api/share/[shareKey]/view/route.ts` to await params
  - Update `/api/share/[shareKey]/track/route.ts` to await params
  - Update `/api/share/[shareKey]/verify-password/route.ts` to await params
  - Update `/api/share/[shareKey]/access/route.ts` to await params
  - Update `/api/share/link/[id]/revoke/route.ts` to await params
  - Update `/api/share/email/[id]/revoke/route.ts` to await params
  - Update `/api/share/email/[id]/view/route.ts` to await params
  - _Requirements: 2.1, 2.2_

- [x] 4. Fix admin API routes





  - Update `/api/admin/bookshop/[id]/route.ts` to await params
  - Update `/api/admin/users/[id]/route.ts` to await params
  - Update `/api/admin/users/[id]/reset-password/route.ts` to await params
  - Update `/api/admin/members/[id]/route.ts` to await params
  - Update `/api/admin/members/[id]/reset-password/route.ts` to await params
  - Update `/api/admin/members/[id]/toggle-active/route.ts` to await params
  - Update `/api/admin/access-requests/[id]/route.ts` to await params
  - _Requirements: 2.1, 2.2_

- [x] 5. Fix member and annotation API routes





  - Update `/api/member/my-jstudyroom/[id]/route.ts` to await params
  - Update `/api/annotations/[id]/route.ts` to await params
  - Update `/api/media/stream/[annotationId]/route.ts` to await params
  - _Requirements: 2.1, 2.2_

- [x] 5.1 Write property test for consistent parameter handling


  - **Property 6: Consistent parameter handling**
  - **Validates: Requirements 2.2**

- [x] 6. Verify error handling and responses





  - Ensure all routes return proper error responses
  - Verify error messages are clear and user-friendly
  - Test 404, 403, 401, 400, and 500 error scenarios
  - _Requirements: 1.5_


- [x] 6.1 Write property test for error message clarity

  - **Property 5: Error message clarity**
  - **Validates: Requirements 1.5**

- [x] 7. Integration testing





  - Test document preview end-to-end flow
  - Verify watermark settings work correctly
  - Test with multiple document types
  - Verify flipbook viewer displays correctly

  - _Requirements: 1.1, 1.4_

- [x] 7.1 Write property test for preview functionality

  - **Property 1: Preview loads without Prisma errors**
  - **Validates: Requirements 1.1**

- [x] 7.2 Write property test for page data structure


  - **Property 4: Page data structure validity**
  - **Validates: Requirements 1.4**

- [x] 8. TypeScript compilation verification





  - Run TypeScript compiler to check for type errors
  - Fix any type-related issues
  - Ensure all route handlers have correct type signatures
  - _Requirements: 2.4_

- [x] 9. Final checkpoint - Ensure all tests pass

















  - Ensure all tests pass, ask the user if questions arise.
