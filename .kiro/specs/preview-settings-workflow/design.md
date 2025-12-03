# Design Document

## Overview

This design restructures the preview workflow to provide a better user experience. Currently, clicking "Preview" opens the preview settings page in the same tab, but watermark is mandatory. We need to:

1. Keep the preview settings dialog opening in the same tab (current behavior ✓)
2. Make watermark optional instead of mandatory
3. After configuring settings, open the actual preview in a new tab with full view

## Architecture

### Current Flow
1. User clicks "Preview" button in DocumentCard
2. Link navigates to `/dashboard/documents/${id}/preview` in **new tab** (via `target="_blank"`)
3. Preview settings page loads with watermark as **mandatory**
4. User configures watermark and clicks "Start Preview"
5. Preview displays in the same tab

### Enhanced Flow
1. User clicks "Preview" button in DocumentCard
2. Link navigates to `/dashboard/documents/${id}/preview` in **same tab** (remove `target="_blank"`)
3. Preview settings page loads with watermark as **optional** (unchecked by default)
4. User optionally configures watermark and clicks "Preview"
5. Preview opens in a **new tab** with configured settings

## Components and Interfaces

### 1. DocumentCard Component
**File:** `components/dashboard/DocumentCard.tsx`

**Current Implementation:**
```typescript
<Button size="sm" variant="secondary" asChild>
  <a
    href={`/dashboard/documents/${document.id}/preview`}
    target="_blank"  // ❌ Opens in new tab
    rel="noopener noreferrer"
  >
    Preview
  </a>
</Button>
```

**Enhanced Implementation:**
```typescript
<Button size="sm" variant="secondary" asChild>
  <a href={`/dashboard/documents/${document.id}/preview`}>
    {/* No target="_blank" - opens in same tab */}
    Preview
  </a>
</Button>
```

### 2. PreviewClient Component
**File:** `app/dashboard/documents/[id]/preview/PreviewClient.tsx`

**Key Changes:**

#### A. Make Watermark Optional
Add a checkbox/toggle to enable/disable watermark:

```typescript
const [enableWatermark, setEnableWatermark] = useState(false); // Default: disabled
```

#### B. Update Settings UI
```typescript
{/* Watermark Enable/Disable Toggle */}
<div className="mb-6">
  <label className="flex items-center space-x-3 cursor-pointer">
    <input
      type="checkbox"
      checked={enableWatermark}
      onChange={(e) => setEnableWatermark(e.target.checked)}
      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
    />
    <span className="text-sm font-medium text-gray-700">
      Enable Watermark
    </span>
  </label>
  <p className="text-sm text-gray-500 mt-1 ml-8">
    Add a watermark to protect your content
  </p>
</div>

{/* Show watermark settings only if enabled */}
{enableWatermark && (
  <div className="space-y-6">
    {/* Existing watermark type, text, image, opacity controls */}
  </div>
)}
```

#### C. Update Preview Button Logic
```typescript
const handleStartPreview = () => {
  // Only validate watermark if it's enabled
  if (enableWatermark) {
    if (watermarkType === 'text' && !watermarkText.trim()) {
      alert('Please enter watermark text');
      return;
    }
    if (watermarkType === 'image' && !watermarkImage) {
      alert('Please upload a watermark image');
      return;
    }
  }
  
  // Build preview URL with settings as query parameters
  const params = new URLSearchParams({
    watermark: enableWatermark.toString(),
    ...(enableWatermark && watermarkType === 'text' && { 
      watermarkText,
      watermarkSize: watermarkSize.toString(),
      watermarkOpacity: watermarkOpacity.toString()
    }),
    ...(enableWatermark && watermarkType === 'image' && {
      watermarkImage,
      watermarkOpacity: watermarkOpacity.toString()
    })
  });
  
  // Open preview in new tab
  window.open(
    `/dashboard/documents/${documentId}/view?${params.toString()}`,
    '_blank',
    'noopener,noreferrer'
  );
};
```

#### D. Update Button Text
```typescript
<Button
  onClick={handleStartPreview}
  className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
>
  <svg className="w-5 h-5 mr-2" ...>...</svg>
  Preview in New Tab
</Button>
```

### 3. New Preview Viewer Page
**File:** `app/dashboard/documents/[id]/view/page.tsx`

Create a new route for the actual preview viewer that reads settings from URL parameters:

