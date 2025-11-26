# Design Document

## Overview

The enhanced Member Dashboard provides a comprehensive Study Room and BookShop experience for jStudyRoom members. The system consists of three main areas:

1. **Dashboard**: Overview of collection status with quick navigation
2. **BookShop**: Hierarchical catalog for browsing and discovering content
3. **Study Room (My jstudyroom)**: Personal collection management

The design leverages the existing database schema and extends it with improved UI components, better category organization, and seamless integration between browsing and collection management.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Member Dashboard                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Dashboard  │  │   BookShop   │  │ Study Room   │     │
│  │   Overview   │  │   Catalog    │  │  Collection  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  /api/       │  │  /api/       │  │  /api/       │     │
│  │  bookshop    │  │  member/     │  │  payment     │     │
│  │              │  │  my-jstudyroom│  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer (Prisma)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   User       │  │  BookShopItem│  │  MyJstudyroom│     │
│  │   Document   │  │              │  │  Payment     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Prisma ORM
- **Payment**: Razorpay integration (existing)
- **Authentication**: NextAuth.js (existing)

## Components and Interfaces

### 1. Dashboard Component (`app/member/page.tsx`)

**Purpose**: Display collection overview and quick navigation

**Key Features**:
- Welcome section with member name
- Three stat cards (free, paid, total documents)
- Quick action cards for navigation
- Information section about limits

**State Management**:
- Server-side data fetching for user stats
- No client-side state needed (static display)

### 2. BookShop Component (`components/member/BookShop.tsx`)

**Purpose**: Browse and discover content with hierarchical categories

**Key Features**:
- Category/subcategory filtering
- Content type filtering
- Search functionality
- Grid display of items
- "Add to Study Room" action

**State Management**:
```typescript
interface BookShopState {
  items: BookShopItem[];
  filteredItems: BookShopItem[];
  selectedCategory: string;
  selectedContentType: string;
  searchQuery: string;
  loading: boolean;
  error: string | null;
}
```

### 3. BookShop Item Card (`components/member/BookShopItemCard.tsx`)

**Purpose**: Display individual content item with actions

**Props**:
```typescript
interface BookShopItemCardProps {
  item: BookShopItem;
  onAddToMyJstudyroom: (itemId: string) => Promise<void>;
}
```

**Features**:
- Thumbnail/preview display
- Title, description, category
- Content type icon
- Free/paid indicator with price
- "Add to Study Room" button (disabled if in collection or limit reached)
- "Already in Study Room" badge

### 4. Study Room Component (`components/member/MyJstudyroom.tsx`)

**Purpose**: Manage personal collection

**Key Features**:
- Display all collected items
- Filter by content type and free/paid
- Search functionality
- View and remove actions
- Collection stats display

**State Management**:
```typescript
interface StudyRoomState {
  items: MyJstudyroomItem[];
  filteredItems: MyJstudyroomItem[];
  selectedContentType: string;
  selectedPriceType: 'all' | 'free' | 'paid';
  searchQuery: string;
  loading: boolean;
}
```

### 5. Category Management (`lib/bookshop-categories.ts`)

**Purpose**: Define and manage hierarchical categories

**Structure**:
```typescript
interface CategoryStructure {
  name: string;
  subcategories?: string[];
}

const BOOKSHOP_CATEGORIES: CategoryStructure[] = [
  {
    name: 'Maths',
    subcategories: [
      'CBSE - 1st Standard',
      'CBSE - 2nd Standard',
      // ... through 10th
    ]
  },
  {
    name: 'Functional MRI',
    subcategories: []
  },
  {
    name: 'Music',
    subcategories: []
  }
];
```

**Helper Functions**:
- `getAllCategories()`: Flat list for dropdowns
- `getCategoryStructure()`: Hierarchical structure
- `parseCategory()`: Parse "Parent > Child" format
- `getContentTypeLabel()`: Get display label for content type

## Data Models

### Existing Models (No Changes Required)

The system uses existing Prisma models:

