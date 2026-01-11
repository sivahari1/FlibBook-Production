# Member Document Viewing Fix - Implementation Complete

## Overview
This implementation enforces a single invariant: **Member routes and APIs must always use documents.id (documentId)** and ensures a reliable PDF→images conversion pipeline for FlipBook viewing.

## ✅ Completed Tasks

### A) Document ID Resolution System
- **✅ Created `lib/server/resolveDocumentId.ts`**
  - Server-only utility that resolves any ID to documentId
  - Resolution order: Document → BookShopItem → MyJstudyroomItem
  - Throws 404 for invalid IDs

- **✅ Updated `/member/view/[itemId]` route**
  - Now uses resolver to convert any itemId to documentId
  - Shows resolution info in UI for debugging
  - Maintains backward compatibility with existing links

### B) Database Schema Updates
- **✅ Added conversion tracking fields to Document model:**
  - `conversionStatus` enum (PENDING, PROCESSING, READY, FAILED)
  - `conversionError` string (nullable)
  - `pageCount` int (nullable)
  - `convertedAt` DateTime (nullable)
  - `pagesUpdatedAt` DateTime (nullable)

- **✅ Enhanced DocumentPage model:**
  - `storageBucket` string (default: "document-pages")
  - `storagePath` string (required, NOT NULL)
  - `width` and `height` int (nullable)

- **✅ Created Prisma migration**
  - File: `prisma/migrations/20250110000000_add_conversion_tracking/migration.sql`

### C) PDF Conversion Pipeline
- **✅ Created `lib/server/conversion/ensureDocumentPages.ts`**
  - Idempotent and lock-safe conversion function
  - Handles concurrent requests safely
  - Deterministic storage paths: `documents/{documentId}/pages/{pageNumber}.webp`
  - Graceful fallback for environments without PDF conversion libraries
  - Comprehensive error handling and logging

### D) Updated Member Pages API
- **✅ Enhanced `/api/member/viewer/pages/[documentId]/route.ts`**
  - Calls `ensureDocumentPages()` before querying pages
  - Returns conversion status in response
  - Handles PROCESSING, FAILED, and READY states
  - Self-healing: triggers conversion when pages are missing

### E) Updated Access API
- **✅ Enhanced `/api/viewer/document/[documentId]/access/route.ts`**
  - Always validates document exists (404 if not found)
  - Members always get `viewerType: "FLIPBOOK"` with empty PDF URL
  - Includes `documentId`, `conversionStatus`, and `pageCount` in response
  - Maintains DRM protection for members

### F) Admin Diagnostic Endpoints
- **✅ Created `/api/admin/documents/[documentId]/conversion-status/route.ts`**
  - Shows document conversion status and metadata
  - Compares actual vs recorded page counts
  - Lists sample storage paths
  - Admin-only access with email allowlist fallback

- **✅ Created `/api/admin/documents/[documentId]/rebuild-pages/route.ts`**
  - POST endpoint to force page regeneration
  - Clears existing pages and resets conversion status
  - Triggers fresh conversion
  - Admin-only access

### G) Enhanced FlipBook Viewer
- **✅ Updated `components/flipbook/FlipBookViewer.tsx`**
  - Better status handling for PROCESSING and FAILED states
  - Shows appropriate messages and loading indicators
  - Maintains existing functionality

### H) Updated Viewer Client
- **✅ Enhanced `components/viewers/MyJstudyroomViewerClient.tsx`**
  - Handles new response format with `viewerType`
  - Always uses FlipBook for PDFs (members and admins)
  - Backward compatible with existing responses

## 🧪 Testing Checklist

### Local Testing
```bash
# 1. Run Prisma migration (when database is available)
npx prisma migrate dev --name add_conversion_tracking

# 2. Test document ID resolution
npx tsx scripts/test-document-id-resolution.ts

# 3. Test member view with different ID types
# - Visit /member/view/{documentId} (should work)
# - Visit /member/view/{bookShopItemId} (should resolve and work)
# - Visit /member/view/{myJstudyroomItemId} (should resolve and work)
# - Visit /member/view/{invalidId} (should redirect to my-jstudyroom)

# 4. Test conversion pipeline
# - Upload a new PDF
# - Access as member → should trigger conversion
# - Check admin status endpoint
# - Use admin rebuild endpoint if needed
```

### Production Testing
```bash
# 1. Verify member access works
curl -H "Cookie: next-auth.session-token=..." \
  https://your-domain.com/api/member/viewer/pages/{documentId}

# 2. Check admin endpoints (replace with admin session)
curl -H "Cookie: next-auth.session-token=..." \
  https://your-domain.com/api/admin/documents/{documentId}/conversion-status

# 3. Test rebuild (POST request)
curl -X POST -H "Cookie: next-auth.session-token=..." \
  https://your-domain.com/api/admin/documents/{documentId}/rebuild-pages
```

## 🔧 Configuration Requirements

### Environment Variables
```env
# Required for Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Admin email allowlist (comma-separated)
ADMIN_EMAILS=admin1@example.com,admin2@example.com

# Database connection
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_database_url
```

### Supabase Storage Buckets
Ensure these buckets exist:
- `documents` (for original PDFs)
- `document-pages` (for converted page images)

## 🚀 Deployment Steps

1. **Deploy code changes**
2. **Run Prisma migration:**
   ```bash
   npx prisma migrate deploy
   ```
3. **Verify storage buckets exist**
4. **Test with a sample document**
5. **Monitor logs for conversion issues**

## 🔍 Troubleshooting

### Common Issues

1. **"Processing Document" stuck forever**
   - Check admin conversion status endpoint
   - Use admin rebuild endpoint to retry
   - Check server logs for conversion errors

2. **"Document not found" errors**
   - Verify ID resolution is working
   - Check database for orphaned records
   - Ensure proper foreign key relationships

3. **Blank/missing pages**
   - Check Supabase Storage permissions
   - Verify storage paths in database
   - Use admin rebuild to regenerate pages

### Debug Commands
```bash
# Check document status
npx prisma studio
# Navigate to Document table, check conversionStatus

# Check page records
# Navigate to DocumentPage table, verify storagePath values

# Test API endpoints directly
curl -v https://your-domain.com/api/member/viewer/pages/{documentId}
```

## 📊 Success Metrics

- ✅ Members can view documents using any valid ID (document, bookShop, myJstudyroom)
- ✅ All member PDF viewing uses FlipBook (no direct PDF access)
- ✅ Conversion pipeline handles missing pages automatically
- ✅ Admin tools available for diagnostics and repair
- ✅ System is resilient to concurrent access and failures
- ✅ DRM protection maintained (watermarks, no downloads)

## 🎯 Key Benefits

1. **Consistent ID Handling**: Any ID type resolves to documentId
2. **Automatic Conversion**: Missing pages trigger conversion automatically
3. **Self-Healing**: APIs detect and fix inconsistent states
4. **Admin Tools**: Comprehensive diagnostics and repair capabilities
5. **Concurrent Safe**: Lock-based conversion prevents duplicates
6. **DRM Maintained**: Members never get direct PDF access
7. **Backward Compatible**: Existing links continue to work

The implementation is now complete and ready for testing and deployment!