```typescript
export default async function PreviewViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const { id: documentId } = await params;
  const settings = await searchParams;
  
  // Parse watermark settings from URL
  const enableWatermark = settings.watermark === 'true';
  const watermarkText = settings.watermarkText as string || session.user.email;
  const watermarkOpacity = parseFloat(settings.watermarkOpacity as string || '0.3');
  const watermarkSize = parseInt(settings.watermarkSize as string || '16');
  const watermarkImage = settings.watermarkImage as string || '';
  
  // Fetch document
  const document = await getDocumentForPreview(documentId, session.user.id);
  if (!document) redirect('/dashboard');
  
  const { url: signedUrl } = await getSignedUrl(document.storagePath, 3600);
  if (!signedUrl) redirect('/dashboard');
  
  return (
    <PreviewViewerClient
      documentId={documentId}
      documentTitle={document.title}
      pdfUrl={signedUrl}
      userEmail={session.user.email || ''}
      enableWatermark={enableWatermark}
      watermarkText={watermarkText}
      watermarkOpacity={watermarkOpacity}
      watermarkSize={watermarkSize}
      watermarkImage={watermarkImage}
    />
  );
}
```

### 4. Preview Viewer Client Component
**File:** `app/dashboard/documents/[id]/view/PreviewViewerClient.tsx`

```typescript
'use client';

interface PreviewViewerClientProps {
  documentId: string;
  documentTitle: string;
  pdfUrl: string;
  userEmail: string;
  enableWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkSize: number;
  watermarkImage: string;
}

export default function PreviewViewerClient({
  documentId,
  enableWatermark,
  watermarkText,
  userEmail,
  ...props
}: PreviewViewerClientProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <FlipBookContainerWithDRM
        documentId={documentId}
        pages={pages}
        watermarkText={watermarkText}
        userEmail={userEmail}
        allowTextSelection={true}
        enableScreenshotPrevention={false}
        showWatermark={enableWatermark} // Use the setting from URL
      />
    </div>
  );
}
```

## Data Models

### URL Parameters for Preview Settings

```typescript
interface PreviewSettings {
  watermark: 'true' | 'false';
  watermarkText?: string;
  watermarkSize?: string; // number as string
  watermarkOpacity?: string; // number as string
  watermarkImage?: string; // base64 or URL
}
```

### User Preferences (Optional Enhancement)

Store user's watermark preferences in database for future use:

