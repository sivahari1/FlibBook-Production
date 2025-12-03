# Environment Variable Fix for Preview Issue

## Problem Identified

The document preview is failing because of **mismatched environment variable names** between the code and the `.env.local` file.

### Current State (Broken)

**In `.env.local`:**
```bash
SUPABASE_URL="https://zuhrivibcgudgsejsljo.supabase.co"
SUPABASE_SERVICE_KEY="..."
```

**In Code (expecting):**
```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL  // ❌ undefined
process.env.SUPABASE_SERVICE_ROLE_KEY  // ❌ undefined
```

### Impact

This causes:
1. Preview page fails to load document pages
2. PDF conversion fails (can't access Supabase storage)
3. "Failed to Load Document" error shown to users
4. All Supabase storage operations fail

## Solution

Update the `.env.local` file to use the correct variable names:

### Option 1: Update .env.local (Recommended)

Change:
```bash
SUPABASE_URL="https://zuhrivibcgudgsejsljo.supabase.co"
SUPABASE_SERVICE_KEY="..."
```

To:
```bash
NEXT_PUBLIC_SUPABASE_URL="https://zuhrivibcgudgsejsljo.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
```

### Option 2: Update Code (Not Recommended)

Alternatively, update all code references from:
- `NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_KEY`

But this would require changes in many files.

## Files Affected

The following files use these environment variables:
- `lib/services/pdf-converter.ts`
- `lib/services/page-cache.ts`
- `lib/storage.ts`
- `app/api/documents/convert/route.ts`
- `app/api/documents/[id]/pages/route.ts`
- And many more...

## Quick Fix Steps

1. Open `.env.local`
2. Rename the variables:
   ```bash
   # Change this:
   SUPABASE_URL="https://zuhrivibcgudgsejsljo.supabase.co"
   SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   
   # To this:
   NEXT_PUBLIC_SUPABASE_URL="https://zuhrivibcgudgsejsljo.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```
3. Restart your development server
4. Test the preview functionality

## Verification

After fixing, run:
```bash
npx tsx scripts/check-preview-simple.ts
```

You should see:
```
Environment Variables:
  SUPABASE_URL: SET
  SUPABASE_KEY: SET
  DATABASE_URL: SET
```

## Why This Happened

This likely occurred because:
1. Different naming conventions were used during initial setup
2. The environment variables were copied from a different source
3. The code was updated but the .env file wasn't

## Prevention

To prevent this in the future:
1. Use a `.env.example` file with the correct variable names
2. Document all required environment variables
3. Add validation at startup to check for required variables
4. Use TypeScript to enforce environment variable types

## Related Issues

This fix resolves:
- ✅ Preview not showing uploaded documents
- ✅ "Failed to Load Document" errors
- ✅ PDF conversion failures
- ✅ Storage access issues
- ✅ All Supabase-related functionality

## Next Steps

1. Apply the fix to `.env.local`
2. Restart the development server
3. Test document upload and preview
4. Verify all features are working
5. Update `.env.example` if it exists
6. Document the correct variable names in README
