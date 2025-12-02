# Design Document

## Overview

This design addresses the user experience issue where clicking "View" on link-type content in the Member Dashboard navigates to an unnecessary preview page instead of directly opening the external URL. The solution implements content-type-aware view actions that handle links differently from other content types while maintaining security and providing clear user feedback.

## Architecture

### Component Structure

```
MyJstudyroom Component (components/member/MyJstudyroom.tsx)
├── View Action Handler (handleViewContent)
│   ├── Type Detection (isLinkContent)
│   ├── Link Handler (opens in new tab)
│   └── Content Handler (navigates to viewer)
├── Item Rendering
│   ├── Content Type Badge
│   ├── View Button with Tooltip
│   └── Return Button
└── Filtering & Search
```

### Data Flow

1. **User clicks "View" button**
   - Event captured by onClick handler
   - Content type is evaluated
   - Appropriate action is dispatched

2. **For LINK content**
   - Extract linkUrl from metadata
   - Validate URL exists
   - Open in new tab with security attributes
   - Track analytics (optional)

3. **For other content types**
   - Use Next.js Link component
   - Navigate to /member/view/[itemId]
   - Viewer page loads with DRM protection

## Components and Interfaces

### Modified Component: MyJstudyroom

**Location:** `components/member/MyJstudyroom.tsx`

**New Functions:**

```typescript
// Type guard to check if content is a link
function isLinkContent(contentType: string): boolean {
  return contentType === 'LINK';
}

// Extract link URL from item metadata
function getLinkUrl(item: MyJstudyroomItem): string | null {
  // Check metadata for linkUrl
  if (item.metadata && typeof item.metadata === 'object') {
    const metadata = item.metadata as any;
    if (metadata.linkUrl && typeof metadata.linkUrl === 'string') {
      return metadata.linkUrl;
    }
  }
  return null;
}

// Handle view action based on content type
function handleViewContent(item: MyJstudyroomItem): void {
  if (isLinkContent(item.contentType)) {
    const linkUrl = getLinkUrl(item);
    if (linkUrl) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    } else {
      setError('Link URL not found for this item');
    }
  }
  // For non-link content, Next.js Link handles navigation
}
```

**Modified Rendering:**

```typescript
// Replace Link wrapper with conditional rendering
{isLinkContent(item.contentType) ? (
  <Button
    variant="primary"
    size="sm"
    onClick={() => handleViewContent(item)}
    title="Open link in new tab"
  >
    View
  </Button>
) : (
  <Link href={`/member/view/${item.id}`}>
    <Button
      variant="primary"
      size="sm"
      title="View content"
    >
      View
    </Button>
  </Link>
)}
```

### Data Models

**MyJstudyroomItem Interface** (existing, no changes needed):

```typescript
interface MyJstudyroomItem {
  id: string;
  bookShopItemId: string;
  title: string;
  description?: string;
  category: string;
  isFree: boolean;
  addedAt: string;
  documentId: string;
  documentTitle: string;
  contentType: string;  // 'PDF' | 'IMAGE' | 'VIDEO' | 'LINK'
  metadata: any;  // Contains linkUrl for LINK type
}
```

**Metadata Structure for Links:**

```typescript
interface LinkMetadata {
  linkUrl: string;  // The external URL to open
  title?: string;
  description?: string;
  previewImage?: string;
  domain?: string;
  fetchedAt?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Link content opens in new tab

*For any* My jstudyroom item with contentType 'LINK' and a valid linkUrl, clicking the View button should open the linkUrl in a new browser tab without navigating away from the current page.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Non-link content navigates to viewer

*For any* My jstudyroom item with contentType 'PDF', 'IMAGE', or 'VIDEO', clicking the View button should navigate to the viewer page at /member/view/[itemId].

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Invalid link URLs are rejected

*For any* My jstudyroom item with contentType 'LINK' but missing or invalid linkUrl, clicking the View button should display an error message and prevent any navigation.

**Validates: Requirements 1.4**

### Property 4: Security attributes are applied

*For any* link opened in a new tab, the window.open call should include 'noopener,noreferrer' security attributes.

**Validates: Requirements 1.3**

### Property 5: Tooltip text matches action

*For any* View button, the tooltip text should accurately describe the action: "Open link in new tab" for links, "View content" for other types.

**Validates: Requirements 3.1, 3.2**

## Error Handling

### Error Scenarios

1. **Missing Link URL**
   - Detection: Check if linkUrl exists in metadata
   - Response: Display error toast "Link URL not found for this item"
   - Recovery: User can return to list, contact support

2. **Invalid Content Type**
   - Detection: Content type not in ['PDF', 'IMAGE', 'VIDEO', 'LINK']
   - Response: Log error, display "Unsupported content type"
   - Recovery: User can return to list

3. **Popup Blocked**
   - Detection: window.open returns null
   - Response: Display message "Please allow popups for this site"
   - Recovery: User can retry after enabling popups

4. **Network Errors**
   - Detection: Existing error handling in fetchMyJstudyroom
   - Response: Display error with retry option
   - Recovery: Automatic retry with exponential backoff

### Error Display

All errors should use the existing error state mechanism:

```typescript
const [error, setError] = useState<string | null>(null);