**User Model**:
```prisma
model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  name               String?
  userRole           UserRole @default(PLATFORM_USER)
  freeDocumentCount  Int      @default(0)
  paidDocumentCount  Int      @default(0)
  // ... other fields
}
```

**BookShopItem Model**:
```prisma
model BookShopItem {
  id          String   @id @default(cuid())
  documentId  String
  title       String
  description String?
  category    String
  isFree      Boolean  @default(true)
  price       Float?
  isPublished Boolean  @default(false)
  // ... relations
}
```

**MyJstudyroom Model**:
```prisma
model MyJstudyroom {
  id             String   @id @default(cuid())
  userId         String
  bookShopItemId String
  addedAt        DateTime @default(now())
  // ... relations
}
```

### Category Storage

Categories are stored as strings in the format:
- Top-level: `"Maths"`, `"Music"`, `"Functional MRI"`
- With subcategory: `"Maths > CBSE - 1st Standard"`

This approach:
- Maintains backward compatibility
- Allows flexible category expansion
- Simplifies filtering and display

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing the prework analysis, several properties can be consolidated:

**Redundancies Identified**:
1. Properties 7.1-7.5 (icon display for each content type) can be combined into one property about content type icon mapping
2. Properties 8.1 and 8.2 (counting free vs paid items) can be combined into one property about count calculation
3. Property 4.5 and 8.5 are covered by the add/remove operations themselves
4. Property 5.5 is redundant with 5.4 (if counter decrements, slot is available)
5. Properties 1.2 can be split - the display is an example, but the count calculation is a property

**Consolidated Properties**:
- Content type icons: One property covering all content types
- Document counting: One property covering both free and paid counts
- Filtering: Combine similar filtering properties where appropriate

### Correctness Properties

Property 1: Dashboard displays correct document counts
*For any* member with a Study Room collection, the dashboard SHALL display free count, paid count, and total count that accurately reflect the number of free items, paid items, and sum of both in the collection
**Validates: Requirements 1.2**

Property 2: Navigation cards route correctly
*For any* quick action card on the dashboard, clicking the card SHALL navigate to the URL corresponding to that card's target section
**Validates: Requirements 1.4**

Property 3: BookShop displays only published items
*For any* set of BookShop items where some are published and some are unpublished, the BookShop view SHALL display only items where isPublished is true
**Validates: Requirements 2.1**

Property 4: Category filtering is accurate
*For any* selected category or subcategory filter and any set of BookShop items, the filtered results SHALL contain only items whose category matches the selected filter
**Validates: Requirements 2.3**

Property 5: Content type filtering is accurate
*For any* selected content type filter and any set of items, the filtered results SHALL contain only items whose contentType matches the selected filter
**Validates: Requirements 2.4**

Property 6: Search filtering matches title and description
*For any* search query and any set of items, the filtered results SHALL contain only items where the query appears in the title or description (case-insensitive)
**Validates: Requirements 2.5**

Property 7: BookShop items display all required fields
*For any* BookShop item, the rendered card SHALL contain the item's title, description, category, and content type
**Validates: Requirements 3.1**

Property 8: Pricing information is displayed correctly
*For any* BookShop item, if isFree is true the card SHALL show "Free", otherwise it SHALL show "Paid" with the price amount
**Validates: Requirements 3.2**

Property 9: Thumbnail display is conditional
*For any* BookShop item, if a thumbnail URL exists the card SHALL display the thumbnail, otherwise it SHALL display a placeholder or content type icon
**Validates: Requirements 3.3**

Property 10: Collection status is indicated
*For any* BookShop item, if the item exists in the member's Study Room the card SHALL display an "In My Study Room" indicator
**Validates: Requirements 3.4**

Property 11: Link items show URL and metadata
*For any* BookShop item where contentType is LINK, the card SHALL display the linkUrl and any available metadata
**Validates: Requirements 3.5**

