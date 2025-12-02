# Implementation Plan

- [x] 1. Implement content-type-aware view action handler





  - [x] 1.1 Add type guard function to detect link content


    - Create `isLinkContent` function that checks if contentType === 'LINK'
    - Add TypeScript type annotations for type safety
    - _Requirements: 4.1, 4.5_

  - [x] 1.2 Add link URL extraction function

    - Create `getLinkUrl` function to extract linkUrl from item metadata
    - Handle various metadata structures safely
    - Return null if linkUrl is missing or invalid
    - _Requirements: 1.4, 4.5_

  - [x] 1.3 Implement view action handler


    - Create `handleViewContent` function that routes based on content type
    - For LINK type: open in new tab with window.open
    - Include security attributes: 'noopener,noreferrer'
    - Display error if linkUrl is missing
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.4 Write property test for link type detection


    - **Property 1: Link content opens in new tab**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 1.5 Write property test for link URL extraction


    - **Property 3: Invalid link URLs are rejected**
    - **Validates: Requirements 1.4**

- [x] 2. Update View button rendering logic






  - [x] 2.1 Replace Link wrapper with conditional rendering

    - For LINK content: render Button with onClick handler
    - For other content: render Link component wrapping Button
    - Maintain consistent button styling across both cases
    - _Requirements: 1.1, 2.1, 2.2, 2.3_



  - [x] 2.2 Add tooltip attributes to View buttons




    - For LINK content: add title="Open link in new tab"
    - For other content: add title="View content"
    - Ensure tooltips are accessible to screen readers

    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 2.3 Write property test for non-link navigation

    - **Property 2: Non-link content navigates to viewer**
    - **Validates: Requirements 2.1, 2.2, 2.3**


  - [x] 2.4 Write property test for security attributes

    - **Property 4: Security attributes are applied**
    - **Validates: Requirements 1.3**


  - [x] 2.5 Write property test for tooltip text

    - **Property 5: Tooltip text matches action**
    - **Validates: Requirements 3.1, 3.2**

- [x] 3. Add error handling for edge cases





  - [x] 3.1 Handle missing link URL scenario


    - Check if linkUrl exists before opening
    - Display user-friendly error message using existing error state
    - Prevent any navigation when URL is missing
    - _Requirements: 1.4_

  - [x] 3.2 Handle popup blocker scenario

    - Check if window.open returns null (popup blocked)
    - Display message instructing user to allow popups
    - Provide retry mechanism
    - _Requirements: 1.1_

  - [x] 3.3 Write unit tests for error scenarios


    - Test missing linkUrl displays error
    - Test popup blocked displays message
    - Test error state clears appropriately
    - _Requirements: 1.4_

- [x] 4. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update documentation and comments






  - [x] 5.1 Add JSDoc comments to new functions

    - Document isLinkContent type guard
    - Document getLinkUrl extraction function
    - Document handleViewContent handler
    - Include parameter types and return types
    - _Requirements: 4.2_


  - [x] 5.2 Update component-level documentation

    - Add comments explaining view action logic
    - Document the conditional rendering approach
    - Note security considerations for link opening
    - _Requirements: 4.2_

- [x] 6. Final Checkpoint - Verify all functionality




  - Ensure all tests pass, ask the user if questions arise.
