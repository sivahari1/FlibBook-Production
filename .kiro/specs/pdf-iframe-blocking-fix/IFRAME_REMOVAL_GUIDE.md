# Iframe Fallback Removal Guide

## ⚠️ IMPORTANT: Prerequisites

**DO NOT proceed with iframe removal until:**

- [ ] Phase 4 (100% rollout) has been stable for **14 consecutive days**
- [ ] Error rate has been < 1% for the entire 14-day period
- [ ] No critical issues have been reported
- [ ] All success criteria from Phase 4 are met
- [ ] User satisfaction is > 80%
- [ ] Performance metrics are stable or improved
- [ ] All browsers are working correctly
- [ ] Final approval has been obtained

## Overview

This guide covers the safe removal of iframe-based PDF rendering code after PDF.js has been successfully deployed to 100% of users.

## Removal Strategy

### Phase 1: Preparation (Day 1-2)

**Actions**:
1. Create a backup branch
2. Document all iframe-related code
3. Create rollback plan
4. Notify team of upcoming changes

**Commands**:
```bash
# Create backup branch
git checkout -b backup/before-iframe-removal
git push origin backup/before-iframe-removal

# Create feature branch
git checkout main
git pull
git checkout -b feature/remove-iframe-fallback
```

### Phase 2: Code Removal (Day 3-5)

**Files to Modify**:

1. **`components/viewers/SimpleDocumentViewer.tsx`**
   - Remove `usePDFJS` prop (always use PDF.js)
   - Remove iframe rendering code
   - Remove conditional logic for PDF.js vs iframe
   - Simplify component structure

2. **`app/dashboard/documents/[id]/view/PreviewViewerClient.tsx`**
   - Remove `usePDFJS` prop
   - Always pass PDF.js viewer to SimpleDocumentViewer

3. **`app/dashboard/documents/[id]/view/page.tsx`**
   - Remove feature flag check
   - Remove `usePDFJS` variable
   - Remove URL parameter handling for `usePDFJS`

4. **`lib/feature-flags.ts`**
   - Remove `PDFJS_VIEWER` feature flag
   - Or mark as deprecated

5. **Environment Variables**
   - Remove from `.env.example`:
     - `NEXT_PUBLIC_ENABLE_PDFJS`
     - `NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE`
     - `NEXT_PUBLIC_PDFJS_TEST_USER_IDS`
     - `NEXT_PUBLIC_PDFJS_TEST_EMAILS`

### Phase 3: Testing (Day 6-7)

**Test Checklist**:
- [ ] PDFs load correctly
- [ ] Watermarks display
- [ ] DRM protections work
- [ ] Navigation controls function
- [ ] Keyboard shortcuts work
- [ ] Touch gestures work (mobile)
- [ ] Zoom controls work
- [ ] Error handling works
- [ ] All browsers tested (Chrome, Firefox, Safari, Edge)
- [ ] Mobile browsers tested
- [ ] Performance is acceptable

**Testing Commands**:
```bash
# Run all tests
npm test

# Run specific viewer tests
npm test -- SimpleDocumentViewer
npm test -- PDFViewerWithPDFJS

# Build and test locally
npm run build
npm start
```

### Phase 4: Deployment (Day 8)

**Deployment Steps**:

1. **Final Review**:
   - Review all code changes
   - Ensure no iframe code remains
   - Verify tests pass
   - Check build succeeds

2. **Deploy to Staging** (if available):
   ```bash
   git push origin feature/remove-iframe-fallback
   # Deploy to staging
   vercel --prod --scope staging
   ```

3. **Test on Staging**:
   - Verify all functionality
   - Test with real PDFs
   - Check error logs

4. **Deploy to Production**:
   ```bash
   # Merge to main
   git checkout main
   git merge feature/remove-iframe-fallback
   git push origin main
   
   # Deploy
   npm run build
   vercel --prod
   ```