Property 12: Adding free items increments free count
*For any* free BookShop item and any member with available free slots, adding the item to Study Room SHALL increment the member's freeDocumentCount by 1 and create a MyJstudyroom record
**Validates: Requirements 4.1**

Property 13: Adding paid items triggers payment
*For any* paid BookShop item and any member with available paid slots, clicking "Add to Study Room" SHALL display the payment modal with the item's details and price
**Validates: Requirements 4.2**

Property 14: Added items show collection status
*For any* BookShop item that is successfully added to Study Room, the item's card SHALL update to display the "In My Study Room" status
**Validates: Requirements 4.5**

Property 15: Study Room displays all collection items
*For any* member's Study Room collection, the Study Room view SHALL display all MyJstudyroom records for that member
**Validates: Requirements 5.1**

Property 16: Study Room items display required fields
*For any* Study Room item, the rendered card SHALL contain the item's title, description, content type, and free/paid status
**Validates: Requirements 5.2**

Property 17: Removing items decrements correct counter
*For any* Study Room item, removing it SHALL decrement either freeDocumentCount or paidDocumentCount based on whether the item is free or paid, and delete the MyJstudyroom record
**Validates: Requirements 5.4**

Property 18: Study Room search filters correctly
*For any* search query in Study Room and any collection, the filtered results SHALL contain only items where the query appears in the title or description
**Validates: Requirements 6.1**

Property 19: Study Room content type filter works
*For any* selected content type filter in Study Room and any collection, the filtered results SHALL contain only items matching that content type
**Validates: Requirements 6.2**

Property 20: Study Room price type filter works
*For any* selected price type filter (free/paid) in Study Room and any collection, the filtered results SHALL contain only items matching that price type
**Validates: Requirements 6.3**

Property 21: Filter count display is accurate
*For any* applied filters in Study Room, the count display SHALL show the number of filtered items and the total number of items in the collection
**Validates: Requirements 6.4**

Property 22: Clearing filters shows all items
*For any* Study Room view with applied filters, clearing all filters SHALL display all items in the collection
**Validates: Requirements 6.5**

Property 23: Content type icons are correct
*For any* content item with a contentType, the displayed icon SHALL match the contentType (PDF→📄, IMAGE→🖼️, VIDEO→🎥, LINK→🔗, AUDIO→🎵)
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

Property 24: Document counts are calculated correctly
*For any* member's Study Room collection, freeDocumentCount SHALL equal the number of items where isFree is true, and paidDocumentCount SHALL equal the number of items where isFree is false
**Validates: Requirements 8.1, 8.2**

Property 25: Payment modal displays item details
*For any* paid BookShop item, when the payment modal opens it SHALL display the item's title, description, and price
**Validates: Requirements 9.1**

Property 26: Successful payment adds item
*For any* paid item where payment is successfully verified, the system SHALL add the item to Study Room, increment paidDocumentCount, and create a Payment record
**Validates: Requirements 9.2, 9.5**

Property 27: Payment cancellation prevents addition
*For any* paid item where payment is cancelled, the system SHALL close the modal without adding the item to Study Room or incrementing any counters
**Validates: Requirements 9.3**

Property 28: Admin form validates required fields
*For any* BookShop item creation attempt, the form SHALL require category, title, description, content type, and free/paid designation before allowing submission
**Validates: Requirements 10.1, 10.3**

Property 29: Paid items require valid price
*For any* BookShop item where isFree is false, the form SHALL require a price value greater than zero before allowing submission
**Validates: Requirements 10.4**

Property 30: Publishing makes items visible
*For any* BookShop item, setting isPublished to true SHALL make the item appear in the member BookShop view
**Validates: Requirements 10.5**

## Error Handling

### Client-Side Errors

1. **Network Failures**
   - Display user-friendly error messages
   - Provide retry mechanisms
   - Maintain UI state during failures

2. **Validation Errors**
   - Show inline validation messages
   - Prevent invalid form submissions
   - Highlight problematic fields

3. **Limit Exceeded Errors**
   - Display clear messages about collection limits
   - Suggest removing items to make space
   - Disable add buttons when limits reached

