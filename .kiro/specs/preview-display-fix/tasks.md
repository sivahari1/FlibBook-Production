# Implementation Plan

- [x] 1. Fix watermark default behavior in FlipBookContainerWithDRM





  - Change default parameter from `showWatermark = true` to `showWatermark = false`
  - Fix watermark text fallback logic to only use watermarkText when showWatermark is true
  - Remove userEmail fallback when watermark is disabled
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 2. Fix content visibility and z-index layering





  - Update watermark overlay z-index from 10 to 1
  - Ensure content layer has z-index: 0
  - Simplify opacity declarations (remove conflicting styles)
  - Test that content is always visible with and without watermark
  - _Requirements: 2.1, 2.4, 2.5_

- [x] 3. Implement full-size viewport display





  - Update FlipBook dimension calculations to use 80% width (desktop) and 95% width (mobile)
  - Change container height to use h-screen for full viewport
  - Reduce padding from p-8 to p-4 for more content space
  - Ensure responsive behavior across different screen sizes
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Verify URL parameter parsing





  - Review PreviewViewerClient URL parameter parsing logic
  - Ensure watermark defaults to false when parameter is missing
  - Add console logging for debugging watermark settings
  - Test with various URL parameter combinations
  - _Requirements: 1.4, 4.5, 5.3_

- [x] 5. Update ImageViewer watermark handling









  - Ensure ImageViewer respects watermark enabled/disabled state
  - Verify watermark only renders when explicitly enabled
  - Test z-index layering for image watermarks
  - _Requirements: 4.2, 5.2_

- [x] 6. Update VideoPlayer watermark handling





  - Ensure VideoPlayer respects watermark enabled/disabled state
  - Verify watermark only renders when explicitly enabled
  - Test watermark overlay on video content
  - _Requirements: 4.3, 5.2_

- [x] 7. Checkpoint - Verify all changes work together





  - Test preview without watermark settings (should show no watermark)
  - Test preview with watermark enabled (should show watermark)
  - Test preview with watermark disabled explicitly (should show no watermark)
  - Verify content is visible and fills viewport
  - Test across different content types (PDF, image, video, link)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Write unit tests for watermark default behavior





  - Test FlipBookContainerWithDRM without showWatermark prop
  - Test FlipBookContainerWithDRM with showWatermark=false
  - Test FlipBookContainerWithDRM with showWatermark=true
  - Test watermark text fallback logic
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 9. Write unit tests for content visibility





  - Test z-index layering of content and watermark
  - Test watermark opacity doesn't obscure content
  - Test watermark conditional rendering
  - _Requirements: 2.1, 2.4, 2.5, 5.2_

- [x] 10. Write integration tests for preview display





  - Test end-to-end preview flow without watermark
  - Test end-to-end preview flow with watermark
  - Test URL parameter parsing and application
  - Test full-size display across viewport sizes
  - _Requirements: 3.1, 3.2, 4.5_

- [x] 11. Write property tests for watermark behavior





  - **Property 1: Watermark default state**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 12. Write property tests for content visibility





  - **Property 2: Content visibility precedence**
  - **Validates: Requirements 2.1, 2.4, 2.5**

- [x] 13. Write property tests for viewport utilization






  - **Property 3: Full viewport utilization**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 14. Write property tests for URL parameter consistency



















  - **Property 4: URL parameter consistency**
  - **Validates: Requirements 1.4, 4.5**
- [ ] 15. Write property tests for conditional rendering























- [ ] 15. Write property tests for conditional rendering

  - **Property 5: Watermark conditional rendering**
  - **Validates: Requirements 5.2**

- [x] 16. Final Checkpoint - Ensure all tests pass





  - Run all unit tests
  - Run all integration tests
  - Run all property tests
  - Verify no regressions in existing functionality
  - Test on multiple browsers and devices
  - Ensure all tests pass, ask the user if questions arise.