// Display error
setError('Link URL not found for this item');

// Clear error
setError(null);
```

## Testing Strategy

### Unit Tests

**Test File:** `components/member/__tests__/MyJstudyroom-link-view.test.tsx`

1. **Test: isLinkContent type guard**
   - Input: Various content types
   - Expected: Returns true only for 'LINK'

2. **Test: getLinkUrl extraction**
   - Input: Items with various metadata structures
   - Expected: Correctly extracts linkUrl or returns null

3. **Test: Error handling for missing linkUrl**
   - Input: Link item without linkUrl
   - Expected: Error message displayed

4. **Test: Tooltip text rendering**
   - Input: Link and non-link items
   - Expected: Correct tooltip text for each type

### Integration Tests

**Test File:** `components/member/__tests__/MyJstudyroom-view-actions.integration.test.tsx`

1. **Test: Link opens in new tab**
   - Setup: Mock window.open
   - Action: Click View on link item
   - Verify: window.open called with correct URL and attributes

2. **Test: Non-link navigates to viewer**
   - Setup: Mock Next.js router
   - Action: Click View on PDF item
   - Verify: Navigation to /member/view/[itemId]

3. **Test: Multiple content types**
   - Setup: List with mixed content types
   - Action: Click View on each
   - Verify: Correct action for each type

### Property-Based Tests

**Test File:** `components/member/__tests__/MyJstudyroom-view-properties.test.tsx`

**Framework:** @fast-check/vitest (for React/TypeScript)

**Configuration:** Minimum 100 iterations per property

1. **Property Test: Link content always opens in new tab**
   - **Feature: member-link-view-fix, Property 1: Link content opens in new tab**
   - Generator: Random link items with valid linkUrl
   - Property: window.open called with linkUrl and security attributes
   - **Validates: Requirements 1.1, 1.2, 1.3**

2. **Property Test: Non-link content always navigates to viewer**
   - **Feature: member-link-view-fix, Property 2: Non-link content navigates to viewer**
   - Generator: Random items with contentType in ['PDF', 'IMAGE', 'VIDEO']
   - Property: Navigation occurs to /member/view/[itemId]
   - **Validates: Requirements 2.1, 2.2, 2.3**

3. **Property Test: Invalid links always show error**
   - **Feature: member-link-view-fix, Property 3: Invalid link URLs are rejected**
   - Generator: Link items with missing/null/invalid linkUrl
   - Property: Error message displayed, no navigation occurs
   - **Validates: Requirements 1.4**

4. **Property Test: Security attributes always present**
   - **Feature: member-link-view-fix, Property 4: Security attributes are applied**
   - Generator: Random link items
   - Property: window.open includes 'noopener,noreferrer'
   - **Validates: Requirements 1.3**

5. **Property Test: Tooltip text always matches action**
   - **Feature: member-link-view-fix, Property 5: Tooltip text matches action**
   - Generator: Random items of all content types
   - Property: Tooltip text is "Open link in new tab" for links, "View content" for others
   - **Validates: Requirements 3.1, 3.2**

### Manual Testing Checklist

1. ✓ Click View on link item - opens in new tab
2. ✓ Click View on PDF item - navigates to viewer
3. ✓ Click View on image item - navigates to viewer
4. ✓ Click View on video item - navigates to viewer
5. ✓ Hover over View button - correct tooltip appears
6. ✓ Link with missing URL - error message displayed
7. ✓ Original page remains after opening link
8. ✓ Multiple links can be opened sequentially

## Implementation Notes

### Security Considerations

1. **XSS Prevention**: All link URLs should be validated before opening
2. **Popup Blockers**: Inform users if popups are blocked
3. **CSRF Protection**: No state changes occur on view action
4. **Session Maintenance**: Original page session remains active

### Performance Considerations

1. **No Additional API Calls**: All data already loaded in item list
2. **Minimal Re-renders**: Only button state changes on interaction
3. **Lazy Loading**: Viewer page only loads for non-link content

### Accessibility

1. **Keyboard Navigation**: View button accessible via Tab key
2. **Screen Readers**: Tooltip text announced on focus
3. **Visual Indicators**: Content type icons provide visual cues
4. **Focus Management**: Focus remains on page after opening link

### Browser Compatibility

1. **window.open**: Supported in all modern browsers
2. **noopener/noreferrer**: Supported in all modern browsers
3. **Fallback**: If window.open fails, display error message

## Migration Strategy

### Deployment Steps

1. **Phase 1**: Update MyJstudyroom component with new logic
2. **Phase 2**: Add unit and integration tests
3. **Phase 3**: Deploy to staging for testing
4. **Phase 4**: Monitor for errors, deploy to production
5. **Phase 5**: Gather user feedback

### Rollback Plan

If issues arise:
1. Revert component changes
2. All links will use preview page (current behavior)
3. No data migration needed
4. No database changes required

### Backward Compatibility

- No API changes required
- No database schema changes
- Existing viewer page remains functional
- No breaking changes to other components