```prisma
model UserPreferences {
  id                String   @id @default(cuid())
  userId            String   @unique
  enableWatermark   Boolean  @default(false)
  watermarkText     String?
  watermarkOpacity  Float    @default(0.3)
  watermarkSize     Int      @default(16)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Acceptance Criteria Testing Prework:

1.1. WHEN a user clicks the preview button THEN the system SHALL open the preview settings dialog in the same tab
Thoughts: This is testing navigation behavior. We can verify that the link doesn't have target="_blank" attribute.
Testable: yes - example

1.2. WHEN the preview settings dialog opens THEN the system SHALL display watermark as an optional setting
Thoughts: This is testing that the watermark checkbox/toggle is present and unchecked by default. We can test this across all renders.
Testable: yes - property

1.3. WHEN a user configures settings THEN the system SHALL save the user's preferences
Thoughts: This is about state management. We can test that settings are preserved in component state.
Testable: yes - property

1.4. WHEN a user clicks "Preview" in the settings dialog THEN the system SHALL open the content in a new tab with the configured settings
Thoughts: This is testing that window.open is called with correct parameters including the settings.
Testable: yes - property

1.5. WHEN a user cancels the settings dialog THEN the system SHALL return to the previous view without opening preview
Thoughts: This is testing navigation behavior when user goes back. This is browser behavior.
Testable: no

2.1. WHEN the preview settings dialog displays THEN the system SHALL show watermark as an unchecked checkbox or toggle
Thoughts: This is the same as 1.2 - testing default state of watermark control.
Testable: yes - property (redundant with 1.2)

2.2. WHEN a user does not enable watermark THEN the system SHALL preview content without watermark
Thoughts: This is testing that when watermark is disabled, the preview URL doesn't include watermark parameters or includes watermark=false.
Testable: yes - property

2.3. WHEN a user enables watermark THEN the system SHALL apply watermark to the preview
Thoughts: This is testing that when watermark is enabled, the preview URL includes watermark=true and related parameters.
Testable: yes - property

2.4. WHEN watermark settings are saved THEN the system SHALL remember the user's preference for future previews
Thoughts: This is about persistence across sessions. This would require database integration which is optional.
Testable: no (optional feature)

2.5. WHEN a user has no watermark preference saved THEN the system SHALL default to watermark disabled
Thoughts: This is testing the default state, same as 1.2 and 2.1.
Testable: yes - property (redundant with 1.2, 2.1)

3.1. WHEN a user confirms preview settings THEN the system SHALL open the preview in a new browser tab
Thoughts: This is testing that window.open is called with '_blank' target.
Testable: yes - example

3.2. WHEN the preview opens in a new tab THEN the system SHALL apply the configured settings (watermark, etc.)
Thoughts: This is testing that URL parameters match the configured settings. This is covered by 1.4.
Testable: yes - property (redundant with 1.4)

3.3. WHEN the preview opens THEN the system SHALL display content in full view mode
Thoughts: This is testing the viewer component displays correctly. This is covered by existing tests.
Testable: no

3.4. WHEN the preview link is generated THEN the system SHALL include appropriate security attributes (rel="noopener noreferrer")
Thoughts: This is testing that window.open includes security flags.
Testable: yes - example

3.5. WHEN a user closes the preview tab THEN the system SHALL maintain the dashboard state in the original tab
Thoughts: This is browser behavior - tabs are independent.
Testable: no

4.1. WHEN a user previews a PDF document THEN the system SHALL display it in the flipbook viewer
Thoughts: This is testing content type routing. We can test that PDF content type uses the flipbook viewer.
Testable: yes - example

4.2. WHEN a user previews a link THEN the system SHALL display the link preview or embedded content
Thoughts: This is testing content type routing for links.
Testable: yes - example

4.3. WHEN a user previews an image THEN the system SHALL display it in the image viewer
Thoughts: This is testing content type routing for images.
Testable: yes - example

4.4. WHEN a user previews a video THEN the system SHALL display it in the video player
Thoughts: This is testing content type routing for videos.
Testable: yes - example

4.5. WHEN preview settings are configured THEN the system SHALL apply them to all content types appropriately
Thoughts: This is testing that settings work across content types. This is a general goal covered by other tests.
Testable: no

### Property Reflection:

After reviewing the properties:
- Properties 1.2, 2.1, and 2.5 are all testing the same thing (watermark default state) - consolidate into one
- Properties 1.4 and 3.2 both test that settings are passed to preview - consolidate
- Properties 1.5, 2.4, 3.3, 3.5, and 4.5 are either browser behavior or optional features - remove
- Properties 4.1-4.4 are examples testing specific content types

**Consolidated Properties:**
- Keep 1.1 as example (same tab navigation)
- Keep 1.2 (watermark optional by default - remove 2.1, 2.5 as duplicates)
- Keep 1.3 (settings state management)
- Keep 1.4 (settings passed to preview - remove 3.2 as duplicate)
- Keep 2.2 (watermark disabled behavior)
- Keep 2.3 (watermark enabled behavior)
- Keep 3.1 as example (new tab opening)
- Keep 3.4 as example (security attributes)
- Keep 4.1-4.4 as examples (content type routing)

### Correctness Properties:

Property 1: Watermark optional by default
*For any* preview settings page render, the watermark enable control should be unchecked/disabled by default
**Validates: Requirements 1.2, 2.1, 2.5**

Property 2: Settings state preservation
*For any* user interaction with preview settings, the configured values should be preserved in component state until preview is opened or page is navigated away
**Validates: Requirements 1.3**

Property 3: Settings passed to preview URL
*For any* preview settings configuration, when opening preview the URL parameters should exactly match the configured settings
**Validates: Requirements 1.4, 3.2**

Property 4: Watermark disabled excludes parameters
*For any* preview with watermark disabled, the preview URL should either have watermark=false or exclude watermark-related parameters
**Validates: Requirements 2.2**

Property 5: Watermark enabled includes parameters
*For any* preview with watermark enabled, the preview URL should include watermark=true and all configured watermark parameters (text/image, opacity, size)
**Validates: Requirements 2.3**

## Error Handling

### Validation Errors
- **Missing watermark text**: When watermark is enabled with text type but no text provided
  - Show inline error message: "Please enter watermark text"
  - Prevent preview from opening
  
- **Missing watermark image**: When watermark is enabled with image type but no image uploaded
  - Show inline error message: "Please upload a watermark image"
  - Prevent preview from opening

- **Invalid watermark image**: When uploaded file is not an image or exceeds size limit
  - Show inline error message: "Please upload a valid image (PNG, JPG, GIF, max 2MB)"
  - Clear the invalid file

### Preview Errors
- **Document not found**: Redirect to dashboard with error toast
- **Access denied**: Redirect to dashboard with error toast
- **Conversion failure**: Show error page with retry option
- **Page loading errors**: Show error state in viewer with retry option

### Popup Blocker
- **Window.open blocked**: If browser blocks the popup, show message:
  - "Please allow popups for this site to open preview in new tab"
  - Provide alternative: "Or click here to open in same tab"

## Testing Strategy

### Unit Tests
- Test watermark checkbox renders unchecked by default
- Test watermark settings are hidden when checkbox is unchecked
- Test watermark settings are visible when checkbox is checked
- Test validation prevents preview when watermark enabled but incomplete
- Test URL parameter generation with various settings combinations
- Test URL parameter generation when watermark is disabled

### Property-Based Tests
We will use **fast-check** (JavaScript/TypeScript property-based testing library) for property-based testing.

Each property-based test should run a minimum of 100 iterations to ensure thorough coverage of the input space.

Property tests will be tagged with comments referencing the design document:
- Format: `// Feature: preview-settings-workflow, Property N: [property description]`

