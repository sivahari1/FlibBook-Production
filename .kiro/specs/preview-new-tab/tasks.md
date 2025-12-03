# Implementation Plan

- [x] 1. Enhance Button component to support asChild pattern





  - Add `asChild` prop to Button component interface
  - Implement conditional rendering: when `asChild` is true, apply button classes to child element
  - Maintain all existing button variants (primary, secondary, danger, etc.)
  - Maintain all existing button sizes (sm, md, lg)
  - Ensure TypeScript types are correct
  - _Requirements: 2.2, 2.3_

- [x] 1.1 Write unit tests for Button asChild functionality


  - Test Button renders as child element when asChild is true
  - Test Button maintains styling with asChild
  - Test all variants work with asChild
  - Test all sizes work with asChild
  - _Requirements: 2.2_

- [x] 2. Update DocumentCard preview button to use link





  - Replace `onClick` with `window.open()` with proper link element
  - Add `target="_blank"` attribute
  - Add `rel="noopener noreferrer"` attribute
  - Wrap link in Button with `asChild` prop
  - Maintain button styling and icon
  - _Requirements: 1.1, 1.4, 1.5, 2.1_

- [x] 2.1 Write property test for security attributes


  - **Property 1: Security attributes present**
  - **Validates: Requirements 1.4, 2.1**

- [x] 2.2 Write property test for keyboard accessibility


  - **Property 2: Keyboard accessibility**
  - **Validates: Requirements 2.2**

- [x] 3. Integration testing





  - Test clicking preview button opens in new tab
  - Test right-click context menu is available
  - Test keyboard shortcuts (Ctrl+Click, Cmd+Click)
  - Test keyboard navigation (Tab to focus, Enter to activate)
  - Verify dashboard state is preserved after opening preview
  - _Requirements: 1.1, 1.2, 1.5, 2.4_

- [x] 3.1 Write integration tests for preview navigation


  - Test preview link has correct href
  - Test preview link has target="_blank"
  - Test preview link has rel="noopener noreferrer"
  - Test link is keyboard accessible
  - _Requirements: 1.1, 1.4, 1.5, 2.2, 2.4_

- [x] 4. Verify existing preview features





  - Test watermark settings still work
  - Test sharing functionality still works
  - Test flipbook viewer displays correctly
  - Test all preview error scenarios still work
  - _Requirements: 2.3_

- [x] 5. Final checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
