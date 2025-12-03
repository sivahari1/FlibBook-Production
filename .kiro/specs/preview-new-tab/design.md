# Design Document

## Overview

This design enhances the document preview functionality to properly open in a new browser tab with appropriate security attributes. The current implementation uses `window.open()` but lacks proper security attributes (`rel="noopener noreferrer"`). We'll convert the button to use a proper link element with `target="_blank"` and security attributes, while maintaining the button styling and functionality.

## Architecture

### Current Flow
1. User clicks "Preview" button in DocumentCard
2. Button calls `window.open('/dashboard/documents/${document.id}/preview', '_blank')`
3. Preview opens in new tab ✓
4. Missing security attributes ✗

### Enhanced Flow
1. User clicks "Preview" button/link in DocumentCard
2. Link with `target="_blank"` and `rel="noopener noreferrer"` opens preview
3. Preview opens in new tab securely ✓
4. Keyboard navigation supported (Ctrl+Click, Cmd+Click) ✓
5. Right-click context menu available ✓

## Components and Interfaces

### DocumentCard Component
**File:** `components/dashboard/DocumentCard.tsx`

**Current Implementation:**
```typescript
<Button
  size="sm"
  variant="secondary"
  onClick={() => window.open(`/dashboard/documents/${document.id}/preview`, '_blank')}
>
  Preview
</Button>
```

**Enhanced Implementation:**
```typescript
<Button
  size="sm"
  variant="secondary"
  asChild
>
  <a
    href={`/dashboard/documents/${document.id}/preview`}
    target="_blank"
    rel="noopener noreferrer"
  >
    <svg className="w-4 h-4 mr-1" ...>...</svg>
    Preview
  </a>
</Button>
```

### Button Component Enhancement
**File:** `components/ui/Button.tsx`

The Button component needs to support the `asChild` prop pattern (similar to Radix UI) to allow rendering as a link while maintaining button styling.

**Key Changes:**
- Add `asChild` prop to Button component
- When `asChild` is true, render children directly with button classes
- Maintain all existing button variants and sizes
- Ensure proper TypeScript types

## Data Models

No database schema changes required. This is purely a UI/UX enhancement.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework:

1.1. WHEN a user clicks the preview button on a document THEN the system SHALL open the preview in a new browser tab
Thoughts: This is testing that clicking the preview button opens in a new tab. We can test this by simulating a click and verifying the link has target="_blank"
Testable: yes - example

1.2. WHEN the preview opens in a new tab THEN the system SHALL maintain the user's position in the dashboard
Thoughts: This is testing that the dashboard state is preserved. This is a browser behavior that happens automatically when opening in a new tab.
Testable: no

1.3. WHEN a user closes the preview tab THEN the system SHALL return focus to the original dashboard tab
Thoughts: This is browser behavior, not something we control in the application.
Testable: no

1.4. WHEN the preview link is generated THEN the system SHALL include appropriate security attributes (rel="noopener noreferrer")
Thoughts: This is testing that the link has the correct security attributes. We can test this by rendering the component and checking the link attributes.
Testable: yes - property

1.5. WHEN a user right-clicks the preview button THEN the system SHALL allow standard browser context menu options (open in new tab, copy link, etc.)
Thoughts: This is testing that the element is a proper link. We can verify this by checking that the element is an anchor tag.
Testable: yes - example

2.1. WHEN a preview link opens in a new tab THEN the system SHALL include rel="noopener noreferrer" for security
Thoughts: This is the same as 1.4 - testing security attributes. This is redundant.
Testable: yes - property (redundant with 1.4)

2.2. WHEN a preview button is rendered THEN the system SHALL be keyboard accessible
Thoughts: This is testing accessibility. We can verify the element is focusable and responds to keyboard events.
Testable: yes - property

2.3. WHEN the preview functionality is implemented THEN the system SHALL maintain all existing preview features (watermark settings, sharing, etc.)
Thoughts: This is testing that we don't break existing functionality. This is covered by existing tests.
Testable: no

2.4. WHEN users navigate using keyboard THEN the system SHALL support standard keyboard shortcuts for opening in new tab (Ctrl+Click, Cmd+Click)
Thoughts: This is browser behavior for links. If we use a proper anchor tag, this works automatically.
Testable: yes - example

