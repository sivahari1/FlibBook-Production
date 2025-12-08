# Implementation Plan

- [x] 1. Install and configure PDF.js library





  - Install pdfjs-dist package via npm
  - Configure PDF.js worker source
  - Set up TypeScript types for PDF.js
  - Create PDF.js configuration module
  - _Requirements: 2.1_

- [x] 2. Create PDF.js integration layer





  - [x] 2.1 Implement PDF document loader


    - Create loadPDFDocument function with error handling
    - Implement progress tracking for PDF loading
    - Add timeout handling for slow networks
    - Handle authentication for signed URLs
    - _Requirements: 2.2, 6.5_

  - [x] 2.2 Write property test for PDF document loading





    - **Property 3: PDF fetch success**
    - **Validates: Requirements 2.2**

  - [x] 2.3 Implement PDF page renderer

    - Create renderPageToCanvas function
    - Handle viewport scaling
    - Implement canvas cleanup
    - Add error handling for render failures
    - _Requirements: 2.3_

  - [x] 2.4 Write property test for canvas rendering





    - **Property 2: PDF.js library usage**
    - **Validates: Requirements 2.1, 2.3**

  - [x] 2.5 Create PDF.js TypeScript interfaces


    - Define PDFDocument interface
    - Define PDFPage interface
    - Define PDFViewport interface
    - Define RenderTask interface
    - _Requirements: 2.1_

- [x] 3. Build PDFViewerWithPDFJS component





  - [x] 3.1 Create base component structure


    - Set up component props interface
    - Implement component state management
    - Add PDF.js library loading
    - Create canvas container
    - _Requirements: 2.1, 2.3_

  - [x] 3.2 Implement PDF loading logic


    - Load PDF document from URL
    - Display loading indicator
    - Handle loading errors
    - Track loading progress
    - _Requirements: 6.1, 6.5_

  - [x] 3.3 Write property test for loading indicator




    - **Property 19: Loading indicator display**
    - **Validates: Requirements 6.1**

  - [x] 3.4 Implement page rendering


    - Render current page to canvas
    - Handle page render errors
    - Implement progressive rendering
    - Add render completion callbacks
    - _Requirements: 2.3, 6.2_

  - [x] 3.5 Write property test for progressive rendering





    - **Property 20: Progressive rendering**
    - **Validates: Requirements 6.2**


- [x] 4. Implement navigation controls





  - [x] 4.1 Add page navigation


    - Implement next/previous page functions
    - Add page number input
    - Handle invalid page numbers
    - Update page indicators
    - _Requirements: 5.1, 5.3_

  - [x] 4.2 Write property test for page navigation





    - **Property 14: Page navigation support**
    - **Validates: Requirements 5.1**

  - [x] 4.3 Write property test for page indicators








    - **Property 16: Page indicator accuracy**
    - **Validates: Requirements 5.3**

  - [x] 4.4 Add zoom controls

    - Implement zoom in/out functions
    - Handle zoom level bounds (0.5x - 3.0x)
    - Update canvas scale
    - Maintain scroll position during zoom
    - _Requirements: 5.4_

  - [x] 4.5 Write property test for zoom controls





    - **Property 17: Zoom control functionality**
    - **Validates: Requirements 5.4**

  - [x] 4.6 Add keyboard shortcuts

    - Implement arrow key navigation
    - Add Page Up/Down support
    - Add Home/End support
    - Add Ctrl+scroll zoom
    - _Requirements: 5.5_

  - [x] 4.7 Write property test for keyboard shortcuts





    - **Property 18: Keyboard shortcut response**
    - **Validates: Requirements 5.5**

- [x] 5. Implement continuous scroll mode





  - [x] 5.1 Create continuous scroll container


    - Render multiple pages vertically
    - Implement virtual scrolling
    - Track visible pages
    - Update current page on scroll
    - _Requirements: 5.2_

  - [x] 5.2 Write property test for continuous scroll





    - **Property 15: Continuous scroll support**
    - **Validates: Requirements 5.2**

  - [x] 5.3 Implement lazy page loading


    - Load pages as they become visible
    - Unload off-screen pages
    - Prioritize visible pages
    - Cache recently viewed pages
    - _Requirements: 6.3, 6.4_

  - [ ] 5.4 Write property test for lazy loading




    - **Property 21: Lazy page loading**
    - **Validates: Requirements 6.3**

  - [x] 5.5 Write property test for page priority








    - **Property 22: Visible page priority**
    - **Validates: Requirements 6.4**


