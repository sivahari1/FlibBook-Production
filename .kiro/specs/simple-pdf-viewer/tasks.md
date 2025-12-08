# Implementation Plan

- [x] 1. Create core viewer components and layout





  - Build SimpleDocumentViewer component with full-screen layout
  - Implement ViewerToolbar with navigation controls
  - Set up component props and state management
  - _Requirements: 1.1, 1.4, 1.5_

- [x] 1.1 Write unit tests for SimpleDocumentViewer layout

  - Test full-screen positioning (fixed inset-0)
  - Test toolbar rendering
  - Test watermark overlay integration
  - _Requirements: 1.1, 1.4_

- [x] 2. Implement continuous scroll view mode





  - Create ContinuousScrollView component
  - Implement vertical page layout with spacing
  - Add Intersection Observer for page visibility tracking
  - Implement progressive page loading
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.1 Write property test for continuous scroll



  - **Property 2: Smooth page transitions**
  - **Validates: Requirements 2.1, 2.2, 2.3**
  - Test that page indicator updates within 100ms of scroll
  - Test that pages load progressively as they enter viewport

- [x] 2.2 Write unit tests for ContinuousScrollView


  - Test page rendering in vertical layout
  - Test lazy loading behavior
  - Test IntersectionObserver integration
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 3. Implement paged view mode





  - Create PagedView component
  - Implement single-page display with centering
  - Add smooth transitions between pages
  - _Requirements: 6.2, 6.3_

- [x] 3.1 Write unit tests for PagedView


  - Test single page rendering
  - Test page centering
  - Test page transitions
  - _Requirements: 6.2, 6.3_

- [x] 4. Add page navigation controls





  - Implement previous/next arrow buttons in toolbar
  - Add page number input with validation
  - Display total page count
  - Handle boundary conditions (first/last page)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_

- [x] 4.1 Write property test for navigation boundaries


  - **Property 3: Navigation boundary enforcement**
  - **Validates: Requirements 3.4, 3.5**
  - Test that navigation never goes below 1 or above totalPages
  - Test with random page numbers and navigation actions

- [x] 4.2 Write unit tests for page navigation


  - Test arrow button clicks
  - Test page number input
  - Test boundary conditions
  - Test disabled states
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 5. Implement keyboard navigation





  - Create useKeyboardNavigation hook
  - Handle arrow keys (up/down)
  - Handle Page Up/Page Down keys
  - Handle Home/End keys
  - Prevent default browser behavior for navigation keys
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 5.1 Write property test for keyboard shortcuts


  - **Property 5: Keyboard shortcut consistency**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
  - Test all keyboard shortcuts perform correct actions
  - Test preventDefault() is called appropriately

- [x] 5.2 Write unit tests for useKeyboardNavigation hook

  - Test each keyboard shortcut
  - Test callback invocations
  - Test event cleanup
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 6. Add zoom controls





  - Implement zoom in/out buttons in toolbar
  - Add zoom level display (percentage)
  - Handle Ctrl+scroll for zoom
  - Enforce zoom bounds (0.5x to 3.0x)
  - Maintain page position when zooming
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6.1 Write property test for zoom bounds


  - **Property 7: Zoom level bounds**
  - **Validates: Requirements 7.2, 7.3, 7.5**
  - Test zoom level always stays between 0.5 and 3.0
  - Test current page remains visible after zoom

- [x] 6.2 Write unit tests for zoom controls


  - Test zoom in/out buttons
  - Test zoom level display
  - Test zoom bounds enforcement
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 7. Implement view mode toggle



  - Add toggle button in toolbar
  - Switch between continuous and paged modes
  - Preserve current page when switching
  - Update UI to reflect current mode
  - _Requirements: 6.1, 6.4_

- [x] 7.1 Write property test for view mode preservation



  - **Property 6: View mode preservation**
  - **Validates: Requirements 6.4**
  - Test that current page is maintained when switching modes
  - Test with random page positions

- [x] 7.2 Write unit tests for view mode toggle


  - Test mode switching
  - Test page preservation
  - Test UI updates
  - _Requirements: 6.1, 6.4_

- [x] 8. Add user preferences persistence





  - Implement localStorage for viewer preferences
  - Save view mode preference
  - Save default zoom level
  - Load preferences on viewer mount
  - _Requirements: 6.5_

- [x] 8.1 Write unit tests for preferences persistence


  - Test saving preferences to localStorage
  - Test loading preferences
  - Test fallback to defaults
  - _Requirements: 6.5_

- [x] 9. Integrate watermark overlay





  - Add WatermarkOverlay component
  - Position watermark above content (z-index)
  - Support text and image watermarks
  - Ensure watermark doesn't block navigation
  - _Requirements: 8.5_

- [x] 9.1 Write integration test for watermark


  - Test watermark renders when enabled
  - Test watermark doesn't interfere with navigation
  - Test watermark positioning
  - _Requirements: 8.5_

- [x] 10. Update PreviewViewerClient integration




  - Modify PreviewViewerClient to use SimpleDocumentViewer for PDFs
  - Pass watermark settings correctly
  - Handle page data from server
  - Maintain backward compatibility with other content types
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 10.1 Write property test for content type consistency






  - **Property 8: Content type consistency**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
  - Test that all content types provide consistent navigation
  - Test with PDF, image, video, and link content

- [x] 10.2 Write integration tests for PreviewViewerClient


  - Test PDF rendering with SimpleDocumentViewer
  - Test image rendering
  - Test video rendering
  - Test link rendering
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 11. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Add responsive design and mobile support





  - Implement responsive toolbar layout
  - Add touch gesture support (swipe for navigation)
  - Support pinch-to-zoom on touch devices
  - Ensure minimum touch target sizes (44x44px)
  - Test on mobile browsers
  - _Requirements: 1.3, 1.5_

- [x] 12.1 Write tests for mobile responsiveness


  - Test toolbar collapses on small screens
  - Test touch gesture handling
  - Test pinch-to-zoom
  - _Requirements: 1.3_

- [x] 13. Implement error handling and loading states





  - Add loading indicators for page images
  - Handle page load failures with retry
  - Validate page number inputs
  - Handle missing or invalid page data
  - _Requirements: 2.4_

- [x] 13.1 Write unit tests for error handling


  - Test page load failure handling
  - Test invalid page number handling
  - Test missing data handling
  - _Requirements: 2.4_

- [x] 14. Add accessibility features





  - Add ARIA labels to all controls
  - Ensure keyboard focus is visible
  - Announce page changes to screen readers
  - Test with screen reader
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 14.1 Write accessibility tests


  - Test ARIA labels present
  - Test keyboard focus indicators
  - Test screen reader announcements
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 15. Optimize performance





  - Implement virtual scrolling for large documents (100+ pages)
  - Add image caching
  - Debounce scroll events for page indicator
  - Optimize re-renders with React.memo
  - _Requirements: 2.4, 2.5_

- [x] 15.1 Write performance tests


  - Test virtual scrolling with large documents
  - Test scroll event debouncing
  - Test render optimization
  - _Requirements: 2.4, 2.5_

- [x] 16. Final checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Create documentation and examples








  - Document SimpleDocumentViewer API
  - Create usage examples
  - Document keyboard shortcuts for users
  - Add troubleshooting guide
  - _Requirements: All_


- [x] 17.1 Write documentation


  - Component API documentation
  - User guide for keyboard shortcuts
  - Integration guide
  - _Requirements: All_
