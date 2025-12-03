# Design Document

## Overview

This design addresses three critical issues in the document preview system:
1. Watermarks appearing by default even when not configured
2. Content not being visible (only watermark showing)
3. Preview displaying in a small window instead of full-size

The solution involves fixing default parameter handling, ensuring proper content layering, and implementing responsive full-viewport display.

## Architecture

### Current Issues

**Issue 1: Default Watermark Behavior**
- `FlipBookContainerWithDRM` has `showWatermark = true` as default parameter
- Even when `showWatermark` is false, the component uses `userEmail` as fallback watermark text
- URL parameter parsing defaults to showing watermark when parameter is missing

**Issue 2: Content Visibility**
- Watermark overlay uses `zIndex: 10` which may interfere with content
- No explicit content layer z-index management
- Watermark styling may be too prominent, obscuring content

**Issue 3: Small Window Display**
- FlipBook dimensions are calculated based on container width (40% for desktop)
- No full-viewport mode for preview
- Padding and margins reduce available space

### Proposed Solution

**Component Hierarchy:**
```
PreviewViewerClient (receives URL params)
  ├─> Parse watermark settings with correct defaults
  ├─> FlipBookContainerWithDRM (for PDFs)
  │     ├─> Pass showWatermark=false by default
  │     ├─> Only pass watermarkText when enabled
  │     └─> FlipBookViewerWithDRM
  │           └─> FlipBookViewer
  │                 └─> Page components with conditional watermark
  ├─> ImageViewer (for images)
  ├─> VideoPlayer (for videos)
  └─> LinkPreview (for links)
```

## Components and Interfaces

### 1. URL Parameter Parsing

**Location:** `app/dashboard/documents/[id]/view/page.tsx`

**Current Implementation:**
```typescript
const enableWatermark = settings.watermark === 'true';
```

**Issue:** When `settings.watermark` is undefined, this evaluates to `false`, which is correct. However, downstream components have default values that override this.

**Fix:** Explicitly pass watermark settings to all viewers, ensuring no component-level defaults override the URL parameters.

### 2. FlipBookContainerWithDRM Component

**Location:** `components/flipbook/FlipBookContainerWithDRM.tsx`

**Current Implementation:**
```typescript
export function FlipBookContainerWithDRM({
  enableScreenshotPrevention = true,
  showWatermark = true,  // ❌ PROBLEM: Defaults to true
  watermarkText,
  userEmail,
  ...
}: FlipBookContainerWithDRMProps) {
  // ❌ PROBLEM: Uses userEmail even when showWatermark is false
  const effectiveWatermark = showWatermark ? (watermarkText || userEmail) : undefined;
```

**Proposed Changes:**
```typescript
export function FlipBookContainerWithDRM({
  enableScreenshotPrevention = true,
  showWatermark = false,  // ✅ FIX: Default to false
  watermarkText,
  userEmail,
  ...
}: FlipBookContainerWithDRMProps) {
  // ✅ FIX: Only use watermark when explicitly enabled
  const effectiveWatermark = showWatermark && watermarkText ? watermarkText : undefined;
```

### 3. Page Component Watermark Rendering

**Location:** `components/flipbook/FlipBookViewer.tsx` (Page component)

**Current Implementation:**
```typescript
{watermarkText && (
  <div className="absolute inset-0 pointer-events-none flex items-center justify-center"
       style={{ zIndex: 10, opacity: '1 !important' }}>
    <div style={{ opacity: 0.2 }}>
      {watermarkText}
    </div>
  </div>
)}
```

**Issues:**
- `zIndex: 10` may be too high
- Multiple opacity declarations are confusing
- Watermark always renders if `watermarkText` is truthy

**Proposed Changes:**
```typescript
{watermarkText && (
  <div className="absolute inset-0 pointer-events-none flex items-center justify-center"
       style={{ 
         zIndex: 1,  // ✅ Lower z-index, content should be z-index: 0
         opacity: 0.2,  // ✅ Single opacity value
       }}>
    <div className="text-gray-400 text-4xl font-bold transform rotate-[-45deg] select-none"
         style={{
           textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
           transform: 'rotate(-45deg) translateZ(0)',
         }}>
      {watermarkText}
    </div>
  </div>
)}
```