### Property Reflection:

After reviewing the properties:
- Property 1.4 and 2.1 are identical - both test security attributes. Keep only one.
- Property 1.2 and 1.3 are browser behaviors, not testable application properties
- Property 2.3 is covered by existing test suites
- Properties 1.1, 1.5, and 2.4 are examples testing specific scenarios

**Consolidated Properties:**
- Keep 1.1 as example (new tab opening)
- Keep 1.4 (security attributes - remove 2.1 as duplicate)
- Keep 1.5 as example (right-click context menu)
- Keep 2.2 (keyboard accessibility)
- Keep 2.4 as example (keyboard shortcuts)

### Correctness Properties:

Property 1: Security attributes present
*For any* preview link rendered in the application, the link element should have both target="_blank" and rel="noopener noreferrer" attributes
**Validates: Requirements 1.4, 2.1**

Property 2: Keyboard accessibility
*For any* preview button/link, the element should be keyboard focusable and activatable via Enter or Space key
**Validates: Requirements 2.2**

## Error Handling

No new error scenarios introduced. All existing preview error handling remains unchanged:
- Document not found (404)
- Access denied (403)
- Conversion failures
- Page loading errors

## Testing Strategy

### Unit Tests
- Test Button component with `asChild` prop
- Test preview link rendering with correct attributes
- Test button styling is maintained when rendered as link
- Test keyboard focus and activation

### Property-Based Tests
We will use **fast-check** (JavaScript/TypeScript property-based testing library) for property-based testing.

Each property-based test should run a minimum of 100 iterations to ensure thorough coverage of the input space.

Property tests will be tagged with comments referencing the design document:
- Format: `// Feature: preview-new-tab, Property N: [property description]`

### Integration Tests
- Test clicking preview button opens new tab
- Test right-click context menu is available
- Test keyboard shortcuts (Ctrl+Click, Cmd+Click)
- Test all existing preview features still work

### Manual Testing
- Click preview button and verify new tab opens
- Right-click preview button and verify context menu
- Use Ctrl+Click (Windows/Linux) or Cmd+Click (Mac) to open in new tab
- Verify dashboard state is preserved
- Test keyboard navigation (Tab to button, Enter to activate)

## Implementation Notes

### Button Component `asChild` Pattern

The `asChild` prop pattern allows a component to delegate rendering to its child while maintaining its styling and behavior. This is commonly used in component libraries like Radix UI.

**Example:**
```typescript
// Without asChild - renders as button
<Button variant="primary">Click me</Button>
// Renders: <button class="btn-primary">Click me</button>

// With asChild - renders as child element with button styling
<Button variant="primary" asChild>
  <a href="/link">Click me</a>
</Button>
// Renders: <a href="/link" class="btn-primary">Click me</a>
```

### Security Considerations

**Why `rel="noopener noreferrer"`?**

- `noopener`: Prevents the new page from accessing `window.opener`, protecting against reverse tabnabbing attacks
- `noreferrer`: Prevents the browser from sending the referrer header, enhancing privacy

This is a security best practice when using `target="_blank"`.

### Accessibility Considerations

Using a proper `<a>` tag instead of `window.open()` provides:
- Native keyboard support (Enter key, Ctrl+Click, Cmd+Click)
- Screen reader compatibility
- Right-click context menu
- Browser's "Open in new tab" functionality
- Link preview on hover (browser status bar)

## Alternative Approaches Considered

### 1. Keep `window.open()` with security
**Pros:** Minimal code changes
**Cons:** 
- No keyboard shortcuts support
- No right-click context menu
- Not semantically correct (button vs link)
- Harder to test

### 2. Use Next.js Link component
**Pros:** Framework-native solution
**Cons:**
- Next.js Link doesn't support `target="_blank"` well
- Would need custom styling to look like button
- More complex implementation

### 3. Use anchor tag styled as button (Chosen)
**Pros:**
- Semantically correct (link for navigation)
- Full keyboard support
- Right-click context menu
- Easy to test
- Maintains button styling via `asChild` pattern
**Cons:**
- Requires Button component enhancement

## Migration Path

1. Enhance Button component to support `asChild` prop
2. Update DocumentCard to use link with button styling
3. Test all preview functionality
4. Deploy changes

No breaking changes - all existing functionality preserved.