### Server-Side Errors

1. **Database Errors**
   - Log errors for debugging
   - Return appropriate HTTP status codes
   - Provide generic error messages to users

2. **Payment Errors**
   - Handle Razorpay failures gracefully
   - Prevent duplicate charges
   - Maintain transaction integrity

3. **Authorization Errors**
   - Verify member role before operations
   - Return 403 for unauthorized access
   - Redirect to login if session expired

### Error Recovery

1. **Optimistic Updates**
   - Update UI immediately for better UX
   - Revert changes if server operation fails
   - Show loading states during operations

2. **Data Consistency**
   - Use database transactions for multi-step operations
   - Validate counts before add/remove operations
   - Prevent race conditions with proper locking

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

1. **Component Rendering**
   - Dashboard displays with correct user data
   - BookShop renders with empty state
   - Study Room shows "no items" message when empty

2. **Edge Cases**
   - Adding items when at limit (4.3, 4.4)
   - Removing last item from collection
   - Filtering with no matches
   - Payment failure scenarios (9.4)
   - Button states at capacity limits (8.3, 8.4)

3. **Helper Functions**
   - Category parsing logic
   - Content type icon mapping
   - Price formatting

### Property-Based Testing

Property-based tests will verify universal properties using **fast-check** (JavaScript/TypeScript PBT library). Each test will run a minimum of 100 iterations with randomly generated inputs.

**Test Configuration**:
```typescript
import fc from 'fast-check';

// Run each property test with 100 iterations
fc.assert(property, { numRuns: 100 });
```

**Property Test Structure**:
Each property-based test MUST:
1. Be tagged with a comment referencing the design document property
2. Generate random valid inputs using fast-check arbitraries
3. Execute the operation under test
4. Assert the property holds for all generated inputs

**Example Property Test Format**:
```typescript
/**
 * Feature: member-study-room-bookshop, Property 12: Adding free items increments free count
 */
test('adding free items increments free count', () => {
  fc.assert(
    fc.property(
      fc.record({
        // Generate random test data
      }),
      async (testData) => {
        // Test the property
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property Tests to Implement**:

1. **Dashboard Properties**
   - Property 1: Document count display accuracy
   - Property 2: Navigation routing

2. **BookShop Filtering Properties**
   - Property 3: Published items only
   - Property 4: Category filtering
   - Property 5: Content type filtering
   - Property 6: Search filtering

3. **BookShop Display Properties**
   - Property 7: Required fields display
   - Property 8: Pricing display
   - Property 9: Thumbnail display
   - Property 10: Collection status
   - Property 11: Link metadata display

4. **Collection Management Properties**
   - Property 12: Free item addition
   - Property 13: Payment trigger
   - Property 14: Status update after add
   - Property 17: Counter decrement on remove
   - Property 24: Count calculation

5. **Study Room Properties**
   - Property 15: Display all items
   - Property 16: Required fields
   - Property 18-22: Filtering properties

6. **UI Properties**
   - Property 23: Content type icons

7. **Payment Properties**
   - Property 25-27: Payment flow

8. **Admin Properties**
   - Property 28-30: Form validation and publishing

### Integration Testing

Integration tests will verify end-to-end workflows:

1. **Browse and Add Workflow**
   - Member browses BookShop
   - Filters by category
   - Adds free item to Study Room
   - Verifies item appears in collection

2. **Payment Workflow**
   - Member selects paid item
   - Completes payment
   - Item added to Study Room
   - Payment record created

3. **Collection Management Workflow**
   - Member views Study Room
   - Filters collection
   - Removes item
   - Verifies count updates

4. **Admin Content Management**
   - Admin creates BookShop item
   - Sets category and pricing
   - Publishes item
   - Verifies visibility in member view

### Test Data Generators

For property-based testing, we'll create generators for:

```typescript
// Generate random BookShop items
const bookShopItemArbitrary = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 500 })),
  category: fc.oneof(
    fc.constant('Maths > CBSE - 1st Standard'),
    fc.constant('Maths > CBSE - 2nd Standard'),
    // ... other categories
    fc.constant('Music'),
    fc.constant('Functional MRI')
  ),
  contentType: fc.oneof(
    fc.constant('PDF'),
    fc.constant('IMAGE'),
    fc.constant('VIDEO'),
    fc.constant('LINK'),
    fc.constant('AUDIO')
  ),
  isFree: fc.boolean(),
  price: fc.option(fc.float({ min: 1, max: 10000 })),
  isPublished: fc.boolean()
});