- [x] 6. Integrate watermark overlay





  - [x] 6.1 Add watermark to PDF.js rendering


    - Position watermark over canvas
    - Handle watermark settings
    - Ensure watermark always visible
    - Update watermark on settings change
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 6.2 Write property test for watermark presence





    - **Property 6: Watermark overlay presence**
    - **Validates: Requirements 3.1, 3.2**

  - [x] 6.3 Write property test for watermark updates





    - **Property 9: Watermark dynamic updates**
    - **Validates: Requirements 3.5**

  - [x] 6.4 Handle watermark during zoom

    - Scale watermark with content
    - Maintain watermark position
    - Update watermark on zoom change
    - _Requirements: 3.3_

  - [x] 6.5 Write property test for watermark zoom




    - **Property 7: Watermark zoom persistence**
    - **Validates: Requirements 3.3**

  - [x] 6.6 Handle watermark during navigation

    - Ensure watermark on all pages
    - Update watermark on page change
    - Maintain watermark visibility
    - _Requirements: 3.4_

  - [x] 6.7 Write property test for watermark navigation




    - **Property 8: Watermark navigation persistence**
    - **Validates: Requirements 3.4**

- [x] 7. Implement DRM protections





  - [x] 7.1 Add event prevention


    - Prevent right-click context menu
    - Block print shortcuts (Ctrl+P)
    - Block save shortcuts (Ctrl+S)
    - Prevent text selection
    - Prevent drag events
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.2 Write property test for context menu prevention





    - **Property 10: Context menu prevention**
    - **Validates: Requirements 4.1**

  - [x] 7.3 Write property test for print blocking





    - **Property 11: Print shortcut blocking**
    - **Validates: Requirements 4.2**

  - [x] 7.4 Write property test for text selection prevention





    - **Property 12: Text selection prevention**
    - **Validates: Requirements 4.3**

  - [x] 7.5 Write property test for save blocking





    - **Property 13: Save shortcut blocking**
    - **Validates: Requirements 4.4**

  - [x] 7.6 Add CSS-based protections


    - Disable user-select
    - Prevent pointer events on sensitive areas
    - Hide browser PDF controls
    - Apply DRM styles to canvas
    - _Requirements: 4.1, 4.2, 4.3, 4.4_


- [x] 8. Implement error handling





  - [x] 8.1 Create error handling system


    - Define error types
    - Create error display component
    - Implement error recovery
    - Add retry functionality
    - _Requirements: 2.4, 7.1, 7.5_

  - [x] 8.2 Write property test for error messages





    - **Property 4: Error message clarity**
    - **Validates: Requirements 2.4, 7.1**

  - [x] 8.3 Write property test for retry option





    - **Property 24: Retry option availability**
    - **Validates: Requirements 7.5**

  - [x] 8.4 Add specific error handlers


    - Handle network errors
    - Handle permission errors
    - Handle corrupted file errors
    - Handle timeout errors
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 8.5 Implement fallback rendering


    - Detect PDF.js unavailability
    - Fall back to alternative method
    - Display fallback notification
    - _Requirements: 2.5_

  - [x] 8.6 Write property test for fallback





    - **Property 5: Fallback rendering**
    - **Validates: Requirements 2.5**