### 4. Full-Size Display

**Location:** `components/flipbook/FlipBookViewer.tsx` (dimension calculation)

**Current Implementation:**
```typescript
const pageWidth = mobile ? containerWidth * 0.9 : containerWidth * 0.4;  // ❌ Only 40% on desktop
const pageHeight = pageWidth * 1.414;
```

**Proposed Changes:**
```typescript
// ✅ Use more of the available space
const pageWidth = mobile ? containerWidth * 0.95 : containerWidth * 0.8;
const pageHeight = Math.min(pageWidth * 1.414, containerHeight * 0.9);
```

**Container Styling:**
```typescript
<div className="relative w-full h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
  {/* ✅ Use h-screen for full viewport height */}
  <div className="flex items-center justify-center w-full h-full p-4">
    {/* ✅ Reduce padding from p-8 to p-4 */}
    <HTMLFlipBook ... />
  </div>
</div>
```

## Data Models

### WatermarkSettings Interface

```typescript
interface WatermarkSettings {
  enabled: boolean;           // Explicit enabled flag
  text?: string;              // Optional text (only used when enabled)
  opacity?: number;           // Opacity (0.1 - 0.8)
  fontSize?: number;          // Font size in pixels
  image?: string;             // Base64 image data (alternative to text)
}
```

### PreviewSettings Interface

