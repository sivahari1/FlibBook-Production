# Implementation Plan

- [x] 1. Update DocumentCard to open preview settings in same tab








  - Remove `target="_blank"` attribute from preview link
  - Remove `rel="noopener noreferrer"` attribute (not needed for same-tab navigation)
  - Update Button component to render as regular link
  - _Requirements: 1.1_

- [x] 1.1 Write test for same-tab navigation





  - Test preview link does not have target="_blank" attribute
  - Test clicking preview link navigates in same tab
  - _Requirements: 1.1_

- [x] 2. Add watermark enable/disable control to PreviewClient










  - Add `enableWatermark` state (default: false)
  - Add checkbox/toggle UI for enabling watermark
  - Add descriptive label and help text
  - Ensure control is keyboard accessible
  - _Requirements: 1.2, 2.1, 2.5_

- [x] 2.1 Write property test for watermark default state


  - **Property 1: Watermark optional by default**
  - **Validates: Requirements 1.2, 2.1, 2.5**

- [x] 3. Make watermark settings conditional





  - Show watermark type selection only when `enableWatermark` is true
  - Show text watermark settings only when enabled and type is 'text'
  - Show image watermark settings only when enabled and type is 'image'
  - Show opacity control only when watermark is enabled
  - Update UI to clearly indicate settings are disabled
  - _Requirements: 1.2, 2.1_

- [x] 3.1 Write property test for settings state preservation


  - **Property 2: Settings state preservation**
  - **Validates: Requirements 1.3**

- [x] 4. Update validation logic





  - Only validate watermark text when `enableWatermark` is true AND `watermarkType` is 'text'
  - Only validate watermark image when `enableWatermark` is true AND `watermarkType` is 'image'
  - Allow preview to proceed when watermark is disabled regardless of other settings
  - _Requirements: 1.4, 2.2_

- [x] 4.1 Write tests for conditional validation


  - Test validation skipped when watermark disabled
  - Test validation enforced when watermark enabled
  - Test validation for text watermark
  - Test validation for image watermark
  - _Requirements: 1.4, 2.2, 2.3_

- [x] 5. Create new preview viewer route





  - Create `app/dashboard/documents/[id]/view/page.tsx`
  - Parse watermark settings from URL search parameters
  - Fetch document and generate signed URL
  - Pass settings to viewer client component
  - Handle missing or invalid parameters gracefully
  - _Requirements: 1.4, 3.1, 3.2_

- [x] 5.1 Create preview viewer client component


  - Create `app/dashboard/documents/[id]/view/PreviewViewerClient.tsx`
  - Accept watermark settings as props
  - Render appropriate viewer based on content type (PDF, image, video, link)
  - Pass watermark settings to viewer components
  - _Requirements: 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_

- [x] 6. Update preview button to open new tab with settings





  - Change button text to "Preview in New Tab"
  - Build URL with settings as query parameters
  - Use `window.open()` with '_blank' target
  - Include 'noopener,noreferrer' in window features for security
  - Handle popup blocker scenario with user message
  - _Requirements: 1.4, 3.1, 3.4_

- [x] 6.1 Write property test for settings URL generation


  - **Property 3: Settings passed to preview URL**
  - **Validates: Requirements 1.4, 3.2**

- [x] 6.2 Write property test for watermark disabled URL


  - **Property 4: Watermark disabled excludes parameters**
  - **Validates: Requirements 2.2**

- [x] 6.3 Write property test for watermark enabled URL


  - **Property 5: Watermark enabled includes parameters**
  - **Validates: Requirements 2.3**

- [x] 7. Add content type routing to viewer





  - Implement content type detection from document metadata
  - Route PDF documents to FlipBookContainerWithDRM
  - Route images to ImageViewer component
  - Route videos to VideoPlayer component
  - Route links to LinkPreview component
  - Apply watermark settings to all viewer types appropriately
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7.1 Write tests for content type routing


  - Test PDF routes to flipbook viewer
  - Test image routes to image viewer
  - Test video routes to video player
  - Test link routes to link preview
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Add error handling and user feedback





  - Add validation error messages for incomplete watermark settings
  - Add error handling for popup blocker
  - Add loading states during preview generation
  - Add error states for document not found / access denied
  - Add retry functionality for failed previews
  - _Requirements: 1.4, 2.2, 2.3_

- [x] 8.1 Write tests for error scenarios


  - Test validation errors display correctly
  - Test popup blocker message displays
  - Test error states render correctly
  - Test retry functionality works
  - _Requirements: 1.4_

- [x] 9. Improve accessibility





  - Add proper ARIA labels to watermark checkbox
  - Add ARIA live region for validation errors
  - Ensure all form controls are keyboard accessible
  - Add screen reader text for "opens in new tab"
  - Test with keyboard navigation
  - _Requirements: 1.2, 1.4_

- [x] 9.1 Write accessibility tests


  - Test watermark checkbox is keyboard accessible
  - Test form can be navigated with keyboard
  - Test ARIA labels are present
  - Test screen reader announcements
  - _Requirements: 1.2, 1.4_

- [x] 10. Integration testing






  - Test complete flow: dashboard → settings → preview in new tab
  - Test watermark disabled flow
  - Test watermark enabled with text
  - Test watermark enabled with image
  - Test all content types
  - Test back button navigation
  - Test browser popup blocker handling
  - _Requirements: 1.1, 1.2, 1.4, 2.2, 2.3, 3.1, 4.1, 4.2, 4.3, 4.4_


- [x] 10.1 Write integration tests


  - Test end-to-end preview workflow
  - Test settings persistence during session
  - Test URL parameter parsing
  - Test viewer receives correct settings
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2_

- [x] 11. Final checkpoint - Ensure all tests pass






  - Ensure all tests pass, ask the user if questions arise.