5. **Monitor Closely**:
   - Watch error logs for 24 hours
   - Check analytics dashboard
   - Monitor support tickets
   - Be ready to rollback

### Phase 5: Monitoring (Day 9-14)

**Monitor for 7 days after deployment**:

- [ ] Error rate remains < 1%
- [ ] No increase in support tickets
- [ ] Performance metrics stable
- [ ] User feedback positive
- [ ] All browsers working

## Code Changes

### 1. SimpleDocumentViewer.tsx

**Remove**:
```typescript
// Remove usePDFJS prop
usePDFJS?: boolean;

// Remove conditional rendering
usePDFJS ? (
  <PDFViewerWithPDFJS ... />
) : (
  <iframe ... />
)
```

**Replace with**:
```typescript
// Always use PDF.js
<PDFViewerWithPDFJS
  pdfUrl={pdfUrl}
  documentTitle={documentTitle}
  watermark={watermark}
  enableDRM={enableScreenshotPrevention}
  viewMode={viewMode === 'continuous' ? 'continuous' : 'single'}
  onPageChange={setCurrentPage}
  onLoadComplete={(numPages) => {
    console.log(`PDF loaded with ${numPages} pages`);
  }}
  onError={(error) => {
    console.error('PDF.js error:', error);
    setError(error.message);
  }}
/>
```

### 2. PreviewViewerClient.tsx

**Remove**:
```typescript
// Remove usePDFJS prop
usePDFJS?: boolean;
```

**Update SimpleDocumentViewer call**:
```typescript
<SimpleDocumentViewer
  documentId={documentId}
  documentTitle={documentTitle}
  pdfUrl={pdfUrl}
  watermark={watermarkConfig}
  enableScreenshotPrevention={true}
  // Remove: usePDFJS={usePDFJS}
  onClose={() => window.location.href = '/dashboard'}
/>
```

### 3. page.tsx

**Remove**:
```typescript
import { shouldUsePDFJS } from '@/lib/feature-flags';

// Remove feature flag logic
let usePDFJS: boolean;
if (settings.usePDFJS === 'true') {
  usePDFJS = true;
} else if (settings.usePDFJS === 'false') {
  usePDFJS = false;
} else {
  usePDFJS = shouldUsePDFJS(session.user.id, session.user.email || undefined);
}
```

**Remove from component**:
```typescript
// Remove: usePDFJS={usePDFJS}
```

### 4. feature-flags.ts

**Option A: Remove completely** (if no other flags):
```bash
rm lib/feature-flags.ts
```

**Option B: Mark as deprecated** (if other flags exist):
```typescript
// Remove PDFJS_VIEWER from enum and config
// Or mark as deprecated
export enum FeatureFlagKey {
  // PDFJS_VIEWER = 'pdfjs_viewer', // DEPRECATED: Removed after 100% rollout
}
```

### 5. Environment Variables

**Remove from `.env.example`**:
```bash
# Remove these lines:
# PDF.js Feature Flags (Task 16.1, 16.2)
# =====================
# Enable PDF.js viewer (replaces iframe-based PDF rendering)
# ...
```

**Remove from production `.env`**:
```bash
# Remove:
NEXT_PUBLIC_ENABLE_PDFJS="true"
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE=""
NEXT_PUBLIC_PDFJS_TEST_USER_IDS=""
NEXT_PUBLIC_PDFJS_TEST_EMAILS=""
```

## Rollback Plan

If issues occur after iframe removal:

### Quick Rollback (Git)

```bash
# Revert the merge commit
git revert HEAD
git push origin main

# Deploy
npm run build
vercel --prod
```

### Full Rollback (Restore Branch)

```bash
# Restore from backup branch
git checkout backup/before-iframe-removal
git checkout -b hotfix/restore-iframe
git push origin hotfix/restore-iframe

# Deploy
npm run build
vercel --prod
```

### Emergency Rollback (Manual)

1. Restore iframe code from backup
2. Re-add feature flag system
3. Set `NEXT_PUBLIC_ENABLE_PDFJS="false"`
4. Deploy immediately