// Generate random member states
const memberStateArbitrary = fc.record({
  freeDocumentCount: fc.integer({ min: 0, max: 5 }),
  paidDocumentCount: fc.integer({ min: 0, max: 5 })
});

// Generate random collections
const collectionArbitrary = fc.array(bookShopItemArbitrary, { maxLength: 10 });
```

## Performance Considerations

### Database Optimization

1. **Indexing**
   - Index on `BookShopItem.category` for filtering
   - Index on `BookShopItem.isPublished` for member queries
   - Index on `MyJstudyroom.userId` for collection lookups
   - Composite index on `(userId, bookShopItemId)` for duplicate checks

2. **Query Optimization**
   - Use `select` to fetch only needed fields
   - Implement pagination for large catalogs
   - Cache category structure (static data)

3. **N+1 Query Prevention**
   - Use `include` to fetch related data in single query
   - Batch operations where possible

### Client-Side Optimization

1. **State Management**
   - Debounce search input (300ms)
   - Memoize filtered results
   - Use React.memo for item cards

2. **Loading States**
   - Show skeletons during data fetch
   - Implement optimistic updates
   - Cache BookShop data client-side

3. **Image Optimization**
   - Use Next.js Image component
   - Lazy load thumbnails
   - Implement responsive images

## Security Considerations

### Authorization

1. **Role Verification**
   - Verify MEMBER or ADMIN role on all routes
   - Check ownership before Study Room operations
   - Validate session on every API call

2. **Data Access**
   - Members can only access their own Study Room
   - Members can only view published BookShop items
   - Admins can manage all BookShop items

### Input Validation

1. **Client-Side**
   - Validate form inputs before submission
   - Sanitize search queries
   - Limit input lengths

2. **Server-Side**
   - Validate all API inputs
   - Check collection limits before operations
   - Verify payment signatures from Razorpay

### Data Integrity

1. **Transaction Safety**
   - Use database transactions for add/remove operations
   - Prevent duplicate additions
   - Maintain count consistency

2. **Payment Security**
   - Verify payment signatures
   - Prevent replay attacks
   - Log all payment attempts

## Deployment Considerations

### Database Migration

No schema changes required - using existing models.

### Environment Variables

Existing variables are sufficient:
- `DATABASE_URL`: PostgreSQL connection
- `RAZORPAY_KEY_ID`: Payment integration
- `RAZORPAY_KEY_SECRET`: Payment verification

### Rollout Strategy

1. **Phase 1**: Deploy enhanced UI components
2. **Phase 2**: Enable category filtering
3. **Phase 3**: Test payment integration
4. **Phase 4**: Monitor performance and user feedback

### Monitoring

1. **Metrics to Track**
   - BookShop item views
   - Add to Study Room success rate
   - Payment completion rate
   - Collection limit reached frequency
   - Search query patterns

2. **Error Tracking**
   - Failed add operations
   - Payment failures
   - API errors
   - Client-side exceptions

## Future Enhancements

1. **Category Expansion**
   - Add more subjects and standards
   - Support custom categories
   - Implement category suggestions

2. **Collection Features**
   - Favorites/bookmarks
   - Notes on items
   - Sharing collections
   - Export collection list

3. **Recommendations**
   - Suggest items based on collection
   - Popular items in category
   - Recently added items

4. **Analytics**
   - Member engagement metrics
   - Popular categories
   - Conversion rates
   - Usage patterns
