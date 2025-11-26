# Implementation Plan

- [x] 1. Update category structure and helper functions





  - Update `lib/bookshop-categories.ts` with Math CBSE subcategories (1st-10th Standard)
  - Ensure category structure includes Maths, Functional MRI, and Music
  - Verify helper functions work with hierarchical categories
  - _Requirements: 2.2, 10.1, 10.2_

- [x] 2. Enhance BookShop component with improved filtering





  - Update `components/member/BookShop.tsx` to use hierarchical category structure
  - Implement category dropdown with optgroups for subcategories
  - Add content type filter dropdown with icons
  - Implement search functionality with debouncing
  - Display results count
  - _Requirements: 2.1, 2.3, 2.4, 2.5_

- [x] 2.1 Write property test for BookShop filtering






  - **Property 3: BookShop displays only published items**
  - **Property 4: Category filtering is accurate**
  - **Property 5: Content type filtering is accurate**
  - **Property 6: Search filtering matches title and description**
  - **Validates: Requirements 2.1, 2.3, 2.4, 2.5**

- [x] 3. Enhance BookShopItemCard component





  - Update `components/member/BookShopItemCard.tsx` to display all required fields
  - Add content type icon display (📄 PDF, 🖼️ IMAGE, 🎥 VIDEO, 🔗 LINK, 🎵 AUDIO)
  - Show thumbnail with fallback to content type icon
  - Display "In My Study Room" badge when item is in collection
  - Show link URL and metadata for LINK type items
  - Implement "Add to Study Room" button with disabled state when at limit
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1-7.5_

- [x] 3.1 Write property test for BookShop item display






  - **Property 7: BookShop items display all required fields**
  - **Property 8: Pricing information is displayed correctly**
  - **Property 9: Thumbnail display is conditional**
  - **Property 10: Collection status is indicated**
  - **Property 11: Link items show URL and metadata**
  - **Property 23: Content type icons are correct**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 7.1-7.5**

- [x] 4. Implement add to Study Room functionality





  - Update API route `/api/member/my-jstudyroom/route.ts` to handle POST requests
  - Validate collection limits before adding (5 free, 5 paid)
  - Increment appropriate counter (freeDocumentCount or paidDocumentCount)
  - Create MyJstudyroom record
  - Return updated collection status
  - Handle errors for limit exceeded cases
  - _Requirements: 4.1, 4.3, 8.1, 8.2, 8.3, 8.4_

- [x] 4.1 Write property test for adding items






  - **Property 12: Adding free items increments free count**
  - **Property 24: Document counts are calculated correctly**
  - **Validates: Requirements 4.1, 8.1, 8.2**

- [x] 5. Integrate payment flow for paid items





  - Update BookShopItemCard to trigger payment modal for paid items
  - Ensure `components/member/PaymentModal.tsx` receives item details
  - Update payment success handler to add item to Study Room
  - Increment paidDocumentCount after successful payment
  - Create Payment record in database
  - Update UI to show "In My Study Room" status after payment
  - _Requirements: 4.2, 4.5, 9.1, 9.2, 9.5_

- [x] 5.1 Write property test for payment flow















  - **Property 13: Adding paid items triggers payment**
  - **Property 25: Payment modal displays item details**
  - **Property 26: Successful payment adds item**
  - **Property 27: Payment cancellation prevents addition**
  - **Validates: Requirements 4.2, 9.1, 9.2, 9.3, 9.5**

- [x] 6. Enhance Study Room (My jstudyroom) component





  - Update `components/member/MyJstudyroom.tsx` with filtering UI
  - Add search input for title/description filtering
  - Add content type filter dropdown
  - Add free/paid filter dropdown
  - Display filtered count vs total count
  - Implement clear filters functionality
  - Show content type icons for each item
  - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1-7.5_

- [x] 6.1 Write property test for Study Room filtering






  - **Property 15: Study Room displays all collection items**
  - **Property 16: Study Room items display required fields**
  - **Property 18: Study Room search filters correctly**
  - **Property 19: Study Room content type filter works**
  - **Property 20: Study Room price type filter works**
  - **Property 21: Filter count display is accurate**
  - **Property 22: Clearing filters shows all items**
  - **Validates: Requirements 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 6.5**

- [x] 7. Implement remove from Study Room functionality





  - Update API route `/api/member/my-jstudyroom/[id]/route.ts` to handle DELETE requests
  - Decrement appropriate counter (freeDocumentCount or paidDocumentCount)
  - Delete MyJstudyroom record
  - Return updated collection status
  - Update UI to remove "In My Study Room" badge from BookShop
  - _Requirements: 5.4, 5.5, 8.5_

- [x] 7.1 Write property test for removing items






  - **Property 17: Removing items decrements correct counter**
  - **Validates: Requirements 5.4**

- [x] 8. Update member dashboard overview





  - Ensure `app/member/page.tsx` displays correct counts
  - Verify quick action cards navigate correctly
  - Ensure information section explains limits clearly
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 8.1 Write property test for dashboard






  - **Property 1: Dashboard displays correct document counts**
  - **Property 2: Navigation cards route correctly**
  - **Validates: Requirements 1.2, 1.4**

- [x] 8.2 Write unit tests for dashboard display






  - Test welcome section shows member name
  - Test quick action cards are present
  - Test information section is displayed
  - _Requirements: 1.1, 1.3, 1.5_

- [x] 9. Enhance admin BookShop management





  - Update `components/admin/BookShopItemForm.tsx` with category dropdown
  - Show CBSE subcategories when Math is selected
  - Validate required fields (title, description, category, content type, free/paid)
  - Validate price > 0 for paid items
  - Ensure publish toggle works correctly
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [-] 9.1 Write property test for admin form validation




  - **Property 28: Admin form validates required fields**
  - **Property 29: Paid items require valid price**
  - **Property 30: Publishing makes items visible**
  - **Validates: Requirements 10.1, 10.3, 10.4, 10.5**

- [x] 9.2 Write unit test for category dropdown





  - Test Math category shows CBSE subcategories
  - Test other categories don't show subcategories
  - _Requirements: 10.2_

- [x] 10. Add database indexes for performance





  - Add index on `BookShopItem.category`
  - Add index on `BookShopItem.isPublished`
  - Add index on `MyJstudyroom.userId`
  - Add composite index on `MyJstudyroom(userId, bookShopItemId)`
  - Test query performance improvements

- [x] 11. Implement error handling and edge cases





  - Add error messages for limit exceeded scenarios
  - Handle network failures gracefully with retry options
  - Implement optimistic UI updates with rollback on failure
  - Add loading states for all async operations
  - Handle payment failures with clear error messages
  - _Requirements: 4.3, 4.4, 9.4_

- [x] 11.1 Write unit tests for edge cases
















  - Test adding item when free limit reached
  - Test adding item when paid limit reached
  - Test payment failure handling
  - Test button disabled states at limits
  - _Requirements: 4.3, 4.4, 8.3, 8.4, 9.4_

- [x] 12. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Add client-side optimizations





  - Implement search debouncing (300ms)
  - Memoize filtered results in BookShop and Study Room
  - Use React.memo for BookShopItemCard
  - Implement lazy loading for thumbnails
  - Cache BookShop data client-side

- [x] 14. Update navigation and routing





  - Verify `/member/bookshop` route works correctly
  - Verify `/member/my-jstudyroom` route works correctly
  - Ensure navigation from dashboard quick actions works
  - Test back navigation and browser history

- [x] 14.1 Write integration test for navigation flow





  - Test complete browse and add workflow
  - Test complete payment workflow
  - Test complete collection management workflow
  - _Requirements: All_

- [x] 15. Final checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
