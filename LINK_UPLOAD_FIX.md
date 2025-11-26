# Link Upload Fix

## Issue
When uploading links as an admin user, the title and description fields were not being properly synchronized between the `LinkUploader` component and the `EnhancedUploadModal` parent component. This caused the upload to fail because the modal didn't have access to the title value entered in the LinkUploader.

## Root Cause
The `LinkUploader` component had its own internal state for URL, title, and description, but it never communicated these values back to the parent `EnhancedUploadModal` component. The modal expected the LinkUploader to call an `onLinkSubmit` callback, but this was never triggered automatically.

## Solution
Refactored the `LinkUploader` component to use controlled component pattern:

### Changes to `LinkUploader.tsx`:
1. Changed props from `onLinkSubmit` callback to individual change handlers:
   - `onUrlChange`: Called when URL changes
   - `onTitleChange`: Called when title changes  
   - `onDescriptionChange`: Called when description changes

2. Added props to receive external values:
   - `url`: External URL value
   - `title`: External title value
   - `description`: External description value

3. Added `useEffect` hooks to sync external values with internal state

4. Updated all input handlers to call the respective change callbacks

### Changes to `EnhancedUploadModal.tsx`:
1. Replaced `handleLinkSubmit` with three separate handlers:
   - `handleLinkUrlChange`
   - `handleLinkTitleChange`
   - `handleLinkDescriptionChange`

2. Updated LinkUploader usage to pass controlled values and handlers

3. Moved the description textarea inside a conditional to only show for non-link types (since LinkUploader has its own)

### Changes to `BookShopItemForm.tsx`:
Updated to use the new LinkUploader interface with the same controlled component pattern.

## Testing
After this fix:
- Link uploads now properly capture title and description
- Metadata fetching still works and auto-fills fields
- Manual overrides are preserved
- The upload button is properly enabled/disabled based on required fields

## Files Modified
- `components/upload/LinkUploader.tsx`
- `components/dashboard/EnhancedUploadModal.tsx`
- `components/admin/BookShopItemForm.tsx`