## Testing Checklist

Before deploying iframe removal:

### Functional Testing
- [ ] PDF loads without errors
- [ ] Multiple pages display correctly
- [ ] Page navigation works (next/previous)
- [ ] Page number input works
- [ ] Zoom in/out works
- [ ] Zoom level persists
- [ ] Continuous scroll mode works
- [ ] Paged view mode works
- [ ] View mode toggle works
- [ ] Watermarks display correctly
- [ ] Watermarks scale with zoom
- [ ] Watermarks persist on navigation

### DRM Testing
- [ ] Right-click disabled
- [ ] Print shortcut blocked (Ctrl+P)
- [ ] Save shortcut blocked (Ctrl+S)
- [ ] Text selection disabled
- [ ] Drag disabled
- [ ] Screenshot prevention works

### Keyboard Testing
- [ ] Arrow keys navigate pages
- [ ] Page Up/Down works
- [ ] Home/End works
- [ ] Ctrl+scroll zooms
- [ ] All shortcuts documented work

### Mobile Testing
- [ ] Touch gestures work
- [ ] Pinch to zoom works
- [ ] Swipe to navigate works
- [ ] Responsive layout works
- [ ] Performance acceptable

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

### Error Testing
- [ ] Invalid PDF shows error
- [ ] Network error shows error
- [ ] Permission error shows error
- [ ] Retry button works
- [ ] Error messages clear

### Performance Testing
- [ ] Load time < 2 seconds
- [ ] Smooth scrolling
- [ ] Smooth zooming
- [ ] No memory leaks
- [ ] No console errors

## Documentation Updates

After iframe removal, update:

1. **README.md**:
   - Remove iframe references
   - Update PDF viewer description
   - Remove feature flag documentation

2. **Component Documentation**:
   - Update SimpleDocumentViewer docs
   - Remove usePDFJS prop documentation
   - Update examples

3. **User Guide**:
   - Update PDF viewer section
   - Remove troubleshooting for iframe issues

4. **Deployment Guide**:
   - Archive rollout documentation
   - Update deployment instructions
   - Remove feature flag setup

## Cleanup Tasks

After successful deployment:

- [ ] Remove backup branch (after 30 days)
- [ ] Archive rollout documentation
- [ ] Update team documentation
- [ ] Remove monitoring for iframe vs PDF.js
- [ ] Clean up analytics code (if iframe-specific)
- [ ] Remove rollout management scripts
- [ ] Update onboarding documentation

## Success Criteria

Iframe removal is successful when:

- [ ] All tests pass
- [ ] Deployment successful
- [ ] Error rate < 1% for 7 days
- [ ] No increase in support tickets
- [ ] Performance metrics stable
- [ ] User feedback positive
- [ ] All browsers working
- [ ] No rollback needed

## Timeline

| Phase | Duration | Actions |
|-------|----------|---------|
| Preparation | 2 days | Backup, documentation, planning |
| Code Removal | 3 days | Remove iframe code, update components |
| Testing | 2 days | Comprehensive testing |
| Deployment | 1 day | Deploy and initial monitoring |
| Monitoring | 7 days | Verify stability |
| **Total** | **15 days** | |

## Final Checklist

Before starting iframe removal:

- [ ] 100% rollout stable for 14 days
- [ ] Error rate < 1% consistently
- [ ] No critical issues
- [ ] User satisfaction > 80%
- [ ] Performance metrics good
- [ ] All browsers working
- [ ] Team notified
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Final approval obtained

## Support

If issues arise during iframe removal:

1. Check error logs immediately
2. Review analytics dashboard
3. Check support tickets
4. Consider rollback if critical
5. Document issues for future reference

## Post-Removal

After successful iframe removal:

1. Celebrate the successful migration! 🎉
2. Document lessons learned
3. Update team knowledge base
4. Archive rollout documentation
5. Plan next improvements
