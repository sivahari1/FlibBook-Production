# Implementation Plan

- [x] 1. Fix frontend validation logic
  - Update EnhancedUploadModal validation to allow price = 0
  - Remove the condition that rejects zero prices
  - Maintain upper bound validation (price <= 10000)
  - _Requirements: 1.1, 1.3, 3.1_

- [x] 1.1 Write property test for frontend price validation






  - **Property 1: Zero price validation acceptance**
  - **Validates: Requirements 1.1, 1.3**

- [x] 1.2 Write property test for price range validation






  - **Property 4: Price range validation consistency**
  - **Validates: Requirements 3.1, 3.2**

- [x] 2. Fix backend validation logic
  - Update upload API route validation to allow price >= 0
  - Change condition from `bookshopPrice <= 0` to `bookshopPrice < 0`
  - Maintain existing upper bound and type validation
  - _Requirements: 1.2, 3.2, 3.3_

- [x] 2.1 Write property test for backend price validation






  - **Property 5: Edge case validation handling**
  - **Validates: Requirements 3.3**

- [x] 2.2 Write property test for validation consistency






  - **Property 4: Price range validation consistency**
  - **Validates: Requirements 3.1, 3.2**

- [x] 3. Update UI feedback and help text
  - Add helpful placeholder text indicating free content is allowed
  - Update price input to show ₹0.00 as acceptable minimum
  - Improve success messages for free content uploads
  - _Requirements: 2.4_

- [x] 3.1 Write unit test for success message content






  - Test that free uploads show appropriate success message
  - _Requirements: 2.4_

- [x] 4. Fix bookshop item creation logic
  - Ensure isFree flag is correctly set when price = 0
  - Verify database insertion works with zero prices
  - Test bookshop item display formatting
  - _Requirements: 1.4, 2.5, 3.4_

- [x] 4.1 Write property test for free flag setting





  - **Property 3: Free flag correctness**
  - **Validates: Requirements 1.4, 3.4**

- [x] 4.2 Write property test for display formatting






  - **Property 7: Free item display formatting**
  - **Validates: Requirements 2.5**

- [x] 5. Add integration tests





  - Test complete upload flow with free content
  - Verify database state after free upload
  - Test error isolation when other fields have issues
  - _Requirements: 1.2, 2.3_

- [x] 5.1 Write property test for end-to-end free uploads







  - **Property 2: End-to-end free upload success**
  - **Validates: Requirements 1.2**

- [x] 5.2 Write property test for error isolation
  - **Property 6: Error isolation for free content**
  - **Validates: Requirements 2.3**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update BookshopIntegrationSection component
  - Update help text to clarify that ₹0.00 is acceptable
  - Ensure price input allows zero values
  - Test component behavior with zero prices
  - _Requirements: 2.1, 1.5_

- [x] 7.1 Write unit test for component price handling
  - Test that component accepts and displays zero prices correctly
  - _Requirements: 1.5_

- [x] 8. Final verification and testing
  - Manual testing of complete upload flow
  - Verify bookshop displays free items correctly
  - Test edge cases and error scenarios
  - _Requirements: All_

- [x] 8.1 Write comprehensive integration tests
  - Test complete user journey with free uploads
  - Verify all requirements are met end-to-end
  - _Requirements: All_

- [x] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.