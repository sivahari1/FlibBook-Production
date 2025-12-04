# Preview Content Rendering Fix - Implementation Plan

## Current Status

Based on the context transfer and code review:

### ✅ Already Fixed
1. **NextAuth API Route** - Exists at `app/api/auth/[...nextauth]/route.ts`
2. **Middleware Configuration** - Properly allows API routes to handle their own auth
3. **CLIENT_FETCH_ERROR** - Should be resolved with NextAuth route in place

### ❌ Still Broken
1. **Blank Preview Pages** - Only watermark visible, no PDF content
2. **Missing PDF Conversion** - PDFs not being converted to page images
3. **No Page Storage** - No DocumentPage model or storage bucket
4. **Watermark Default** - May still be showing by default
5. **Small Display Area** - Not using full viewport

## Implementation Strategy

I'll focus on the critical path to get content visible:

### Phase 1: Quick Wins (Immediate)
1. Fix watermark defaults in FlipBookContainerWithDRM
2. Fix viewport sizing for full-screen display
3. Verify API routes return proper JSON

### Phase 2: Core Functionality (High Priority)
4. Create DocumentPage database model
5. Create "document-pages" storage bucket
6. Implement PDF conversion service
7. Implement page cache service
8. Fix document pages API route to trigger conversion

### Phase 3: Integration (High Priority)
9. Update PreviewViewerClient to handle pages correctly
10. Update server-side page fetching
11. Add automatic conversion on upload

### Phase 4: Testing & Polish
12. End-to-end testing
13. Error handling improvements
14. Performance optimization

## Next Steps

I'll start with Phase 1 quick wins to immediately improve the user experience, then move to Phase 2 to get actual content rendering.