```typescript
interface PreviewSettings {
  watermark: WatermarkSettings;
  fullscreen?: boolean;
  zoom?: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Watermark default state

*For any* preview request without explicit watermark configuration, the system should display content without any watermark overlay
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Content visibility precedence

*For any* document preview, the actual content should always be visible and readable, with watermarks (if enabled) overlaid at a lower visual priority
**Validates: Requirements 2.1, 2.4, 2.5**

### Property 3: Full viewport utilization

*For any* browser viewport size, the preview should utilize at least 80% of the available width and 90% of the available height
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: URL parameter consistency

*For any* watermark URL parameter value, the rendered preview should match the specified configuration exactly
**Validates: Requirements 1.4, 4.5**

### Property 5: Watermark conditional rendering

*For any* preview with watermark disabled, no watermark-related DOM elements should be rendered in the page
**Validates: Requirements 5.2**

## Error Handling

### Missing URL Parameters
- **Scenario:** User opens preview without watermark parameter
- **Handling:** Default to `watermark=false`, display clean content
- **User Feedback:** None needed (expected behavior)

### Invalid URL Parameters
- **Scenario:** Malformed watermark settings in URL
- **Handling:** Parse what's valid, use safe defaults for invalid values
- **User Feedback:** Console warning for debugging
- **Example:** `watermarkOpacity=invalid` → default to 0.3

### Content Loading Failures
- **Scenario:** Document pages fail to load
- **Handling:** Show error message with retry option
- **User Feedback:** Clear error message explaining the issue
- **Fallback:** Offer return to dashboard

### Watermark Rendering Issues
- **Scenario:** Watermark text or image fails to render
- **Handling:** Continue showing content without watermark
- **User Feedback:** Console warning only
- **Rationale:** Content visibility is more important than watermark

## Testing Strategy

### Unit Tests

**Test File:** `components/flipbook/__tests__/FlipBookContainerWithDRM.test.tsx`

1. **Test watermark default behavior**
   - Render component without `showWatermark` prop
   - Assert no watermark elements in DOM
   - Assert content is visible

2. **Test watermark enabled behavior**
   - Render with `showWatermark=true` and `watermarkText="Test"`
   - Assert watermark element exists
   - Assert watermark text matches input

3. **Test watermark disabled behavior**
   - Render with `showWatermark=false` and `watermarkText="Test"`
   - Assert no watermark elements in DOM
   - Assert watermarkText is ignored

**Test File:** `app/dashboard/documents/[id]/view/__tests__/PreviewViewerClient.test.tsx`

4. **Test URL parameter parsing**
   - Test with `watermark=true` → watermark enabled
   - Test with `watermark=false` → watermark disabled
   - Test with no watermark param → watermark disabled
   - Test with invalid watermark param → watermark disabled

5. **Test full-size display**
   - Mock viewport dimensions
   - Assert FlipBook uses >80% of width
   - Assert FlipBook uses >90% of height

### Integration Tests

**Test File:** `app/dashboard/documents/[id]/view/__tests__/preview-display.integration.test.tsx`

6. **Test end-to-end preview flow**
   - Navigate from settings page with watermark disabled
   - Assert preview opens in new tab
   - Assert no watermark visible
   - Assert content fills viewport

7. **Test watermark toggle flow**
   - Navigate with watermark enabled
   - Assert watermark appears
   - Navigate with watermark disabled
   - Assert watermark disappears

### Visual Regression Tests

8. **Test content visibility**
   - Capture screenshot of preview without watermark
   - Assert content is clearly visible
   - Assert no watermark artifacts

9. **Test full-size rendering**
   - Capture screenshot at various viewport sizes
   - Assert content scales appropriately
   - Assert no unnecessary whitespace

## Implementation Notes

### Z-Index Management

Establish clear z-index layers:
- Content layer: `z-index: 0` (base layer)
- Watermark layer: `z-index: 1` (subtle overlay)
- Controls layer: `z-index: 10` (navigation buttons)
- Modals layer: `z-index: 50` (dialogs, tooltips)

### Performance Considerations

- Watermark rendering should not impact page flip performance
- Use CSS transforms for watermark positioning (GPU accelerated)
- Avoid re-rendering watermark on every page flip
- Memoize watermark component when enabled

### Accessibility

- Watermark should not interfere with screen readers
- Use `aria-hidden="true"` on watermark elements
- Ensure content remains accessible when watermark is present
- Maintain keyboard navigation regardless of watermark state

### Browser Compatibility

- Test watermark rendering across browsers (Chrome, Firefox, Safari, Edge)
- Ensure full-size display works on all viewport sizes
- Verify URL parameter parsing is consistent
- Test on mobile devices (iOS Safari, Chrome Mobile)

## Migration Strategy

### Phase 1: Fix Default Behavior (High Priority)
1. Update `FlipBookContainerWithDRM` default parameter to `showWatermark = false`
2. Fix watermark text fallback logic
3. Deploy and verify no watermarks appear by default

### Phase 2: Fix Content Visibility (High Priority)
1. Adjust watermark z-index to 1
2. Ensure content has z-index: 0
3. Test watermark opacity doesn't obscure content
4. Deploy and verify content is always visible

### Phase 3: Implement Full-Size Display (Medium Priority)
1. Update dimension calculations for larger display
2. Reduce padding/margins
3. Test responsive behavior
4. Deploy and verify full-viewport usage

### Phase 4: Add Tests (Medium Priority)
1. Write unit tests for watermark behavior
2. Write integration tests for preview flow
3. Add visual regression tests
4. Set up CI to run tests on every PR

## Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback:** Revert to previous component versions
2. **Partial Rollback:** Keep URL parameter fixes, revert display changes
3. **Feature Flag:** Add environment variable to toggle new behavior
4. **Gradual Rollout:** Deploy to staging first, then production

## Monitoring and Metrics

Track the following metrics post-deployment:

- **Watermark Usage:** % of previews with watermark enabled vs disabled
- **Error Rate:** Preview loading failures before/after changes
- **User Feedback:** Support tickets related to preview display
- **Performance:** Page flip performance with/without watermark
- **Browser Stats:** Preview usage by browser/device type

## Future Enhancements

1. **Watermark Presets:** Save common watermark configurations
2. **Dynamic Watermark:** Change watermark per page
3. **Watermark Positioning:** Allow users to choose watermark position
4. **Watermark Patterns:** Support repeating watermark patterns
5. **Print Protection:** Enhanced watermark for print attempts
