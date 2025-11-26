# BookShop Link Upload Fix

## Issues Fixed

### 1. Duplicate Title/Description Fields
**Problem:** When uploading links to BookShop, the form showed duplicate Title and Description fields - one from LinkUploader component and one from BookShopItemForm.

**Solution:** Modified `BookShopItemForm.tsx` to conditionally hide Title and Description fields when using LinkUploader (create mode with LINK content type).

### 2. FormData vs JSON Issue
**Problem:** The BookShop page was sending link data as JSON, but the `/api/documents/upload` endpoint expects FormData.

**Solution:** Updated `app/admin/bookshop/page.tsx` to use FormData instead of JSON when creating link documents.

## Current Issue

### 500 Internal Server Error on Link Upload
**Status:** Still occurring

**Error:** Multiple 500 errors from `/api/documents/upload` endpoint when trying to upload a link.

**Possible Causes:**
1. The upload API might be failing during link processing
2. Database schema mismatch
3. Missing or invalid metadata handling
4. Link processor errors

**Next Steps to Debug:**
1. Check server logs for detailed error messages
2. Verify the LinkProcessor is working correctly
3. Check if the database schema supports all required fields for link documents
4. Test the `/api/documents/upload` endpoint directly with a simple link

## Files Modified

1. `components/admin/BookShopItemForm.tsx` - Conditional rendering of Title/Description
2. `app/admin/bookshop/page.tsx` - FormData implementation for link uploads

## Testing Needed

- [ ] Test link upload to BookShop with valid URL
- [ ] Verify link metadata is fetched correctly
- [ ] Check database for created document entries
- [ ] Test with different types of URLs (YouTube, regular websites, etc.)