- [x] 9. Configure CORS and CSP






  - [x] 9.1 Update Supabase storage configuration

    - Configure CORS headers for signed URLs
    - Ensure PDF URLs work with fetch API
    - Test cross-origin requests
    - _Requirements: 8.1, 8.3_

  - [x] 9.2 Write property test for CORS headers




    - **Property 25: CORS header presence**
    - **Validates: Requirements 8.1**

  - [x] 9.3 Write property test for signed URL compatibility





    - **Property 27: Signed URL compatibility**
    - **Validates: Requirements 8.3**


  - [x] 9.4 Configure CSP headers

    - Allow PDF.js CDN resources
    - Allow worker-src for PDF.js worker
    - Allow canvas rendering
    - Test CSP configuration
    - _Requirements: 8.2_

  - [x] 9.5 Write property test for CSP configuration



    - **Property 26: CSP configuration**
    - **Validates: Requirements 8.2**

  - [x] 9.6 Handle authentication


    - Pass authentication with signed URLs
    - Handle token expiration
    - Refresh tokens when needed
    - _Requirements: 8.4_

  - [x] 9.7 Write property test for authentication





    - **Property 28: Authentication handling**
    - **Validates: Requirements 8.4**


  - [x] 9.8 Test cross-origin resource loading

    - Verify PDF.js worker loads
    - Verify font resources load
    - Verify CMap resources load
    - _Requirements: 8.5_

  - [x] 9.9 Write property test for cross-origin loading





    - **Property 29: Cross-origin resource loading**
    - **Validates: Requirements 8.5**


- [x] 10. Update SimpleDocumentViewer component




  - [x] 10.1 Add PDF.js rendering option


    - Add usePDFJS prop
    - Conditionally render PDFViewerWithPDFJS
    - Maintain backward compatibility with iframe
    - Update component documentation
    - _Requirements: 2.1_

  - [x] 10.2 Update PreviewViewerClient


    - Pass PDF.js flag to SimpleDocumentViewer
    - Handle PDF.js-specific props
    - Update error handling
    - _Requirements: 2.1_


  - [x] 10.3 Update server-side page component

    - Add feature flag for PDF.js
    - Pass flag to client component
    - Maintain existing functionality
    - _Requirements: 2.1_

- [x] 11. Checkpoint - Ensure all tests pass












  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Add performance optimizations
  - [x] 12.1 Implement memory management



    - Limit rendered pages in memory
    - Destroy unused PDF.js objects
    - Clear canvas contexts
    - Monitor memory usage
    - _Requirements: 6.3, 6.4_


  - [x] 12.2 Optimize rendering pipeline


    - Use web workers for parsing
    - Cache rendered canvases
    - Use requestAnimationFrame
    - Implement render throttling
    - _Requirements: 6.2, 6.3_

  - [x] 12.3 Add network optimizations




    - Implement request caching
    - Add retry with exponential backoff
    - Use HTTP/2 for parallel requests
    - _Requirements: 6.5_

  - [x] 12.4 Write property test for progress feedback
























    - **Property 23: Progress feedback**
    - **Validates: Requirements 6.5**

- [x] 13. Write integration tests




  - Test PDF.js + Canvas rendering pipeline
  - Test Watermark overlay + PDF rendering
  - Test DRM protection + PDF.js events
  - Test Navigation controls + page rendering
  - Test Error handling + user feedback
  - _Requirements: All_

- [x] 14. Write browser compatibility tests













  - Test Chrome PDF rendering
  - Test Firefox PDF rendering
  - Test Safari PDF rendering
  - Test Edge PDF rendering
  - _Requirements: 1.2, 1.3, 1.4, 1.5_


- [x] 15. Create documentation






  - [x] 15.1 Write PDF.js integration guide

    - Document PDF.js setup
    - Explain rendering pipeline
    - Provide usage examples
    - Document troubleshooting steps
    - _Requirements: All_


  - [x] 15.2 Update component documentation

    - Document PDFViewerWithPDFJS props
    - Update SimpleDocumentViewer docs
    - Add migration guide
    - Document breaking changes
    - _Requirements: All_


  - [x] 15.3 Create user guide

    - Explain new viewer features
    - Document keyboard shortcuts
    - Provide troubleshooting tips
    - Add FAQ section
    - _Requirements: All_

- [x] 16. Deploy and monitor






  - [x] 16.1 Deploy with feature flag

    - Enable PDF.js for test users
    - Monitor error rates
    - Gather user feedback
    - Track performance metrics
    - _Requirements: All_

  - [x] 16.2 Gradual rollout


    - Enable for 10% of users
    - Monitor for issues
    - Increase to 50% if stable
    - Enable for all users
    - _Requirements: All_



  - [x] 16.3 Remove iframe fallback





    - Remove iframe rendering code
    - Clean up unused components
    - Update tests
    - Final documentation update
    - _Requirements: All_

- [x] 17. Final Checkpoint - Ensure all tests pass






  - Ensure all tests pass, ask the user if questions arise.
