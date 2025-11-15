# Watermark and Revoke Issues - Analysis & Fixes

## Issues Reported

1. **Watermark not showing in shared documents** (via email or link)
2. **Cannot revoke expired shares**
3. **Revoke link in email shows "no document available"**

---

## Issue 1: Watermark in Shared Documents

### Status: ✅ ALREADY WORKING

**Analysis**: The watermark IS already implemented in shared documents!

**Evidence**:
- `app/view/[shareKey]/ViewerClient.tsx` line 145-151:
```typescript
<PDFViewer 
  pdfUrl={documentData.signedUrl}
  requireEmail={false}
  shareKey={shareKey}
  watermarkConfig={{
    type: 'text',
    text: userEmail,  // Shows recipient's email
    opacity: 0.3,
    fontSize: 16,
  }}
/>
```

**What's happening**:
- Preview mode: User can customize watermark (text/image, opacity, size)
- Shared documents: Automatically watermarked with recipient's email
- Both use the same `PDFViewer` component with `Watermark` component

**Conclusion**: No fix needed. Watermark is working correctly in both preview and shared views.

---

## Issue 2: Cannot Revoke Expired Shares

### Status: ⚠️ NEEDS FIX

**Problem**: The UI might be hiding revoke buttons for expired shares, or there's confusion about what "revoke" means for expired shares.

**Current Behavior**:
- Email shares: Can be revoked (deleted from database)
- Link shares: Can be revoked (set `isActive = false`)
- Both work regardless of expiration status

**Potential Issues**:
1. UI might not show revoke button for expired shares
2. User might think expired shares don't need revoking
3. Expired shares still appear in share management

**Fix Needed**:
- Ensure revoke button is always visible (even for expired shares)
- Add visual indicator for expired shares
- Allow revoking expired shares to clean up the list

---

## Issue 3: Revoke Link Shows "No Document Available"

### Status: 🔴 CRITICAL BUG

**Problem**: The email notification sends users to `/inbox` but they might be clicking a different link or the share is already revoked.

**Current Flow**:
1. User A shares document with User B via email
2. User B receives email with link to `/inbox`
3. User B clicks link → Goes to inbox
4. User B clicks "View" → Creates temporary ShareLink → Redirects to `/view/[shareKey]`
5. If User A revokes the share → DocumentShare is deleted
6. User B's temporary ShareLink still exists but DocumentShare is gone
7. User B tries to view → "No document available"

**Root Cause**: When an email share is revoked, the temporary ShareLinks created for viewing are not cleaned up.

**Fix Required**:
1. When revoking email share, also revoke/delete associated temporary ShareLinks
2. Add cascade delete or cleanup logic
3. Update revoke function to handle this

---

## Fixes to Implement

### Fix 1: Update ShareManagement to Show Expired Shares Clearly

**File**: `components/dashboard/ShareManagement.tsx`

**Changes**:
- Add "Expired" badge for expired shares
- Keep revoke button visible for expired shares
- Add explanation that revoking removes from recipient's inbox

### Fix 2: Clean Up Temporary ShareLinks When Revoking Email Shares

**File**: `lib/documents.ts` - `revokeEmailShare` function

**Changes**:
- When deleting DocumentShare, also delete/deactivate associated temporary ShareLinks
- These are ShareLinks with `restrictToEmail` matching the share recipient

### Fix 3: Improve Error Messages

**File**: `app/view/[shareKey]/ViewerClient.tsx`

**Changes**:
- Better error message when share is revoked
- Distinguish between "expired" and "revoked"
- Provide helpful next steps

---

## Implementation Priority

1. **HIGH**: Fix temporary ShareLink cleanup (Issue 3)
2. **MEDIUM**: Improve expired share UI (Issue 2)
3. **LOW**: Improve error messages (Issue 3)
4. **INFO**: Document that watermark is working (Issue 1)

---

## Next Steps

1. Implement Fix 2 (cleanup temporary ShareLinks)
2. Implement Fix 1 (show expired shares with revoke option)
3. Test the complete flow
4. Deploy fixes
