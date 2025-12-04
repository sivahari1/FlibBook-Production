# Preview Content Rendering Fix - Quick Action Guide

## Immediate Actions to Unblock Implementation

### 1. Fix Database Connection (CRITICAL)

The database migration is blocked by authentication issues. Here's how to resolve:

#### Option A: Use Prisma DB Push (Recommended for Development)
```bash
# This bypasses migration files and directly syncs schema
npx prisma db push
```

#### Option B: Generate Prisma Client Only
```bash
# If schema is already in database, just generate the client
npx prisma generate
```

#### Option C: Check Environment Variables
```bash
# Verify your .env file has correct values
# DATABASE_URL should be the connection pooler URL
# DIRECT_URL should be the direct connection URL
```

### 2. Create Storage Bucket

#### Option A: Run the Setup Script
```bash
npm run tsx scripts/create-document-pages-bucket.ts
```

#### Option B: Manual Creation in Supabase Dashboard
1. Go to Supabase Dashboard → Storage
2. Create new bucket named "document-pages"
3. Set to Private (not public)
4. Configure RLS policies:
   - Allow authenticated users to read their own pages
   - Allow authenticated users to upload their own pages

### 3. Verify System Components

Run the verification script to check all components:
```bash
npm run tsx scripts/verify-preview-content-rendering.ts
```

This will check:
- Database schema (DocumentPage model)
- Storage bucket existence
- Service availability (PDF converter, page cache)
- API routes existence
- Component files existence

### 4. Test End-to-End Flow

Once verification passes, test the complete flow:
```bash
npm run tsx scripts/test-preview-rendering-e2e.ts
```

## Quick Fixes for Common Issues

### Issue: "DocumentPage model not found"
**Solution**: The model exists but Prisma client needs regeneration
```bash
npx prisma generate
```

### Issue: "Storage bucket not found"
**Solution**: Create the bucket manually or run setup script
```bash
npm run tsx scripts/create-document-pages-bucket.ts
```

### Issue: "Services not accessible"
**Solution**: Check that service files exist and are properly exported
- `lib/services/pdf-converter.ts`
- `lib/services/page-cache.ts`

### Issue: "API routes return HTML instead of JSON"
**Solution**: Update middleware.ts to exclude API routes from redirects
```typescript
// In middleware.ts
if (request.nextUrl.pathname.startsWith('/api/')) {
  return NextResponse.next();
}
```

## Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Upload a Test PDF**
   - Go to dashboard
   - Upload a PDF document
   - Check console for conversion logs

3. **View Preview**
   - Click on document to view
   - Verify pages display correctly
   - Check for any errors in console

4. **Monitor Logs**
   - Watch server console for conversion status
   - Check browser console for client errors
   - Verify no CLIENT_FETCH_ERROR messages

## Troubleshooting Commands

### Check Database Connection
```bash
npx prisma db pull
```

### View Current Schema
```bash
npx prisma studio
```

### Test Supabase Connection
```bash
npm run tsx scripts/diagnose-preview-content-rendering.ts
```

### List All Documents
```bash
npm run tsx scripts/list-documents.ts
```

### Test Specific Document
```bash
npm run tsx scripts/test-specific-document.ts
```

## Success Criteria

You'll know the system is working when:
- ✅ PDF uploads complete successfully
- ✅ Conversion starts automatically
- ✅ Pages appear in database (document_pages table)
- ✅ Pages appear in storage bucket
- ✅ Preview displays all pages
- ✅ No errors in console
- ✅ Loading states work correctly
- ✅ Error messages are clear and helpful

## Next Steps After Unblocking

Once the immediate blockers are resolved:

1. **Test with Real PDFs**
   - Upload various PDF sizes
   - Test with different page counts
   - Verify conversion quality

2. **Optimize Performance**
   - Implement parallel page conversion
   - Add progress tracking
   - Optimize image quality settings

3. **Enhance Error Handling**
   - Add retry mechanisms
   - Improve error messages
   - Add fallback behaviors

4. **Complete Documentation**
   - Document API endpoints
   - Create user guide
   - Write troubleshooting guide

## Getting Help

If you encounter issues:

1. Check the implementation status: `IMPLEMENTATION_STATUS.md`
2. Review the design document: `design.md`
3. Check requirements: `requirements.md`
4. Run diagnostic scripts in `scripts/` directory

## Important Notes

- The DocumentPage model already exists in the schema
- Services (pdf-converter, page-cache) are already created
- API routes are already in place
- Main blocker is database connection for migration
- Once unblocked, system should work with minimal changes

## Estimated Time to Unblock

- Fix database connection: 5-10 minutes
- Create storage bucket: 5 minutes
- Verify system: 5 minutes
- Test end-to-end: 10-15 minutes

**Total: 25-35 minutes** to get system operational