### Integration Tests
- Test clicking preview button navigates to settings page in same tab
- Test configuring settings and clicking preview opens new tab
- Test preview URL contains correct parameters
- Test watermark disabled results in no watermark in viewer
- Test watermark enabled results in watermark in viewer
- Test different content types route to correct viewers
- Test back button returns to dashboard

### Manual Testing
- Click preview button and verify settings page opens in same tab
- Verify watermark checkbox is unchecked by default
- Check watermark checkbox and verify settings appear
- Uncheck watermark checkbox and verify settings hide
- Configure watermark and click preview - verify new tab opens
- Verify watermark appears in preview when enabled
- Verify no watermark in preview when disabled
- Test with different content types (PDF, image, video, link)
- Test browser back button behavior

## Implementation Notes

### URL Parameter Encoding

When passing watermark image as base64 in URL, we need to properly encode it:

```typescript
const params = new URLSearchParams({
  watermark: 'true',
  watermarkImage: encodeURIComponent(watermarkImage)
});
```

### Alternative: Session Storage

For large watermark images, consider using sessionStorage instead of URL parameters:

```typescript
// Before opening preview
if (watermarkImage) {
  sessionStorage.setItem('preview-watermark-image', watermarkImage);
}

// In preview page
const watermarkImage = sessionStorage.getItem('preview-watermark-image');
sessionStorage.removeItem('preview-watermark-image');
```

### Content Type Support

The preview viewer should support all content types:

```typescript
const getViewerComponent = (contentType: string) => {
  switch (contentType) {
    case 'PDF':
      return FlipBookContainerWithDRM;
    case 'IMAGE':
      return ImageViewer;
    case 'VIDEO':
      return VideoPlayer;
    case 'LINK':
      return LinkPreview;
    default:
      return FlipBookContainerWithDRM; // Default to PDF viewer
  }
};
```

### Accessibility Considerations

- Watermark checkbox should be keyboard accessible
- Settings form should have proper labels and ARIA attributes
- Preview button should indicate it opens in new tab
- Error messages should be announced to screen readers

## Alternative Approaches Considered

### 1. Modal Dialog for Settings
**Pros:** Keeps user on same page, modern UX pattern
**Cons:** 
- More complex state management
- Harder to bookmark/share settings page
- Modal might be too small for all settings

### 2. Settings in URL from Start
**Pros:** Simpler flow, fewer pages
**Cons:**
- No way to configure settings before preview
- Poor UX for users who want to adjust settings

### 3. Settings Page in Same Tab (Chosen)
**Pros:**
- Clear separation of concerns
- Easy to navigate back
- Can bookmark settings page
- Familiar pattern for users
**Cons:**
- Requires additional page/route

## Migration Path

1. Remove `target="_blank"` from DocumentCard preview link
2. Add watermark enable/disable checkbox to PreviewClient
3. Make watermark settings conditional on checkbox state
4. Update validation to only check watermark when enabled
5. Create new `/view` route for actual preview
6. Update preview button to open new tab with settings as URL params
7. Test all content types work with new flow
8. Deploy changes

### Backward Compatibility

The existing `/preview` route will continue to work but will show settings page. Users who have bookmarked the old preview URL will see the settings page first, which is acceptable.

## Future Enhancements

1. **Save User Preferences**: Store watermark preferences in database
2. **Quick Preview**: Add "Quick Preview" button that skips settings
3. **Preview Templates**: Allow users to save watermark templates
4. **Batch Preview**: Preview multiple documents with same settings
5. **Preview History**: Track preview settings history for easy reuse
