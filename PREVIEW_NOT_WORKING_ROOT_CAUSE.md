# Preview Not Working - Root Cause Analysis

## Problem
Documents are uploaded but preview doesn't work - shows "Loading documents..." forever.

## Root Cause
**Documents are NOT being converted to page images after upload.**

### Evidence
- Total documents in database: **44**
- Documents with pages (converted): **1**
- Documents without pages: **43**

### Why This Happens
The upload API (`/api/documents` POST) does this:
1. ✅ Validates the file
2. ✅ Uploads to Supabase Storage
3. ✅ Creates document record in database
4. ❌ **NEVER calls the conversion API**

The conversion API exists at `/api/documents/convert` but it's never triggered automatically.

## The Fix
After creating the document record, we need to call the conversion API to generate page images.

### Option 1: Auto-convert on upload (Recommended)
Modify `/api/documents/route.ts` POST method to trigger conversion after upload:

```typescript
// After creating document...
const document = await prisma.document.create({...})

// Trigger conversion for PDF documents
if (file.type === 'application/pdf') {
  try {
    const convertResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/documents/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: document.id,
        storagePath: uploadResult.path
      })
    })
    
    if (!convertResponse.ok) {
      logger.warn('Document conversion failed', { documentId: document.id })
    }
  } catch (error) {
    logger.error('Error triggering conversion', error)
    // Don't fail the upload if conversion fails
  }
}
```

### Option 2: Manual conversion
Run a script to convert all existing documents:

```bash
npx tsx scripts/convert-all-documents.ts
```

## Immediate Action
You need to either:
1. Fix the upload API to auto-convert (recommended for future uploads)
2. Run a conversion script for existing 43 documents
3. Or both

Without conversion, preview will never work because there are no page images to display.
